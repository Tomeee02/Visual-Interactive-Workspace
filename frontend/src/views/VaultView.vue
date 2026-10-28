<template>
  <div class="vault-page" @mousemove="vault.touch" @keydown="vault.touch">
    <TopBar />
    <main v-if="initializing" class="center-state"><span class="spinner" /> Loading Vault...</main>

    <main v-else-if="recoveryKey" class="center-state">
      <section class="access-panel recovery-panel">
        <span class="access-icon">✓</span>
        <h1>Save your recovery key</h1>
        <p>This is the only way to recover your Vault if you forget the master password.</p>
        <code>{{ recoveryKey }}</code>
        <button class="secondary-button" @click="copyText(recoveryKey, 'Recovery key copied')">Copy recovery key</button>
        <label class="confirm-row"><input v-model="recoverySaved" type="checkbox"> I saved this key somewhere safe</label>
        <button class="primary-button" :disabled="!recoverySaved" @click="recoveryKey = ''">Open Vault</button>
      </section>
    </main>

    <main v-else-if="!vault.configured" class="center-state">
      <form class="access-panel" @submit.prevent="setupVault">
        <span class="access-icon">◇</span>
        <h1>Create your Vault</h1>
        <p>Your credentials are encrypted in this browser before they are saved.</p>
        <label>Master password<input v-model="masterPassword" type="password" minlength="12" autocomplete="new-password" required></label>
        <label>Confirm master password<input v-model="confirmation" type="password" minlength="12" autocomplete="new-password" required></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary-button" :disabled="vault.loading">{{ vault.loading ? 'Creating...' : 'Create Vault' }}</button>
      </form>
    </main>

    <main v-else-if="vault.locked" class="center-state">
      <form class="access-panel" @submit.prevent="unlockVault">
        <span class="access-icon">◆</span>
        <h1>Vault locked</h1>
        <p>{{ recoveryMode ? 'Enter the recovery key you saved during setup.' : 'Enter your master password to continue.' }}</p>
        <label>{{ recoveryMode ? 'Recovery key' : 'Master password' }}<input v-model="unlockSecret" :type="recoveryMode ? 'text' : 'password'" required autofocus></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary-button" :disabled="vault.loading">{{ vault.loading ? 'Unlocking...' : 'Unlock Vault' }}</button>
        <button class="text-button" type="button" @click="recoveryMode = !recoveryMode; error = ''">{{ recoveryMode ? 'Use master password' : 'Use recovery key' }}</button>
      </form>
    </main>

    <main v-else class="vault-background">
      <aside class="vault-edge vault-edge-left" aria-hidden="true" />
      <section class="vault-main">
        <header class="vault-toolbar">
          <label class="search"><span>⌕</span><input v-model="query" placeholder="Search Vault" aria-label="Search Vault"></label>
          <div class="filters">
            <button :class="{ active: filter === 'all' }" @click="filter = 'all'">All items <span>{{ vault.entries.length }}</span></button>
            <button :class="{ active: filter === 'favorites' }" @click="filter = 'favorites'">Favorites <span>{{ favoriteCount }}</span></button>
          </div>
          <button class="new-button" @click="newEntry">+ New login</button>
          <button class="generator-toggle" type="button" @click="generatorOpen = true">Generator</button>
          <button class="icon-action" title="Lock Vault" aria-label="Lock Vault" @click="vault.lock">⌁</button>
        </header>

        <div class="vault-content">
          <section class="entry-list" aria-label="Vault entries">
            <header><strong>{{ filter === 'favorites' ? 'Favorites' : 'All items' }}</strong><span>{{ filteredEntries.length }}</span></header>
            <button v-for="entry in filteredEntries" :key="entry.id" class="entry-row" :class="{ active: selectedId === entry.id }" @click="selectEntry(entry)">
              <span class="site-mark">{{ entry.name?.charAt(0)?.toUpperCase() || '?' }}</span>
              <span class="entry-copy"><strong>{{ entry.name || 'Untitled' }}</strong><span class="entry-meta"><small>{{ entry.username || entry.url || 'No username' }}</small><span class="tag-badge" :class="`tag-${entry.tag || 'personal'}`">{{ tagLabel(entry.tag) }}</span></span></span>
              <span v-if="entry.favorite" class="favorite">★</span>
            </button>
            <div v-if="!filteredEntries.length" class="empty-list">No matching logins</div>
          </section>

          <section class="entry-detail">
            <form v-if="draft" @submit.prevent="saveEntry">
          <header class="detail-header">
            <div class="detail-title"><span class="site-mark large">{{ draft.name?.charAt(0)?.toUpperCase() || '?' }}</span><div><small>LOGIN</small><h2>{{ draft.name || 'New login' }}</h2></div></div>
            <div class="detail-actions"><button type="button" title="Favorite" :aria-pressed="draft.favorite" :disabled="favoriteSaving" @click="toggleFavorite">{{ draft.favorite ? '★' : '☆' }}</button><button v-if="selectedId" class="delete" type="button" title="Delete" @click="removeEntry">×</button></div>
          </header>
          <div class="fields">
            <label>Name<input v-model="draft.name" required></label>
            <div class="tag-field">
              <span>Tag</span>
              <div class="tag-options" role="group" aria-label="Password tag">
                <button type="button" :class="{ active: draft.tag === 'personal' }" :aria-pressed="draft.tag === 'personal'" :disabled="tagSaving" @click="setTag('personal')">Personal</button>
                <button type="button" :class="{ active: draft.tag === 'work' }" :aria-pressed="draft.tag === 'work'" :disabled="tagSaving" @click="setTag('work')">Work</button>
              </div>
            </div>
            <label>Username<div class="input-action"><input v-model="draft.username" autocomplete="off"><button type="button" title="Copy username" @click="copyText(draft.username, 'Username copied')">▣</button></div></label>
            <label>Password<div class="input-action"><input v-model="draft.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required><button type="button" title="Show password" @click="showPassword = !showPassword">{{ showPassword ? '◉' : '◎' }}</button><button type="button" title="Copy password" @click="copyText(draft.password, 'Password copied')">▣</button></div></label>
            <label>Website<input v-model="draft.url" type="url" placeholder="https://"></label>
            <label>Notes<textarea v-model="draft.notes" rows="5" /></label>
          </div>
          <footer><span class="save-status">{{ notice }}</span><button v-if="selectedId" type="button" class="secondary-button" @click="resetDraft">Discard</button><button class="primary-button" :disabled="saving">{{ saving ? 'Saving...' : 'Save login' }}</button></footer>
            </form>
            <div v-else class="detail-empty"><span>◇</span><h2>Select a login</h2><p>Choose an item from the list or create a new one.</p></div>
          </section>
        </div>
      </section>
      <aside class="vault-edge vault-edge-right" :class="{ open: generatorOpen }">
        <section class="password-generator" aria-label="Password generator">
          <header>
            <h2>Password generator</h2>
            <button class="generator-close" type="button" aria-label="Close password generator" @click="generatorOpen = false">×</button>
          </header>
          <div class="generated-password">
            <input :value="generatedPassword" readonly aria-label="Generated password">
            <button type="button" title="Regenerate password" aria-label="Regenerate password" @click="generatePassword">↻</button>
          </div>
          <label class="length-control">
            <span><strong>Length</strong><output>{{ generatorLength }}</output></span>
            <input v-model.number="generatorLength" type="range" min="8" max="64" aria-label="Password length">
          </label>
          <div class="generator-options">
            <label v-for="option in generatorOptionList" :key="option.key" class="generator-option">
              <input v-model="generatorOptions[option.key]" type="checkbox" :disabled="isOnlyEnabledOption(option.key)">
              <span>{{ option.label }}</span>
            </label>
          </div>
          <button class="copy-password-button" type="button" @click="copyGeneratedPassword">{{ generatorNotice || 'Copy password' }}</button>
        </section>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import TopBar from '../components/TopBar.vue'
