<template>
  <div class="planner-settings-page">
    <TopBar />
    <div class="planner-settings-background">
      <aside class="settings-edge settings-edge-left" aria-hidden="true" />
      <main class="planner-settings-content">
        <header class="planner-settings-header">
          <div>
            <p class="planner-settings-eyebrow">Workspace</p>
            <h1>Planner settings</h1>
            <p class="planner-settings-subtitle">Choose which modules are visible and arrange their order.</p>
          </div>
          <span v-if="saveStatus !== 'idle'" class="save-status" :class="saveStatus">{{ statusLabel }}</span>
        </header>

        <div class="planner-settings-sections">
          <section class="module-settings" aria-labelledby="module-settings-title">
            <div class="section-heading">
              <h2 id="module-settings-title">Planner modules</h2>
              <p>Set visibility for each view, then drag modules or use the arrows to change their position.</p>
            </div>
            <div class="module-list">
              <article
                v-for="(module, index) in modules"
                :key="module.id"
                class="module-row"
                :class="{ dragging: draggedId === module.id }"
                draggable="true"
                @dragstart="startDrag(module.id)"
                @dragover.prevent
                @drop="dropOn(index)"
                @dragend="draggedId = ''"
              >
                <span class="drag-handle" aria-hidden="true">::</span>
                <div class="module-copy">
                  <strong>{{ moduleDetails[module.id].title }}</strong>
                  <small>{{ moduleDetails[module.id].description }}</small>
                </div>
                <div class="module-actions">
                  <button type="button" class="order-button" :disabled="index === 0" :aria-label="`Move ${moduleDetails[module.id].title} up`" @click="moveModule(index, -1)">↑</button>
                  <button type="button" class="order-button" :disabled="index === modules.length - 1" :aria-label="`Move ${moduleDetails[module.id].title} down`" @click="moveModule(index, 1)">↓</button>
                  <div class="visibility-options" :aria-label="`${moduleDetails[module.id].title} visibility`">
                    <label :class="{ active: module.visibility.personal }">
                      <input v-model="module.visibility.personal" type="checkbox" @change="saveModules">
                      <span>Personal</span>
                    </label>
                    <label :class="{ active: module.visibility.work }">
                      <input v-model="module.visibility.work" type="checkbox" @change="saveModules">
                      <span>Work</span>
                    </label>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="module-settings settings-actions-section">
            <div class="section-heading">
              <h2>Defaults</h2>
              <p>Restore the original module order and visibility.</p>
            </div>
            <div class="page-actions">
              <button type="button" class="secondary-button" @click="resetModules">Restore defaults</button>
              <button type="button" class="primary-button" @click="router.push('/planner')">Back to planner</button>
            </div>
          </section>
        </div>
      </main>
      <aside class="settings-edge settings-edge-right" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import api from '../services/api'

const router = useRouter()
const defaults = [
  { id: 'tasks', visibility: { personal: true, work: true } },
  { id: 'readAloud', visibility: { personal: true, work: true } },
  { id: 'fourteenDayTracker', visibility: { personal: true, work: true } },
  { id: 'dailyTracker', visibility: { personal: true, work: true } },
  { id: 'habitAnalytics', visibility: { personal: true, work: true } }
]
const moduleDetails = {
  tasks: { title: 'Tasks this week', description: 'Weekly tasks, priorities, and timeline.' },
  readAloud: { title: 'Read aloud', description: 'Paste English or Hungarian text and listen with a native device voice.' },
  fourteenDayTracker: { title: '14-day habit tracker', description: 'A compact two-week view of scheduled habits.' },
  dailyTracker: { title: 'Daily habit tracker', description: 'Daily notes and habit completion for the month.' },
  habitAnalytics: { title: 'Habit analytics', description: 'Completion percentages for scheduled habit days.' }
}
const modules = ref(defaults.map(module => ({ ...module, visibility: { ...module.visibility } })))
const draggedId = ref('')
const saveStatus = ref('idle')
const statusLabel = computed(() => ({ saved: 'All changes saved', fading: 'All changes saved', error: 'Could not save' })[saveStatus.value] || '')
let fadeTimer
let removeTimer

