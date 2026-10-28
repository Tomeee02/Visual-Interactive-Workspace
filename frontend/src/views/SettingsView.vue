<template>
  <div class="settings-page" @mousemove="vault.touch" @keydown="vault.touch">
    <TopBar />
    <div class="settings-background">
      <aside class="settings-edge settings-edge-left" aria-hidden="true" />
      <main class="settings-content">
      <header class="settings-header">
        <div>
          <p class="settings-eyebrow">Workspace</p>
          <h1>Settings</h1>
          <p class="settings-subtitle">Manage your account and workspace preferences.</p>
        </div>
        <span class="settings-status">All changes saved</span>
      </header>

      <div class="settings-sections">
        <section class="settings-section profile-section">
          <div class="section-heading">
            <h2>Profile</h2>
            <p>Your account information.</p>
          </div>
          <div class="profile-summary">
            <span class="large-avatar">{{ profileInitial }}</span>
            <div>
              <strong>{{ auth.user?.email || 'Workspace user' }}</strong>
              <span>Account email</span>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <div class="section-heading">
            <h2>Preferences</h2>
            <p>Choose how Visual Workspace behaves for you.</p>
          </div>
          <label class="setting-row">
            <span>
              <strong>Automatic saving</strong>
              <small>Keep your latest changes saved as you work.</small>
            </span>
            <input v-model="autoSave" class="toggle-input" type="checkbox">
          </label>
          <label class="setting-row">
            <span>
              <strong>Task reminders</strong>
              <small>Receive reminders for upcoming tasks.</small>
            </span>
            <input v-model="taskReminders" class="toggle-input" type="checkbox">
          </label>
          <label class="select-row">
            <span>
              <strong>Appearance</strong>
              <small>Select the interface theme.</small>
            </span>
            <select v-model="appearance" aria-label="Appearance">
              <option>Light</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          </label>
          <label class="select-row">
            <span>
              <strong>Language</strong>
              <small>Choose the language used in the workspace.</small>
            </span>
            <select v-model="language" aria-label="Language">
              <option>English</option>
              <option>Magyar</option>
            </select>
          </label>
        </section>

        <section class="settings-section">
          <div class="section-heading">
            <h2>Password Manager</h2>
          </div>
          <label class="select-row">
            <span><strong>Automatic lock</strong><small>Lock the Vault after inactivity.</small></span>
            <select v-model.number="vaultAutoLock" aria-label="Vault automatic lock" @change="saveAutoLock">
              <option :value="1">1 minute</option>
              <option :value="5">5 minutes</option>
              <option :value="15">15 minutes</option>
              <option :value="30">30 minutes</option>
            </select>
          </label>
          <div class="setting-row vault-setting-row">
            <span><strong>Browser close and reload</strong><small>The Vault always locks when its in-memory key is cleared.</small></span>
            <span class="fixed-setting">Always on</span>
          </div>
          <div class="setting-row vault-setting-row">
            <span><strong>Master password</strong><small>Change the password that unlocks this Vault.</small></span>
            <button v-if="!vault.configured || vault.locked" class="setting-button" type="button" @click="router.push('/vault')">{{ vault.configured ? 'Unlock to change' : 'Set up Vault' }}</button>
            <button v-else class="setting-button" type="button" @click="changingMaster = !changingMaster">Change password</button>
          </div>
          <form v-if="changingMaster && !vault.locked" class="master-form" @submit.prevent="changeMaster">
            <input v-model="newMaster" type="password" minlength="12" autocomplete="new-password" placeholder="New master password" required>
            <input v-model="newMasterConfirmation" type="password" minlength="12" autocomplete="new-password" placeholder="Confirm master password" required>
            <button class="setting-button primary" :disabled="vault.loading">Update password</button>
          </form>
          <div class="setting-row vault-setting-row">
            <span><strong>Recovery key</strong><small>Generate a new key and invalidate the previous recovery key.</small></span>
            <button v-if="!vault.configured || vault.locked" class="setting-button" type="button" @click="router.push('/vault')">{{ vault.configured ? 'Unlock to manage' : 'Set up Vault' }}</button>
            <button v-else class="setting-button" type="button" :disabled="vault.loading" @click="regenerateRecovery">Generate new key</button>
          </div>
          <div v-if="newRecoveryKey" class="recovery-result">
            <strong>Save the new recovery key now</strong>
            <small>The previous recovery key no longer works. This key is shown only in this session.</small>
            <code>{{ newRecoveryKey }}</code>
            <div class="recovery-actions">
              <button class="setting-button" type="button" @click="copyRecoveryKey">Copy</button>
              <button class="setting-button" type="button" @click="downloadRecoveryKey">Download</button>
              <button class="setting-button primary" type="button" @click="newRecoveryKey = ''">I saved it</button>
            </div>
          </div>
          <div class="setting-row vault-setting-row">
            <span><strong>Import Vault data</strong><small>CSV rows are encrypted in this browser before upload.</small></span>
            <button class="setting-button" type="button" @click="startImport">{{ vault.locked ? 'Unlock to import' : 'Import CSV' }}</button>
            <input ref="fileInput" class="hidden-input" type="file" accept=".csv,text/csv" @change="importCsv">
          </div>
          <div class="setting-row vault-setting-row">
            <span><strong>Export Vault data</strong><small>Download a plaintext CSV after a security confirmation.</small></span>
            <button class="setting-button" type="button" @click="exportCsv">{{ vault.locked ? 'Unlock to export' : 'Export CSV' }}</button>
          </div>
          <p v-if="vaultMessage" class="vault-message">{{ vaultMessage }}</p>
        </section>

        <section class="settings-section danger-section">
          <div class="section-heading">
            <h2>Account</h2>
            <p>Manage your active session.</p>
          </div>
          <button class="logout-button" type="button" @click="logout">Log out</button>
        </section>
      </div>
      </main>
      <aside class="settings-edge settings-edge-right" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Papa from 'papaparse'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import api from '../services/api'
