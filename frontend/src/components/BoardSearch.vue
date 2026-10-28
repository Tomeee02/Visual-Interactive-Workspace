<template>
  <div ref="container" class="board-search" @click.stop @keydown.esc.stop.prevent="close">
    <button ref="trigger" type="button" class="search-trigger" :class="{ active: open }" title="Keresés" aria-label="Keresés" :aria-expanded="open" aria-controls="board-search-panel" @click="toggle">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
    </button>
    <section v-if="open" id="board-search-panel" class="search-panel" aria-label="Keresés a boardokon">
      <div class="search-input-row">
        <input ref="input" v-model="query" type="search" placeholder="Keresés…" aria-label="Keresett szöveg" autocomplete="off" @keydown.down.prevent="focusFirstResult" @keydown.enter.prevent="goToFirstResult" />
        <button v-if="query" type="button" class="clear-search" title="Törlés" aria-label="Keresés törlése" @click="clearQuery">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div class="search-summary" role="status" aria-live="polite">
        <template v-if="loading">Betöltés…</template>
        <template v-else-if="error">{{ error }}</template>
        <template v-else-if="!query.trim()">Keresés a boardokon</template>
        <template v-else>{{ matchCount }} találat</template>
        <button v-if="error" type="button" @click="load">Újra</button>
      </div>
      <div v-if="!loading && !error && query.trim()" class="search-results">
        <p v-if="!matchCount" class="empty-search">Nincs találat.</p>
        <div v-for="group in groups" :key="group.board.id" class="search-group">
          <button type="button" class="result-board" @click="navigate(group.board.id)">
            <span class="result-emoji">{{ group.board.emoji }}</span>
            <span class="result-board-info"><strong>{{ group.board.title }}</strong><small>{{ boardPath(group.board) }}</small></span>
          </button>
          <button v-for="match in group.matches" :key="match.id" type="button" class="search-result" :aria-label="`${match.label}: ${match.before}${match.hit}${match.after}, ${group.board.title}`" @click="navigate(group.board.id)">
            <span class="result-type">{{ match.label }}</span>
            <span class="result-context"><span>{{ match.before }}</span><mark>{{ match.hit }}</mark><span>{{ match.after }}</span></span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'

const emit = defineEmits(['open'])
const route = useRoute()
const router = useRouter()
const container = ref(null)
const trigger = ref(null)
const input = ref(null)
const open = ref(false)
const query = ref('')
const loading = ref(false)
const error = ref('')
const data = ref({ boards: [], notes: [], files: [] })
let loadVersion = 0

const boardMap = computed(() => new Map([
  ['root', { id: 'root', title: 'Home', emoji: '🏠', parent_id: null }],
  ...data.value.boards.map(board => [board.id, board])
]))

function plainText(value) {
  const document = new DOMParser().parseFromString(String(value || ''), 'text/html')
  document.querySelectorAll('br').forEach(node => node.replaceWith(' '))
  document.querySelectorAll('p, div, li').forEach(node => node.append(' '))
  return (document.body.textContent || '').replace(/\s+/g, ' ').trim()
}

function snippet(text) {
  const needle = query.value.trim().toLocaleLowerCase('hu')
  const index = text.toLocaleLowerCase('hu').indexOf(needle)
  if (index < 0) return null
  const start = Math.max(0, index - 45)
  const end = Math.min(text.length, index + needle.length + 80)
  return {
    before: (start ? '…' : '') + text.slice(start, index),
    hit: text.slice(index, index + needle.length),
    after: text.slice(index + needle.length, end) + (end < text.length ? '…' : '')
  }
}

const groups = computed(() => {
  if (!query.value.trim()) return []
  const results = new Map()
  function add(boardId, id, label, text) {
    const board = boardMap.value.get(boardId)
    const match = snippet(text)
    if (!board || !match) return
    if (!results.has(boardId)) results.set(boardId, { board, matches: [] })
    const matches = results.get(boardId).matches
    if (!matches.some(existing => existing.id === id)) matches.push({ id, label, ...match })
  }
  for (const board of data.value.boards) add(board.id, `board-${board.id}`, 'Board', board.title)
  for (const note of data.value.notes) {
    const fields = [plainText(note.content)]
    if (note.show_title) fields.unshift(note.title)
    if (Array.isArray(note.checklist_items)) {
      for (const item of note.checklist_items) {
        fields.push(Array.isArray(item) ? item.join(' · ') : item?.text || '')
      }
    }
    const label = { checklist: 'Checklist', table: 'Táblázat' }[note.item_type] || 'Jegyzet'
    add(note.board_id, `note-${note.id}`, label, fields.filter(Boolean).join(' · '))
  }
  for (const file of data.value.files) add(file.board_id, `file-${file.id}`, 'Fájl', file.filename)
  return [...results.values()].sort((first, second) => first.board.title.localeCompare(second.board.title, 'hu'))
})
const matchCount = computed(() => groups.value.reduce((count, group) => count + group.matches.length, 0))

function boardPath(board) {
  const titles = []
  const visited = new Set([board.id])
  let parentId = board.parent_id
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = boardMap.value.get(parentId)
    if (!parent) break
    titles.unshift(parent.title)
    parentId = parent.parent_id
  }
  return titles.join(' / ')
}