function normalizeModules(saved) {
  if (!Array.isArray(saved)) return defaults.map(module => ({ ...module, visibility: { ...module.visibility } }))
  const valid = saved
    .filter(module => moduleDetails[module?.id])
    .map(module => {
      const visible = module.visible !== false
      return {
        id: module.id,
        visibility: module.visibility && typeof module.visibility === 'object'
          ? { personal: module.visibility.personal !== false, work: module.visibility.work !== false }
          : { personal: visible, work: visible }
      }
    })
  for (const defaultModule of defaults) {
    if (!valid.some(module => module.id === defaultModule.id)) valid.push({ ...defaultModule, visibility: { ...defaultModule.visibility } })
  }
  return valid
}

async function saveModules() {
  window.clearTimeout(fadeTimer)
  window.clearTimeout(removeTimer)
  saveStatus.value = 'idle'
  try {
    const preferences = await api.updatePreferences({ plannerModules: modules.value })
    modules.value = normalizeModules(preferences.plannerModules)
    saveStatus.value = 'saved'
    fadeTimer = window.setTimeout(() => {
      saveStatus.value = 'fading'
      removeTimer = window.setTimeout(() => { saveStatus.value = 'idle' }, 400)
    }, 1000)
  } catch (error) {
    console.error('Could not save planner module settings:', error)
    saveStatus.value = 'error'
  }
}

function moveModule(index, offset) {
  const target = index + offset
  if (target < 0 || target >= modules.value.length) return
  const [module] = modules.value.splice(index, 1)
  modules.value.splice(target, 0, module)
  saveModules()
}

function startDrag(id) {
  draggedId.value = id
}

function dropOn(targetIndex) {
  const sourceIndex = modules.value.findIndex(module => module.id === draggedId.value)
  if (sourceIndex < 0 || sourceIndex === targetIndex) return
  const [module] = modules.value.splice(sourceIndex, 1)
  modules.value.splice(targetIndex, 0, module)
  draggedId.value = ''
  saveModules()
}

function resetModules() {
  modules.value = defaults.map(module => ({ ...module, visibility: { ...module.visibility } }))
  saveModules()
}

onMounted(async () => {
  try {
    const preferences = await api.getPreferences()
    modules.value = normalizeModules(preferences.plannerModules)
  } catch (error) {
    console.error('Could not load planner module settings:', error)
  }
})

onUnmounted(() => {
  window.clearTimeout(fadeTimer)
  window.clearTimeout(removeTimer)
})
</script>

<style scoped>
.planner-settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F4F6F8;
  color: #1F2937;
}

.planner-settings-background {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr) 330px;
  gap: 1px;
  overflow: hidden;
  background: #D7DDE3;
}

.planner-settings-content {
  min-width: 0;
  overflow-y: auto;
  padding: 48px 32px 64px;
  background: #FFFFFF;
}

.settings-edge {
  min-width: 0;
  background: #EEF2F4;
}

.settings-edge-right {
  background: #F1F4F6;
}