import { useAuthStore } from '../store/auth'
import { useThemeStore } from '../store/theme'
import { useVaultStore } from '../store/vault'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const vault = useVaultStore()
const autoSave = ref(true)
const taskReminders = ref(true)
const language = ref('English')
const vaultAutoLock = ref(5)
const changingMaster = ref(false)
const newMaster = ref('')
const newMasterConfirmation = ref('')
const newRecoveryKey = ref('')
const vaultMessage = ref('')
const fileInput = ref(null)
const profileInitial = computed(() => (auth.user?.email?.charAt(0) || '?').toUpperCase())

const appearance = computed({
  get: () => theme.preference.charAt(0).toUpperCase() + theme.preference.slice(1),
  set: async (value) => {
    try {
      await theme.setPreference(value.toLowerCase())
    } catch (error) {
      console.error('Could not save theme preference:', error)
    }
  }
})

async function logout() {
  await auth.logout()
  router.push('/login')
}

async function saveAutoLock() {
  const preferences = await api.updatePreferences({ vaultAutoLockMinutes: vaultAutoLock.value })
  vault.autoLockMinutes = preferences.vaultAutoLockMinutes
  vault.touch()
  vaultMessage.value = 'Automatic lock updated.'
}

async function changeMaster() {
  if (newMaster.value !== newMasterConfirmation.value) {
    vaultMessage.value = 'The master passwords do not match.'
    return
  }
  try {
    newRecoveryKey.value = await vault.changeMasterPassword(newMaster.value)
    newMaster.value = ''
    newMasterConfirmation.value = ''
    changingMaster.value = false
    vaultMessage.value = 'Master password changed. The previous recovery key is no longer valid.'
  } catch (error) {
    vaultMessage.value = error.message
  }
}

async function regenerateRecovery() {
  if (!confirm('Generate a new recovery key? The previous key will stop working immediately.')) return
  try {
    newRecoveryKey.value = await vault.regenerateRecoveryKey()
    vaultMessage.value = 'Recovery key regenerated. Save the new key before leaving this page.'
  } catch (error) {
    vaultMessage.value = error.message
  }
}

async function copyRecoveryKey() {
  await navigator.clipboard.writeText(newRecoveryKey.value)
  vaultMessage.value = 'Recovery key copied.'
}