import { useVaultStore } from '../store/vault'

const vault = useVaultStore()
const initializing = ref(true)
const masterPassword = ref('')
const confirmation = ref('')
const unlockSecret = ref('')
const recoveryKey = ref('')
const recoverySaved = ref(false)
const recoveryMode = ref(false)
const error = ref('')
const query = ref('')
const filter = ref('all')
const selectedId = ref(null)
const draft = ref(null)
const showPassword = ref(false)
const generatorLength = ref(16)
const generatorOptions = reactive({ uppercase: true, lowercase: true, numbers: true, symbols: true })
const generatedPassword = ref('')
const generatorNotice = ref('')
const generatorOpen = ref(false)
const saving = ref(false)
const favoriteSaving = ref(false)
const tagSaving = ref(false)
const notice = ref('')

const generatorOptionList = [
  { key: 'uppercase', label: 'Uppercase' },
  { key: 'lowercase', label: 'Lowercase' },
  { key: 'numbers', label: 'Numbers' },
  { key: 'symbols', label: 'Symbols' },
]
const generatorCharacterSets = {
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lowercase: 'abcdefghijkmnopqrstuvwxyz',
  numbers: '23456789',
  symbols: '!@#$%^&*_-+',
}

const favoriteCount = computed(() => vault.entries.filter(entry => entry.favorite).length)
const filteredEntries = computed(() => {
  const term = query.value.trim().toLowerCase()
  return vault.entries
    .filter(entry => (filter.value !== 'favorites' || entry.favorite) && (!term || [entry.name, entry.username, entry.url, entry.tag || 'personal'].some(value => value?.toLowerCase().includes(term))))
    .sort((first, second) => {
      if (!first.name) return 1
      if (!second.name) return -1
      return first.name.localeCompare(second.name, 'hu', { sensitivity: 'base', numeric: true })
    })
})