.planner-settings-header {
  width: min(900px, 100%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto 28px;
}

.planner-settings-eyebrow {
  margin-bottom: 8px;
  color: #0078D4;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.planner-settings-header h1 {
  font-size: 32px;
  line-height: 1.1;
}

.planner-settings-subtitle {
  margin-top: 8px;
  color: #64748B;
  font-size: 14px;
}

.save-status {
  padding: 7px 10px;
  border: 1px solid #B8D9EE;
  border-radius: 5px;
  background: #EFF8FD;
  color: #3776AF;
  font-size: 11px;
  white-space: nowrap;
  opacity: 1;
  transition: opacity .4s ease;
}

.save-status.fading {
  opacity: 0;
}

.save-status.error {
  border-color: #F2B8B5;
  background: #FFF7F6;
  color: #B34D4A;
}

.module-settings {
  padding: 24px;
  border: 1px solid #D9E0E5;
  border-radius: 8px;
  background: #FFFFFF;
}

.planner-settings-sections {
  width: min(900px, 100%);
  display: grid;
  gap: 16px;
  margin: 0 auto;
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

.module-list {
  border-bottom: 1px solid #EEF2F4;
}

.module-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  min-height: 72px;
  padding: 13px 0;
  border-top: 1px solid #EEF2F4;
}

.module-row.dragging {
  opacity: .55;
}

.drag-handle {
  color: #94A3B8;
  font-size: 16px;
  font-weight: 700;
  cursor: grab;
}

.module-copy strong,
.module-copy small {
  display: block;
}

.module-copy strong {
  font-size: 14px;
}

.module-copy small {
  margin-top: 5px;
  color: #64748B;
  font-size: 11px;
}

.module-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.order-button {
  width: 32px;
  height: 32px;
  border: 1px solid #CBD5DC;
  border-radius: 5px;
  background: #FFFFFF;
  color: #334155;
  font-size: 16px;
  cursor: pointer;
}

.order-button:disabled {
  opacity: .35;
  cursor: default;
}

.visibility-options {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 8px;
}

.visibility-options label {
  padding: 7px 9px;
  border: 1px solid #CBD5DC;
  border-radius: 5px;
  background: #FFFFFF;
  color: #64748B;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.visibility-options label.active {
  border-color: #79B8DC;
  background: #E8F3FA;
  color: #176A9C;
}

.visibility-options input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.page-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.settings-actions-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.settings-actions-section .section-heading {
  margin-bottom: 0;
}

.secondary-button,
.primary-button {
  padding: 9px 14px;
  border-radius: 5px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.secondary-button {
  border: 1px solid #B9C8D2;
  background: #FFFFFF;
  color: #28536B;
}

.primary-button {
  border: 1px solid #0078B8;
  background: #0078B8;
  color: #FFFFFF;
}

@media (max-width: 700px) {
  .planner-settings-page {
    height: 100dvh;
  }

  .planner-settings-background {
    display: block;
    overflow: hidden;
  }

  .settings-edge {
    display: none;
  }

  .planner-settings-content {
    width: 100%;
    height: 100%;
    padding: 24px 14px calc(32px + env(safe-area-inset-bottom));
    overflow-x: hidden;
    overflow-y: auto;
  }

  .planner-settings-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

  .planner-settings-header h1 {
    font-size: 28px;
  }

  .planner-settings-subtitle {
    line-height: 1.45;
  }

  .module-settings {
    width: 100%;
    padding: 18px 16px;
  }

  .module-row {
    grid-template-columns: 20px minmax(0, 1fr);
  }

  .module-actions {
    grid-column: 2;
    justify-content: space-between;
  }

  .visibility-options {
    margin-left: auto;
  }

  .page-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .settings-actions-section {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }

  .secondary-button,
  .primary-button {
    min-height: 44px;
  }
}

@media (min-width: 701px) and (max-width: 1100px) {
  .planner-settings-background {
    grid-template-columns: 92px minmax(0, 1fr) 120px;
  }

  .planner-settings-content {
    padding: 36px 24px 56px;
  }
}

:global([data-theme='dark'] .planner-settings-page) {
  background: #111820;
  color: #E5EDF2;
}

:global([data-theme='dark'] .planner-settings-background) {
  background: #34424D;
}

:global([data-theme='dark'] .settings-edge) {
  background: #1B232B;
}

:global([data-theme='dark'] .settings-edge-right) {
  background: #202A32;
}

:global([data-theme='dark'] .planner-settings-content) {
  background: #202B34;
}

:global([data-theme='dark'] .module-settings) {
  border-color: #34424D;
  background: #202B34;
}

:global([data-theme='dark'] .module-row) {
  border-color: #34424D;
}

:global([data-theme='dark'] .module-copy small),
:global([data-theme='dark'] .planner-settings-subtitle),
:global([data-theme='dark'] .section-heading p) {
  color: #9AAAB5;
}

:global([data-theme='dark'] .order-button),
:global([data-theme='dark'] .secondary-button),
:global([data-theme='dark'] .visibility-options label) {
  border-color: #52616D;
  background: #172027;
  color: #E5EDF2;
}

:global([data-theme='dark'] .visibility-options label.active) {
  border-color: #3C7B9E;
  background: #203E50;
  color: #8CCCED;
}
</style>