function downloadRecoveryKey() {
  const objectUrl = URL.createObjectURL(new Blob([`${newRecoveryKey.value}\n`], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = 'visual-workspace-recovery-key.txt'
  link.click()
  URL.revokeObjectURL(objectUrl)
  vaultMessage.value = 'Recovery key downloaded.'
}

function startImport() {
  if (vault.locked) return router.push('/vault')
  fileInput.value?.click()
}

async function importCsv(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const parsed = Papa.parse(await file.text(), { header: true, skipEmptyLines: true })
    if (parsed.errors.length) throw new Error('The CSV contains invalid rows.')
    const rows = parsed.data.map(row => ({
      name: row.name || row.title || '',
      username: row.username || '',
      password: row.password || '',
      url: row.url || row.website || '',
      notes: row.notes || row.note || '',
      favorite: String(row.favorite).toLowerCase() === 'true',
      tag: String(row.tag).toLowerCase() === 'work' ? 'work' : 'personal',
    })).filter(row => row.name && (row.password || row.username || row.url))
    if (!rows.length) throw new Error('No valid login rows were found.')
    await vault.importEntries(rows)
    vaultMessage.value = `${rows.length} logins imported.`
  } catch (error) {
    vaultMessage.value = error.message
  } finally {
    event.target.value = ''
  }
}

function exportCsv() {
  if (vault.locked) return router.push('/vault')
  if (!confirm('This export is plaintext. Anyone with the file can read every password. Continue?')) return
  const csv = Papa.unparse(vault.entries.map(({ name, username, password, url, notes, favorite, tag }) => ({ name, username, password, url, notes, favorite, tag: tag || 'personal' })))
  const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `visual-workspace-vault-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(objectUrl)
  vaultMessage.value = 'Plaintext export downloaded.'
}

onMounted(async () => {
  try {
    const preferences = await api.getPreferences()
    vaultAutoLock.value = preferences.vaultAutoLockMinutes || 5
    vault.autoLockMinutes = vaultAutoLock.value
    if (!vault.config) await vault.loadConfig()
  } catch (error) {
    console.error('Could not load Vault settings:', error)
  }
})
onBeforeUnmount(() => {
  newRecoveryKey.value = ''
  newMaster.value = ''
  newMasterConfirmation.value = ''
})
</script>

<style scoped>
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F4F6F8;
  color: #1F2937;
}

.settings-background {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr) 330px;
  gap: 1px;
  overflow: hidden;
  background: #D7DDE3;
}

.settings-edge {
  min-width: 0;
  background: #EEF2F4;
}

.settings-edge-right {
  background: #F1F4F6;
}

.settings-content {
  min-width: 0;
  overflow-y: auto;
  padding: 48px 32px 64px;
  background: #FFFFFF;
}

.settings-header {
  width: min(900px, 100%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto 28px;
}

.settings-eyebrow {
  margin-bottom: 8px;
  color: #0078D4;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.settings-header h1 {
  font-size: 32px;
  line-height: 1.1;
}

.settings-subtitle {
  margin-top: 8px;
  color: #64748B;
  font-size: 14px;
}

.settings-status {
  padding: 7px 10px;
  border: 1px solid #B8D9EE;
  border-radius: 5px;
  background: #EFF8FD;
  color: #3776AF;
  font-size: 11px;
  white-space: nowrap;
}

.settings-sections {
  width: min(900px, 100%);
  display: grid;
  gap: 16px;
  margin: 0 auto;
}

.settings-section {
  padding: 24px;
  border: 1px solid #D9E0E5;
  border-radius: 8px;
  background: #FFFFFF;
}

.section-heading {
  margin-bottom: 20px;
}

.section-heading h2 {
  font-size: 17px;
}

.section-heading p {
  margin-top: 5px;
  color: #94A3B8;
  font-size: 12px;
}

.profile-summary {
  display: flex;
  align-items: center;
  gap: 14px;
}

.large-avatar {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 50%;
  background: #DCECF7;
  color: #176A9C;
  font-size: 18px;
  font-weight: 700;
}

.profile-summary strong,
.profile-summary span:not(.large-avatar) {
  display: block;
}

.profile-summary strong {
  font-size: 14px;
}

.profile-summary span:not(.large-avatar) {
  margin-top: 4px;
  color: #94A3B8;
  font-size: 11px;
}

.setting-row,
.select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 58px;
  padding: 13px 0;
  border-top: 1px solid #EEF2F4;
  cursor: pointer;
}

.setting-row span,
.select-row span {
  min-width: 0;
}

.setting-row strong,
.setting-row small,
.select-row strong,
.select-row small {
  display: block;
}

.setting-row strong,
.select-row strong {
  font-size: 13px;
}

.setting-row small,
.select-row small {
  margin-top: 4px;
  color: #94A3B8;
  font-size: 11px;
}

.toggle-input {
  appearance: none;
  position: relative;
  flex: 0 0 auto;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: #CBD5DC;
  cursor: pointer;
  transition: background-color .2s;
}

.toggle-input::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #FFFFFF;
  content: '';
  transition: transform .2s;
}

.toggle-input:checked {
  background: #0078D4;
}

.toggle-input:checked::after {
  transform: translateX(16px);
}

.select-row select {
  min-width: 130px;
  padding: 8px 10px;
  border: 1px solid #CBD5DC;
  border-radius: 5px;
  background: #FFFFFF;
  color: #334155;
  font: inherit;
  font-size: 12px;
}

.danger-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.danger-section .section-heading {
  margin-bottom: 0;
}

.logout-button {
  padding: 9px 14px;
  border: 1px solid #F2B8B5;
  border-radius: 5px;
  background: #FFF7F6;
  color: #B34D4A;
  font-size: 12px;
  cursor: pointer;
}

.logout-button:hover {
  background: #FDEBE9;
}

.vault-setting-row { cursor: default; }
.recovery-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.fixed-setting { flex: 0 0 auto; padding: 5px 8px; border-radius: 4px; background: #E9F4EC; color: #39734D; font-size: 10px; font-weight: 700; }
.setting-button { flex: 0 0 auto; padding: 8px 12px; border: 1px solid #B9C8D2; border-radius: 5px; background: #F8FAFB; color: #28536B; font-size: 12px; font-weight: 600; cursor: pointer; }
.setting-button:disabled { opacity: .55; cursor: wait; }
.setting-button.primary { border-color: #0078B8; background: #0078B8; color: #FFF; }
.master-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; padding: 12px 0 16px; }
.master-form input { min-width: 0; padding: 9px 10px; border: 1px solid #CBD5DC; border-radius: 5px; font: inherit; font-size: 12px; }
.recovery-result { display: grid; gap: 8px; padding: 14px; border: 1px solid #B8D9EE; border-radius: 5px; background: #EFF8FD; color: #28536B; font-size: 11px; }
.recovery-result small { color: #54788D; }
.recovery-result code { overflow-wrap: anywhere; }
.hidden-input { display: none; }
.vault-message { margin-top: 12px; color: #3776AF; font-size: 11px; }

@media (max-width: 600px) {
  .settings-page {
    height: 100dvh;
  }

  .settings-background {
    display: block;
    overflow: hidden;
  }

  .settings-edge {
    display: none;
  }

  .settings-content {
    width: 100%;
    height: 100%;
    padding: 24px 14px calc(32px + env(safe-area-inset-bottom));
    overflow-x: hidden;
    overflow-y: auto;
  }

  .settings-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

  .settings-header h1 {
    font-size: 28px;
  }

  .settings-subtitle {
    line-height: 1.45;
  }

  .settings-section {
    width: 100%;
    padding: 18px 16px;
  }

  .section-heading {
    margin-bottom: 16px;
  }

  .profile-summary {
    min-width: 0;
  }

  .profile-summary > div {
    min-width: 0;
  }

  .profile-summary strong {
    overflow-wrap: anywhere;
  }

  .setting-row,
  .select-row {
    min-height: 68px;
    gap: 14px;
    padding: 14px 0;
  }

  .setting-row small,
  .select-row small {
    line-height: 1.4;
  }

  .select-row,
  .vault-setting-row {
    align-items: stretch;
    flex-direction: column;
  }

  .select-row select,
  .setting-button,
  .fixed-setting,
  .logout-button {
    width: 100%;
    min-height: 44px;
  }

  .select-row select {
    min-width: 0;
    padding: 10px 12px;
    font-size: 16px;
  }

  .toggle-input {
    width: 44px;
    height: 26px;
    border-radius: 13px;
  }

  .toggle-input::after {
    top: 4px;
    left: 4px;
    width: 18px;
    height: 18px;
  }

  .toggle-input:checked::after {
    transform: translateX(18px);
  }

  .setting-button,
  .fixed-setting,
  .logout-button {
    display: grid;
    place-items: center;
    text-align: center;
  }

  .master-form {
    grid-template-columns: 1fr;
  }

  .master-form input {
    min-height: 44px;
    font-size: 16px;
  }

  .recovery-result {
    padding: 12px;
  }

  .recovery-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .danger-section {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }
}

@media (min-width: 601px) and (max-width: 1100px) {
  .settings-background {
    grid-template-columns: 92px minmax(0, 1fr) 120px;
  }

  .settings-content {
    padding: 36px 24px 56px;
  }
}

:global([data-theme='dark'] .settings-page) {
  background: #111820;
  color: #E5EDF2;
}

:global([data-theme='dark'] .settings-background) {
  background: #34424D;
}

:global([data-theme='dark'] .settings-edge) {
  background: #1B232B;
}

:global([data-theme='dark'] .settings-edge-right) {
  background: #202A32;
}

:global([data-theme='dark'] .settings-content) {
  background: #202B34;
}

:global([data-theme='dark'] .settings-section) {
  border-color: #34424D;
  background: #202B34;
}

:global([data-theme='dark'] .settings-subtitle),
:global([data-theme='dark'] .section-heading p),
:global([data-theme='dark'] .setting-row small),
:global([data-theme='dark'] .select-row small),
:global([data-theme='dark'] .profile-summary span:not(.large-avatar)) {
  color: #9AAAB5;
}

:global([data-theme='dark'] .setting-row),
:global([data-theme='dark'] .select-row) {
  border-color: #34424D;
}

:global([data-theme='dark'] .select-row select),
:global([data-theme='dark'] .master-form input),
:global([data-theme='dark'] .setting-button) {
  border-color: #52616D;
  background: #172027;
  color: #E5EDF2;
}
</style>