function blankEntry() {
  return { name: '', username: '', password: '', url: '', notes: '', favorite: false, tag: 'personal' }
}

function tagLabel(tag) {
  return tag === 'work' ? 'Work' : 'Personal'
}

async function setupVault() {
  error.value = ''
  if (masterPassword.value !== confirmation.value) return (error.value = 'The passwords do not match.')
  if (masterPassword.value.length < 12) return (error.value = 'Use at least 12 characters.')
  try {
    recoveryKey.value = await vault.setup(masterPassword.value)
    masterPassword.value = ''
    confirmation.value = ''
  } catch {
    error.value = 'The Vault could not be created.'
  }
}

async function unlockVault() {
  error.value = ''
  try {
    await vault.unlock(unlockSecret.value, recoveryMode.value)
    unlockSecret.value = ''
  } catch (unlockError) {
    error.value = unlockError.message
  }
}

function selectEntry(entry) {
  selectedId.value = entry.id
  draft.value = { name: entry.name, username: entry.username, password: entry.password, url: entry.url, notes: entry.notes, favorite: entry.favorite, tag: entry.tag || 'personal' }
  showPassword.value = false
}

function clearSelection() {
  selectedId.value = null
  draft.value = null
  showPassword.value = false
}

function newEntry() {
  selectedId.value = null
  draft.value = blankEntry()
}

function resetDraft() {
  const entry = vault.entries.find(item => item.id === selectedId.value)
  if (entry) selectEntry(entry)
}

async function toggleFavorite() {
  const previousValue = draft.value.favorite
  draft.value.favorite = !previousValue
  if (!selectedId.value) return

  const storedEntry = vault.entries.find(entry => entry.id === selectedId.value)
  if (!storedEntry) return
  favoriteSaving.value = true
  try {
    await vault.updateEntry(selectedId.value, {
      name: storedEntry.name,
      username: storedEntry.username,
      password: storedEntry.password,
      url: storedEntry.url,
      notes: storedEntry.notes,
      favorite: draft.value.favorite,
      tag: storedEntry.tag || 'personal',
    })
    notice.value = draft.value.favorite ? 'Added to favorites' : 'Removed from favorites'
  } catch {
    draft.value.favorite = previousValue
    notice.value = 'Favorite could not be saved'
  } finally {
    favoriteSaving.value = false
  }
}

async function setTag(tag) {
  if (draft.value.tag === tag) return
  const previousTag = draft.value.tag
  draft.value.tag = tag
  if (!selectedId.value) return

  const storedEntry = vault.entries.find(entry => entry.id === selectedId.value)
  if (!storedEntry) return
  tagSaving.value = true
  try {
    await vault.updateEntry(selectedId.value, {
      name: storedEntry.name,
      username: storedEntry.username,
      password: storedEntry.password,
      url: storedEntry.url,
      notes: storedEntry.notes,
      favorite: storedEntry.favorite,
      tag,
    })
    notice.value = `Tag changed to ${tagLabel(tag)}`
  } catch {
    draft.value.tag = previousTag
    notice.value = 'Tag could not be saved'
  } finally {
    tagSaving.value = false
  }
}

