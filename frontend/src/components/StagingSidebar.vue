<template>
  <div v-if="pendingItems.length > 0" class="staging-sidebar">
    <div class="staging-header">
      <h3>Elrendezésre vár</h3>
      <span class="item-count">{{ pendingItems.length }} elem</span>
    </div>
    <div class="staging-list">
      <div
        v-for="item in pendingItems"
        :key="item.id"
        class="staging-item"
        draggable="true"
        @dragstart="handleDragStart($event, item)"
        @dragend="handleDragEnd"
      >
        <div class="item-preview">
          <!-- Note preview -->
          <div v-if="item.type === 'note'" class="preview-note" :style="{ backgroundColor: item.bgColor }">
            <span class="preview-text">{{ truncateText(item.content, 30) || 'Empty note' }}</span>
          </div>
          <!-- Board preview -->
          <div v-else-if="item.type === 'board'" class="preview-board">
            <span class="preview-emoji" :class="{ grayscale: item.emojiGrayscale }">{{ item.emoji }}</span>
            <span class="preview-title">{{ item.title }}</span>
          </div>
          <!-- File preview -->
          <div v-else-if="item.type === 'file'" class="preview-file">
            <span class="preview-icon">📄</span>
            <span class="preview-filename">{{ truncateText(item.filename, 20) }}</span>
          </div>
        </div>
        <button class="place-btn" @click="placeAtCenter(item)" title="Elhelyezés középen">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="staging-actions">
      <button class="place-all-btn" @click="placeAllItems">
        Mind elhelyezése
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWorkspaceStore } from '../store/workspace'

const store = useWorkspaceStore()

const emit = defineEmits(['place-item'])

const pendingItems = computed(() => {
  const boardId = store.currentBoardId
  const itemIds = store.pendingPlacements[boardId] || []
  return itemIds.map(id => {
    return store.notes[id] || store.boards[id] || store.files[id]
  }).filter(Boolean)
})

function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function handleDragStart(e, item) {
  e.dataTransfer.setData('application/x-pending-item', item.id)
  e.dataTransfer.effectAllowed = 'move'
}

function handleDragEnd() {
  // Cleanup if needed
}

function placeAtCenter(item) {
  // Calculate center of visible viewport
  const canvas = document.querySelector('.canvas-container')
  if (canvas) {
    const rect = canvas.getBoundingClientRect()
    const x = Math.round((canvas.scrollLeft + rect.width / 2 - 100) / 10) * 10
    const y = Math.round((canvas.scrollTop + rect.height / 2 - 100) / 10) * 10
    store.placeItemFromPending(item.id, x, y)
  }
}

function placeAllItems() {
  store.clearPendingPlacements(store.currentBoardId)
}
</script>

<style scoped>
.staging-sidebar {
  position: fixed;
  top: 56px;
  right: 0;
  width: 280px;
  height: calc(100vh - 56px);
  background: white;
  border-left: 1px solid #E5E7EB;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.staging-header {
  padding: 16px;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.staging-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
}

.item-count {
  font-size: 12px;
  color: #6B7280;
  background: #F3F4F6;
  padding: 2px 8px;
  border-radius: 10px;
}

.staging-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.staging-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
}

.staging-item:hover {
  background: #F3F4F6;
  border-color: #D1D5DB;
}

.staging-item:active {
  cursor: grabbing;
}

.item-preview {
  flex: 1;
  min-width: 0;
}

.preview-note {
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
}

.preview-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-board {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-emoji {
  font-size: 20px;
}

.preview-emoji.grayscale {
  filter: grayscale(1);
}

.preview-title {
  font-size: 13px;
  font-weight: 500;
  color: #1F2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-file {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-icon {
  font-size: 18px;
}

.preview-filename {
  font-size: 12px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.place-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s;
  flex-shrink: 0;
}

.place-btn:hover {
  background: #6366F1;
  border-color: #6366F1;
  color: white;
}

.staging-actions {
  padding: 12px;
  border-top: 1px solid #E5E7EB;
}

.place-all-btn {
  width: 100%;
  padding: 10px 16px;
  background: #6366F1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.place-all-btn:hover {
  background: #4F46E5;
}
</style>