async function load() {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await api.getSearchData()
    if (version === loadVersion) data.value = result
  } catch {
    if (version === loadVersion) error.value = 'A keresés nem tölthető be.'
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

async function toggle() {
  if (open.value) return close()
  open.value = true
  emit('open')
  load()
  await nextTick()
  input.value?.focus()
}

function close() {
  open.value = false
  trigger.value?.focus()
}

function clearQuery() {
  query.value = ''
  input.value?.focus()
}

function navigate(boardId) {
  close()
  router.push({ name: 'Board', params: { id: boardId } })
}

function focusFirstResult() {
  container.value?.querySelector('.search-result')?.focus()
}

function goToFirstResult() {
  if (!loading.value && !error.value && groups.value.length) navigate(groups.value[0].board.id)
}

function outsideClick(event) {
  if (!container.value?.contains(event.target)) open.value = false
}

watch(() => route.fullPath, () => { open.value = false })
onMounted(() => document.addEventListener('click', outsideClick))
onUnmounted(() => {
  loadVersion += 1
  document.removeEventListener('click', outsideClick)
})
</script>

<style scoped>
.board-search { position: relative; }
.search-trigger { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 6px; background: transparent; color: #64748B; cursor: pointer; }
.search-trigger:hover, .search-trigger.active { background: #E8F3FA; color: #0067A8; }
.search-panel { position: absolute; top: calc(100% + 10px); right: 0; z-index: 1100; width: 420px; max-width: calc(100vw - 24px); overflow: hidden; border: 1px solid #E5E7EB; border-radius: 8px; background: #FFF; color: #374151; box-shadow: 0 8px 24px rgba(15, 23, 42, .16); }
.search-input-row { display: flex; align-items: center; gap: 8px; margin: 16px 16px 8px; padding: 0 10px; border: 1px solid #64748B; border-radius: 4px; }
.search-input-row:focus-within { outline: 2px solid #0067A8; outline-offset: 1px; }
.search-input-row input { width: 100%; min-width: 0; height: 38px; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: 14px; }
.search-input-row input::-webkit-search-cancel-button { display: none; }
.clear-search { display: grid; place-items: center; flex-shrink: 0; width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: #6B7280; cursor: pointer; }
.search-summary { display: flex; justify-content: space-between; gap: 8px; padding: 4px 16px 12px; color: #6B7280; font-size: 12px; }
.search-summary button { border: 0; background: transparent; color: #0067A8; cursor: pointer; }
.search-results { max-height: min(520px, calc(100dvh - 180px)); overflow-y: auto; overscroll-behavior: contain; border-top: 1px solid #E5E7EB; }
.empty-search { margin: 0; padding: 20px 16px; font-size: 13px; }
.search-group { padding: 10px 12px; }
.search-group + .search-group { border-top: 1px solid #E5E7EB; }
.result-board { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 4px 8px; border: 0; border-radius: 4px; text-align: left; color: inherit; background: transparent; cursor: pointer; }
.result-emoji { display: grid; place-items: center; flex-shrink: 0; width: 38px; height: 38px; font-size: 24px; background: #F3F4F6; border-radius: 6px; }
.result-board-info { display: grid; gap: 4px; min-width: 0; }
.result-board-info strong { font-size: 14px; overflow-wrap: anywhere; }
.result-board-info small { font-size: 12px; color: #6B7280; overflow-wrap: anywhere; }
.search-result { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 8px; width: 100%; padding: 8px 4px; border: 0; border-radius: 4px; text-align: left; font: inherit; font-size: 12px; line-height: 1.5; color: inherit; background: transparent; cursor: pointer; }
.result-type { color: #6B7280; font-size: 11px; }
.result-context { overflow-wrap: anywhere; }
mark { background: #FFF176; color: #17212B; }
.result-board:hover, .search-result:hover { background: #F3F4F6; }
button:focus-visible { outline: 2px solid #0067A8; outline-offset: -2px; }
@media (max-width: 600px) { .search-panel { position: fixed; top: 62px; right: 12px; } }
:global([data-theme='dark'] .search-panel) { background: #1B232B; color: #E5EDF2; border-color: #34424D; }
:global([data-theme='dark'] .search-group + .search-group), :global([data-theme='dark'] .search-results) { border-color: #34424D; }
:global([data-theme='dark'] .result-board:hover), :global([data-theme='dark'] .search-result:hover), :global([data-theme='dark'] .result-emoji) { background: #293E4D; }
:global([data-theme='dark'] .search-summary), :global([data-theme='dark'] .result-type), :global([data-theme='dark'] .result-board-info small) { color: #A7B4BF; }
:global([data-theme='dark'] .search-trigger) { color: #A7B4BF; }
:global([data-theme='dark'] .search-trigger:hover), :global([data-theme='dark'] .search-trigger.active) { background: #293E4D; color: #9FD0F2; }
:global([data-theme='dark'] .search-input-row) { border-color: #52616D; }
:global([data-theme='dark'] .search-input-row:focus-within) { outline-color: #1687D2; }
:global([data-theme='dark'] .search-input-row input::placeholder) { color: #7F919E; }
:global([data-theme='dark'] .clear-search) { color: #A7B4BF; }
:global([data-theme='dark'] .clear-search:hover), :global([data-theme='dark'] .search-summary button) { color: #9FD0F2; }
:global([data-theme='dark'] .result-emoji) { background: #202B34; }
:global([data-theme='dark'] mark) { background: #5A4A20; color: #FFF0B3; }
:global([data-theme='dark'] .result-board:hover), :global([data-theme='dark'] .search-result:hover) { background: #293E4D; }
:global([data-theme='dark'] button:focus-visible) { outline-color: #1687D2; }
</style>