async function saveEntry() {
  saving.value = true
  try {
    if (selectedId.value) {
      await vault.updateEntry(selectedId.value, draft.value)
    } else {
      await vault.createEntry(draft.value)
      selectEntry(vault.entries[0])
    }
    notice.value = 'Saved'
  } finally {
    saving.value = false
  }
}

async function removeEntry() {
  if (!confirm(`Delete ${draft.value.name || 'this login'}?`)) return
  await vault.deleteEntry(selectedId.value)
  selectedId.value = null
  draft.value = null
}

function secureRandomIndex(maximum) {
  const limit = Math.floor(0x100000000 / maximum) * maximum
  const randomValue = new Uint32Array(1)
  do crypto.getRandomValues(randomValue)
  while (randomValue[0] >= limit)
  return randomValue[0] % maximum
}

function randomCharacter(characters) {
  return characters[secureRandomIndex(characters.length)]
}

function generatePassword() {
  const enabledSets = generatorOptionList
    .filter(option => generatorOptions[option.key])
    .map(option => generatorCharacterSets[option.key])
  if (!enabledSets.length) return

  const allCharacters = enabledSets.join('')
  const password = enabledSets.map(randomCharacter)
  while (password.length < generatorLength.value) password.push(randomCharacter(allCharacters))
  for (let index = password.length - 1; index > 0; index -= 1) {
    const target = secureRandomIndex(index + 1)
    ;[password[index], password[target]] = [password[target], password[index]]
  }
  generatedPassword.value = password.join('')
  generatorNotice.value = ''
}

function isOnlyEnabledOption(key) {
  return generatorOptions[key] && generatorOptionList.filter(option => generatorOptions[option.key]).length === 1
}

async function copyGeneratedPassword() {
  if (!generatedPassword.value) return
  const copiedPassword = generatedPassword.value
  await navigator.clipboard.writeText(copiedPassword)
  generatorNotice.value = 'Password copied'
  setTimeout(() => {
    generatorNotice.value = ''
  }, 1800)
  setTimeout(async () => {
    try {
      if (await navigator.clipboard.readText() === copiedPassword) await navigator.clipboard.writeText('')
    } catch {}
  }, 30000)
}

async function copyText(value, message) {
  if (!value) return
  await navigator.clipboard.writeText(value)
  notice.value = message
  setTimeout(async () => {
    try {
      if (await navigator.clipboard.readText() === value) await navigator.clipboard.writeText('')
    } catch {}
  }, 30000)
}

onMounted(async () => {
  try {
    await vault.loadConfig()
  } catch {
    error.value = 'The Vault could not be loaded.'
  } finally {
    initializing.value = false
  }
})
watch([
  generatorLength,
  () => generatorOptions.uppercase,
  () => generatorOptions.lowercase,
  () => generatorOptions.numbers,
  () => generatorOptions.symbols,
], () => {
  if (!vault.locked) generatePassword()
})
watch(() => vault.locked, (locked) => {
  if (locked) {
    clearSelection()
    generatedPassword.value = ''
    generatorOpen.value = false
  } else {
    generatePassword()
  }
})
</script>

