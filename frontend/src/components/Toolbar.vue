<template>
  <div class="toolbar">
    <div class="toolbar-section">
      <!-- No selection - creation tools -->
      <template v-if="store.selectedItems.size === 0">
        <div 
          ref="noteButtonRef"
          class="toolbar-button" 
          :class="{ 'shake': shakeNote }"
          @click="handleNoteClick" 
          title="Create Note"
          draggable="true"
          @dragstart="handleDragStartNote"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span class="tooltip">Create Note</span>
          <span class="drag-hint" :class="{ 'show': shakeNote }">Drag me!</span>
        </div>
        <div 
          ref="boardButtonRef"
          class="toolbar-button" 
          :class="{ 'shake': shakeBoard }"
          @click="handleBoardClick" 
          title="Create Board"
          draggable="true"
          @dragstart="handleDragStartBoard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
          <span class="tooltip">Create Board</span>
          <span class="drag-hint" :class="{ 'show': shakeBoard }">Drag me!</span>
        </div>
        <div class="toolbar-button" @click="triggerFileUpload" title="Upload File">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span class="tooltip">Upload File</span>
        </div>
      </template>

      <!-- Notes selected - color tools -->
      <template v-if="store.selectedNotes.length > 0">
        <div class="toolbar-button" @click="toggleColorPicker('bg')" title="Background Color">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
          <span class="tooltip">Background Color</span>
        </div>
        <div class="toolbar-button" @click="toggleColorPicker('text')" title="Text Color">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 7 4 4 20 4 20 7"></polyline>
            <line x1="9" y1="20" x2="15" y2="20"></line>
            <line x1="12" y1="4" x2="12" y2="20"></line>
          </svg>
          <span class="tooltip">Text Color</span>
        </div>
      </template>

      <!-- Boards selected - emoji picker -->
      <template v-if="store.selectedBoards.length > 0">
        <div class="toolbar-button" @click="toggleBoardColorPicker" title="Background Color">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
          <span class="tooltip">Background Color</span>
        </div>
        <div class="toolbar-button" @click="toggleEmojiPicker" title="Change Emoji">
          <span :style="{ fontSize: '24px', filter: store.selectedBoards[0]?.emojiGrayscale ? 'grayscale(1)' : 'none' }">{{ store.selectedBoards[0]?.emoji || '📋' }}</span>
          <span class="tooltip">Change Emoji</span>
        </div>
      </template>

      <!-- Multiple items selected - alignment tools -->
      <template v-if="store.selectedItems.size > 1">
        <div class="toolbar-button" @click="alignHorizontal" title="Align Horizontal">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="3" x2="12" y2="21"></line>
            <rect x="4" y="8" width="6" height="8" rx="1"></rect>
            <rect x="14" y="6" width="6" height="12" rx="1"></rect>
          </svg>
          <span class="tooltip">Align Horizontal Center</span>
        </div>
        <div class="toolbar-button" @click="alignVertical" title="Align Vertical">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <rect x="8" y="4" width="8" height="6" rx="1"></rect>
            <rect x="6" y="14" width="12" height="6" rx="1"></rect>
          </svg>
          <span class="tooltip">Align Vertical Center</span>
        </div>
      </template>
    </div>

    <!-- Hidden file input - always rendered -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- Backdrop for closing popovers -->
    <div 
      v-if="showColorPicker || showEmojiPicker" 
      class="popover-backdrop"
      @mousedown="closePopovers"
    />

    <!-- Color Picker Popover -->
    <ColorPicker 
      v-if="showColorPicker"
      :type="colorPickerType"
      :currentColor="currentPickerColor"
      :style="{ position: 'absolute', left: '72px', top: colorPickerTop + 'px' }"
      @select="handleColorSelect"
      @close="showColorPicker = false"
    />

    <!-- Emoji Picker Popover -->
    <EmojiPicker
      v-if="showEmojiPicker"
      :style="{ position: 'absolute', left: '72px', top: '100px' }"
      @select="handleEmojiSelect"
      @close="showEmojiPicker = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '../store/workspace'
import ColorPicker from './ColorPicker.vue'
import EmojiPicker from './EmojiPicker.vue'

const store = useWorkspaceStore()
const showColorPicker = ref(false)
const colorPickerType = ref('bg')
const colorPickerTop = ref(0)
const showEmojiPicker = ref(false)
const fileInputRef = ref(null)
const noteButtonRef = ref(null)
const boardButtonRef = ref(null)
const shakeNote = ref(false)
const shakeBoard = ref(false)

const currentPickerColor = computed(() => {
  if (colorPickerType.value === 'boardBg') {
    return store.selectedBoards[0]?.bgColor || '#F3F4F6'
  } else if (colorPickerType.value === 'bg') {
    return store.selectedNotes[0]?.bgColor || '#FEF3C7'
  } else if (colorPickerType.value === 'text') {
    return store.selectedNotes[0]?.textColor || '#1F2937'
  }
  return ''
})

function handleNoteClick() {
  shakeNote.value = true
  setTimeout(() => {
    shakeNote.value = false
  }, 2500)
}

function handleBoardClick() {
  shakeBoard.value = true
  setTimeout(() => {
    shakeBoard.value = false
  }, 2500)
}

function createNote() {
  const canvas = document.querySelector('.canvas-container')
  const rect = canvas.getBoundingClientRect()
  const x = Math.round((rect.width / 2 - 100) / 10) * 10
  const y = Math.round((rect.height / 2 - 75) / 10) * 10
  store.createNote(x, y)
}