<style scoped>
.vault-page { height: 100%; min-height: 0; background: #EEF2F5; color: #17212B; }
.center-state { display: grid; height: calc(100% - 56px); place-items: center; padding: 24px; }
.access-panel { width: min(420px, 100%); padding: 34px; border: 1px solid #D6DEE4; border-radius: 8px; background: #FFF; box-shadow: 0 16px 40px rgba(24, 39, 52, .08); }
.access-icon { display: grid; width: 48px; height: 48px; place-items: center; margin-bottom: 24px; border-radius: 50%; background: #DCECF7; color: #0067A8; font-size: 24px; }
.access-panel h1 { font-size: 25px; }
.access-panel > p { margin: 9px 0 24px; color: #64748B; font-size: 13px; line-height: 1.55; }
.access-panel label, .fields label { display: grid; gap: 7px; margin-top: 15px; color: #475569; font-size: 12px; font-weight: 600; }
input, textarea { width: 100%; border: 1px solid #C8D2DA; border-radius: 5px; padding: 10px 11px; background: #FFF; color: #17212B; font: inherit; }
input:focus, textarea:focus { outline: 2px solid #A7D5EF; border-color: #1683BF; }
.primary-button, .secondary-button, .text-button, .new-button { border-radius: 5px; padding: 10px 14px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.primary-button { border: 0; background: #0078B8; color: #FFF; }
.access-panel > .primary-button { width: 100%; margin-top: 22px; }
.primary-button:disabled { opacity: .55; cursor: wait; }
.secondary-button { border: 1px solid #C8D2DA; background: #FFF; color: #334155; }
.text-button { width: 100%; border: 0; background: transparent; color: #0874AD; }
.error { margin: 12px 0 0 !important; color: #B42318 !important; }
.recovery-panel code { display: block; overflow-wrap: anywhere; padding: 14px; border: 1px solid #BDD7E6; border-radius: 5px; background: #F0F8FC; color: #164E63; font-size: 12px; line-height: 1.5; }
.recovery-panel .secondary-button { width: 100%; margin-top: 10px; }
.confirm-row { display: flex !important; grid-template-columns: auto 1fr; align-items: center; }
.confirm-row input { width: auto; }
.vault-background { position: relative; display: grid; height: calc(100% - 56px); min-height: 0; grid-template-columns: 270px minmax(0, 1fr) 330px; gap: 1px; overflow: hidden; background: #D7DDE3; }
.vault-edge { min-width: 0; background: #EEF2F4; }
.vault-edge-right { padding: 22px 18px; overflow-y: auto; background: #F1F4F6; }
.vault-main { display: flex; min-width: 0; min-height: 0; flex-direction: column; padding: 28px 32px; overflow: hidden; background: #FFF; }
.vault-toolbar { display: flex; min-width: 0; align-items: center; gap: 12px; margin-bottom: 16px; padding: 14px 16px; border: 1px solid #D9E0E5; border-radius: 8px; background: #F8FAFB; }
.detail-title small { color: #78909F; font-size: 9px; font-weight: 800; }
.icon-action, .detail-actions button { border: 0; background: transparent; color: #64748B; font-size: 20px; cursor: pointer; }
.search { position: relative; display: flex; min-width: 150px; flex: 1 1 240px; align-items: center; }
.search span { position: absolute; left: 10px; color: #78909F; font-size: 12px; }
.search input { padding-left: 30px; background: #F8FAFB; font-size: 12px; }
.search input::placeholder { font-size: 12px; }
.new-button { flex: 0 0 auto; border: 0; background: #0078B8; color: #FFF; white-space: nowrap; }
.generator-toggle { display: none; border: 1px solid #B9CFDC; border-radius: 5px; padding: 9px 11px; background: #F0F8FC; color: #076A9F; font: inherit; font-size: 12px; cursor: pointer; }
.filters { display: flex; flex: 0 0 auto; gap: 3px; }
.filters button { display: flex; gap: 8px; justify-content: space-between; border: 0; border-radius: 5px; padding: 9px 10px; background: transparent; color: #52616D; font: inherit; font-size: 12px; text-align: left; white-space: nowrap; cursor: pointer; }
.filters button span { font-size: 12px; }
.filters button.active { background: #D5E8F3; color: #075F91; font-weight: 700; }
.vault-content { display: grid; min-height: 0; flex: 1; grid-template-columns: minmax(240px, 34%) minmax(0, 1fr); overflow: hidden; border: 1px solid #D9E0E5; border-radius: 8px; background: #FFF; }
.entry-list { min-width: 0; overflow-y: auto; border-right: 1px solid #D4DDE3; background: #F7F9FA; }
.entry-list > header { display: flex; justify-content: space-between; padding: 20px; border-bottom: 1px solid #E0E6EA; font-size: 12px; }
.entry-list > header span { color: #94A3B8; }
.entry-row { display: flex; width: 100%; align-items: center; gap: 11px; padding: 13px 16px; border: 0; border-bottom: 1px solid #E7ECEF; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.entry-row:hover, .entry-row.active { background: #E6F1F7; }
.site-mark { display: grid; flex: 0 0 auto; width: 34px; height: 34px; place-items: center; border-radius: 6px; background: #CFE6F2; color: #075F91; font-weight: 800; }
.site-mark.large { width: 46px; height: 46px; font-size: 18px; }
.entry-copy { min-width: 0; flex: 1; }
.entry-copy strong, .entry-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entry-copy strong { font-size: 13px; }
.entry-meta { display: flex; min-width: 0; align-items: center; gap: 7px; margin-top: 4px; }
.entry-copy small { min-width: 0; color: #7B8B96; font-size: 11px; }
.tag-badge { flex: 0 0 auto; padding: 2px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; }
.tag-personal { background: #E8F3FA; color: #176A9C; }
.tag-work { background: #E9F4EC; color: #39734D; }
.favorite { color: #C88A09; }
.empty-list { padding: 32px 20px; color: #94A3B8; text-align: center; font-size: 12px; }
.entry-detail { min-width: 0; overflow-y: auto; background: #FFF; }
.entry-detail form { min-height: 100%; }
.detail-header { display: flex; align-items: center; justify-content: space-between; padding: 28px 34px; border-bottom: 1px solid #E7ECEF; }
.detail-title { display: flex; align-items: center; gap: 14px; }
.detail-title h2 { margin-top: 4px; font-size: 20px; }
.detail-actions { display: flex; gap: 10px; }
.detail-actions .delete { color: #B42318; }
.fields { width: min(650px, calc(100% - 68px)); margin: 10px auto 30px; }
.tag-field { display: grid; gap: 7px; margin-top: 15px; color: #475569; font-size: 12px; font-weight: 600; }
.tag-options { display: inline-flex; width: fit-content; padding: 2px; border: 1px solid #C8D2DA; border-radius: 6px; background: #F5F7F8; }
.tag-options button { min-width: 84px; border: 0; border-radius: 4px; padding: 7px 12px; background: transparent; color: #64748B; font: inherit; font-size: 11px; cursor: pointer; }
.tag-options button.active { background: #FFF; color: #176A9C; font-weight: 700; box-shadow: 0 1px 3px rgba(24, 39, 52, .12); }
.input-action { display: flex; }
.input-action input { border-radius: 5px 0 0 5px; }
.input-action button { width: 40px; border: 1px solid #C8D2DA; border-left: 0; background: #F5F7F8; color: #52616D; cursor: pointer; }
.password-generator { padding: 16px; border: 1px solid #D9E0E5; border-radius: 8px; background: #FFF; }
.password-generator header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #E7ECEF; }
.password-generator h2 { color: #334155; font-size: 15px; }
.generator-close { display: none; border: 0; background: transparent; color: #64748B; font-size: 22px; cursor: pointer; }
.generated-password { display: flex; margin-top: 16px; }
.generated-password input { min-width: 0; padding: 10px; border-radius: 5px 0 0 5px; background: #F8FAFB; font-family: Consolas, monospace; font-size: 12px; }
.generated-password button { display: grid; flex: 0 0 40px; place-items: center; border: 1px solid #C8D2DA; border-left: 0; border-radius: 0 5px 5px 0; background: #F0F8FC; color: #076A9F; font-size: 17px; cursor: pointer; }
.length-control { display: grid; gap: 8px; margin-top: 18px; color: #475569; font-size: 11px; }
.length-control > span { display: flex; align-items: center; justify-content: space-between; }
.length-control output { display: grid; width: 28px; height: 24px; place-items: center; border-radius: 4px; background: #E8F3FA; color: #176A9C; font-weight: 700; }
.length-control input { height: 18px; padding: 0; accent-color: #0078B8; cursor: pointer; }
.generator-options { display: grid; gap: 2px; margin-top: 15px; }
.generator-option { display: flex; min-height: 34px; align-items: center; gap: 9px; color: #52616D; font-size: 11px; cursor: pointer; }
.generator-option input { flex: 0 0 auto; width: 15px; height: 15px; padding: 0; accent-color: #0078B8; }
.generator-option input:disabled { cursor: not-allowed; }
.copy-password-button { width: 100%; margin-top: 10px; border-radius: 5px; padding: 9px 10px; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
.copy-password-button { border: 0; background: #0078B8; color: #FFF; }
.entry-detail footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 18px 34px; border-top: 1px solid #E7ECEF; }
.save-status { margin-right: auto; color: #47805A; font-size: 11px; }
.detail-empty { display: grid; height: 100%; place-content: center; color: #94A3B8; text-align: center; }
.detail-empty span { font-size: 32px; }.detail-empty h2 { margin-top: 10px; color: #52616D; font-size: 17px; }.detail-empty p { margin-top: 5px; font-size: 12px; }
@media (max-width: 1100px) { .vault-background { grid-template-columns: 92px minmax(0, 1fr) 260px; }.vault-main { padding: 20px 14px; }.vault-toolbar { flex-wrap: wrap; }.search { order: 3; flex-basis: 100%; }.vault-content { grid-template-columns: minmax(220px, 36%) minmax(0, 1fr); }.vault-edge-right { padding: 16px 10px; } }
@media (max-width: 700px) { .vault-background { grid-template-columns: 32px minmax(0, 1fr) 32px; }.vault-main { padding: 12px 8px; }.filters { order: 4; width: 100%; }.filters button { flex: 1; justify-content: center; }.generator-toggle { display: block; }.vault-content { grid-template-columns: 1fr; }.entry-list { border-right: 0; }.entry-detail { position: absolute; inset: 56px 32px 0; z-index: 3; }.entry-detail:has(.detail-empty) { display: none; }.fields { width: calc(100% - 32px); }.detail-header, .entry-detail footer { padding: 18px 16px; }.vault-edge-right { position: absolute; inset: 0 0 0 auto; z-index: 5; width: min(320px, calc(100% - 32px)); padding: 16px; transform: translateX(100%); transition: transform .2s ease; box-shadow: -10px 0 24px rgba(24, 39, 52, .16); }.vault-edge-right.open { transform: translateX(0); }.generator-close { display: block; } }
:global([data-theme='dark'] .vault-page) { background: #111820; color: #E5EDF2; }
:global([data-theme='dark'] .vault-background) { background: #34424D; }
:global([data-theme='dark'] .vault-edge) { background: #1B232B; }
:global([data-theme='dark'] .vault-edge-right) { background: #202A32; }
:global([data-theme='dark'] .password-generator) { border-color: #34424D; background: #202B34; }
:global([data-theme='dark'] .password-generator header) { border-color: #34424D; }
:global([data-theme='dark'] .password-generator h2), :global([data-theme='dark'] .length-control), :global([data-theme='dark'] .generator-option) { color: #E5EDF2; }
:global([data-theme='dark'] .vault-main) { background: #202B34; }
:global([data-theme='dark'] .vault-toolbar), :global([data-theme='dark'] .vault-content) { border-color: #34424D; background: #1B232B; }
:global([data-theme='dark'] .entry-list), :global([data-theme='dark'] .entry-detail), :global([data-theme='dark'] .access-panel) { border-color: #34424D; background: #202B34; }
:global([data-theme='dark'] .entry-row), :global([data-theme='dark'] .detail-header), :global([data-theme='dark'] .entry-detail footer) { border-color: #34424D; }
:global([data-theme='dark'] input), :global([data-theme='dark'] textarea) { border-color: #52616D; background: #1B232B; color: #E5EDF2; }
:global([data-theme='dark'] .search input) { border-color: #46545F; background: #0B0F13; color: #F1F5F9; }
:global([data-theme='dark'] .search input::placeholder) { color: #94A3B8; }
:global([data-theme='dark'] .generated-password input) { border-color: #46545F; background: #0B0F13; color: #F1F5F9; }
:global([data-theme='dark'] .tag-options) { border-color: #52616D; background: #1B232B; }
:global([data-theme='dark'] .tag-options button.active) { background: #293E4D; color: #9FD0F2; }
:global([data-theme='dark'] .entry-row:hover), :global([data-theme='dark'] .entry-row.active), :global([data-theme='dark'] .filters button.active) { background: #293E4D; color: #9FD0F2; }
</style>