function createBoard() {
  const canvas = document.querySelector('.canvas-container')
  const rect = canvas.getBoundingClientRect()
  const x = Math.round((rect.width / 2 - 90) / 10) * 10
  const y = Math.round((rect.height / 2 - 60) / 10) * 10
  store.createBoard(x, y)
}

function handleDragStartNote(e) {
  e.dataTransfer.setData('application/x-create-item', 'note')
  e.dataTransfer.effectAllowed = 'copy'
}

function handleDragStartBoard(e) {
  e.dataTransfer.setData('application/x-create-item', 'board')
  e.dataTransfer.effectAllowed = 'copy'
}

function triggerFileUpload() {
  fileInputRef.value?.click()
}

async function handleFileSelect(e) {
  const selectedFiles = e.target.files
  if (!selectedFiles || selectedFiles.length === 0) return

  // Copy file references before clearing input, to avoid any browser quirks
  const filesToUpload = Array.from(selectedFiles)

  // Reset input immediately so the same file can be selected again
  e.target.value = ''

  const canvas = document.querySelector('.canvas-container')
  const rect = canvas.getBoundingClientRect()
  const baseX = Math.round((rect.width / 2 - 60) / 10) * 10
  const baseY = Math.round((rect.height / 2 - 40) / 10) * 10

  // Upload files sequentially to avoid race conditions
  for (let i = 0; i < filesToUpload.length; i++) {
    const x = baseX + i * 140
    const y = baseY
    await store.createFileItem(filesToUpload[i], x, y)
  }
}

function toggleColorPicker(type) {
  colorPickerType.value = type
  colorPickerTop.value = type === 'bg' ? 60 : 120
  showColorPicker.value = !showColorPicker.value
  showEmojiPicker.value = false
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
  showColorPicker.value = false
}

function toggleBoardColorPicker() {
  colorPickerType.value = 'boardBg'
  colorPickerTop.value = 60
  showColorPicker.value = !showColorPicker.value
  showEmojiPicker.value = false
}

function closePopovers() {
  showColorPicker.value = false
  showEmojiPicker.value = false
  store.clearSelection()
}

function handleColorSelect(color) {
  if (colorPickerType.value === 'boardBg') {
    const selectedBoards = store.selectedBoards
    selectedBoards.forEach(board => {
      store.updateBoard(board.id, { bgColor: color })
    })
  } else {
    const selectedNotes = store.selectedNotes
    selectedNotes.forEach(note => {
      if (colorPickerType.value === 'bg') {
        store.updateNote(note.id, { bgColor: color })
      } else {
        store.updateNote(note.id, { textColor: color })
      }
    })
  }
  showColorPicker.value = false
}

function handleEmojiSelect(emoji) {
  const selectedBoards = store.selectedBoards
  selectedBoards.forEach(board => {
    store.updateBoard(board.id, { emoji })
  })
  showEmojiPicker.value = false
}

function alignHorizontal() {
  const selectedIds = Array.from(store.selectedItems)
  if (selectedIds.length < 2) return
  
  // Calculate average X position
  let totalX = 0
  selectedIds.forEach(id => {
    const item = store.notes[id] || store.boards[id] || store.files[id]
    if (item) totalX += item.x
  })
  const avgX = Math.round(totalX / selectedIds.length / 10) * 10
  
  // Set all items to average X
  selectedIds.forEach(id => {
    const item = store.notes[id] || store.boards[id] || store.files[id]
    if (item) {
      item.x = avgX
      const position = { x: item.x, y: item.y }
      if (item.type === 'note') store.updateNote(id, position)
      else if (item.type === 'board') store.updateBoard(id, position)
      else if (item.type === 'file') store.updateFile(id, position)
    }
  })
}

function alignVertical() {
  const selectedIds = Array.from(store.selectedItems)
  if (selectedIds.length < 2) return
  
  // Calculate average Y position
  let totalY = 0
  selectedIds.forEach(id => {
    const item = store.notes[id] || store.boards[id] || store.files[id]
    if (item) totalY += item.y
  })
  const avgY = Math.round(totalY / selectedIds.length / 10) * 10
  
  // Set all items to average Y
  selectedIds.forEach(id => {
    const item = store.notes[id] || store.boards[id] || store.files[id]
    if (item) {
      item.y = avgY
      const position = { x: item.x, y: item.y }
      if (item.type === 'note') store.updateNote(id, position)
      else if (item.type === 'board') store.updateBoard(id, position)
      else if (item.type === 'file') store.updateFile(id, position)
    }
  })
}
</script>

<style scoped>
.toolbar {
  width: 64px;
  background: white;
  border-right: 1px solid #E5E7EB;
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  position: relative;
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-button {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  border-radius: 8px;
  transition: background-color 0.2s;
  position: relative;
  color: #6B7280;
}

.toolbar-button:active {
  cursor: grabbing;
}

.toolbar-button:hover {
  background-color: #F3F4F6;
  color: #1F2937;
}

.tooltip {
  position: absolute;
  left: 100%;
  margin-left: 8px;
  background: #1F2937;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;
}

.toolbar-button:hover .tooltip {
  opacity: 1;
}

.drag-hint {
  position: absolute;
  left: 100%;
  margin-left: 8px;
  background: #6B7280;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1001;
}

.drag-hint.show {
  opacity: 1;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
  20%, 40%, 60%, 80% { transform: translateX(3px); }
}

.toolbar-button.shake {
  animation: shake 0.9s ease-in-out;
}

.popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}
</style>