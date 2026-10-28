<template>
  <div class="toolbar">
    <div class="toolbar-section">
      <template v-if="store.selectedItems.size > 1">
        <div class="alignment-tools">
          <button
            class="toolbar-button alignment-trigger"
            type="button"
            title="Arrange"
            aria-label="Arrange"
            :aria-expanded="showAlignmentMenu"
            @click="toggleAlignmentMenu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
            <span class="tooltip">Arrange</span>
          </button>
          <div v-if="showAlignmentMenu" class="alignment-popover" role="group" aria-label="Alignment">
            <button class="toolbar-button alignment-option" type="button" title="Align Left" aria-label="Align Left" @click="alignItems('left')">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3v18"/><rect x="4" y="5" width="8" height="5" rx="1"/><rect x="4" y="14" width="14" height="5" rx="1"/></svg>
            </button>
            <button class="toolbar-button alignment-option" type="button" title="Align Horizontal Center" aria-label="Align Horizontal Center" @click="alignItems('centerX')">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18"/><rect x="8" y="5" width="8" height="5" rx="1"/><rect x="5" y="14" width="14" height="5" rx="1"/></svg>
            </button>
            <button class="toolbar-button alignment-option" type="button" title="Align Right" aria-label="Align Right" @click="alignItems('right')">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 3v18"/><rect x="12" y="5" width="8" height="5" rx="1"/><rect x="6" y="14" width="14" height="5" rx="1"/></svg>
            </button>
            <button class="toolbar-button alignment-option" type="button" title="Align Top" aria-label="Align Top" @click="alignItems('top')">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h18"/><rect x="5" y="4" width="5" height="8" rx="1"/><rect x="14" y="4" width="5" height="14" rx="1"/></svg>
            </button>
            <button class="toolbar-button alignment-option" type="button" title="Align Vertical Center" aria-label="Align Vertical Center" @click="alignItems('centerY')">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18"/><rect x="5" y="8" width="5" height="8" rx="1"/><rect x="14" y="5" width="5" height="14" rx="1"/></svg>
            </button>
            <button class="toolbar-button alignment-option" type="button" title="Align Bottom" aria-label="Align Bottom" @click="alignItems('bottom')">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18"/><rect x="5" y="12" width="5" height="8" rx="1"/><rect x="14" y="6" width="5" height="14" rx="1"/></svg>
            </button>
          </div>
        </div>
        <div v-if="store.selectedItems.size >= 3" class="alignment-tools">
          <button
            class="toolbar-button alignment-trigger"
            type="button"
            title="Distribute"
            aria-label="Distribute"
            :aria-expanded="showDistributionMenu"
            @click="toggleDistributionMenu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="5" height="5" rx="1" />
              <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
              <rect x="16" y="15" width="5" height="5" rx="1" />
            </svg>
            <span class="tooltip">Distribute</span>
          </button>
          <div v-if="showDistributionMenu" class="alignment-popover distribution-popover" role="group" aria-label="Distribution">
            <button class="toolbar-button alignment-option" type="button" title="Distribute Vertically" aria-label="Distribute Vertically" @click="distributeItems('vertical')">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="3" width="12" height="4" rx="1"/><rect x="6" y="10" width="12" height="4" rx="1"/><rect x="6" y="17" width="12" height="4" rx="1"/></svg>
            </button>
            <button class="toolbar-button alignment-option" type="button" title="Distribute Horizontally" aria-label="Distribute Horizontally" @click="distributeItems('horizontal')">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="4" height="12" rx="1"/><rect x="10" y="6" width="4" height="12" rx="1"/><rect x="17" y="6" width="4" height="12" rx="1"/></svg>
            </button>
          </div>
        </div>
      </template>
      <template v-else>
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
            <path d="M9 9h6M9 15h6M9 9v6M15 9v6" stroke-width="1.4"></path>
            <circle cx="12" cy="12" r="1.4" stroke-width="1.4"></circle>
            <path d="m9.8 9.8 1.6 1.6m0-1.6-1.6 1.6M13.8 13.8l1.6 1.6m0-1.6-1.6 1.6" stroke-width="1.2"></path>
          </svg>
          <span class="tooltip">Create Board</span>
          <span class="drag-hint" :class="{ 'show': shakeBoard }">Drag me!</span>
        </div>
        <div class="toolbar-button" :class="{ 'shake': shakeChecklist }" @click="handleChecklistClick" title="Create Checklist" draggable="true" @dragstart="handleDragStartChecklist">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="4" height="4" rx="1"/><path d="M10 6h11"/><rect x="3" y="10" width="4" height="4" rx="1"/><path d="M10 12h11"/><rect x="3" y="16" width="4" height="4" rx="1"/><path d="M10 18h11"/>
          </svg>
          <span class="tooltip">Create Checklist</span>
          <span class="drag-hint" :class="{ 'show': shakeChecklist }">Drag me!</span>
        </div>
        <div class="toolbar-button" :class="{ 'shake': shakeTable }" @click="handleTableClick" title="Create Table" draggable="true" @dragstart="handleDragStartTable">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="4" fill="#E5E7EB" stroke="none"/>
            <rect x="3" y="4" width="18" height="16" rx="1"/>
            <path d="M3 8h18M3 12h18M3 16h18M9 4v16M15 4v16"/>
          </svg>
          <span class="tooltip">Create Table</span>
          <span class="drag-hint" :class="{ 'show': shakeTable }">Drag me!</span>
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
        <div v-if="!selectedChecklist && store.selectedItems.size !== 2" class="toolbar-button" @click="toggleColorPicker('bg')" title="Background Color">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
          <span class="tooltip">Background Color</span>
        </div>
        <div v-if="selectedChecklist || selectedPlainNotes.length > 0" class="toolbar-button" @click="toggleColorPicker(selectedChecklist ? 'checklistAccent' : 'noteAccent')" :title="selectedChecklist ? 'Checklist Color' : 'Top Strip Color'">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="5" width="16" height="14" rx="2"></rect>
            <path d="M4 9h16" stroke-width="3"></path>
          </svg>
          <span class="tooltip">{{ selectedChecklist ? 'Checklist Color' : 'Top Strip Color' }}</span>
        </div>
        <div v-if="!selectedChecklist" class="toolbar-button" @click="toggleColorPicker('text')" title="Text Color">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 7 4 4 20 4 20 7"></polyline>
            <line x1="9" y1="20" x2="15" y2="20"></line>
            <line x1="12" y1="4" x2="12" y2="20"></line>
          </svg>
          <span class="tooltip">Text Color</span>
        </div>
      </template>

      <label v-if="selectedChecklist" class="toolbar-button checklist-setting" :class="{ active: selectedChecklist.showTitle }" title="Title">
        <input
          type="checkbox"
          class="checklist-title-toggle"
          :checked="selectedChecklist.showTitle"
          @change="toggleChecklistTitle"
        >
        <svg class="checklist-title-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14.5A2.5 2.5 0 0 0 17.5 15H4z" />
          <path d="M4 5.5V19a2 2 0 0 0 2 2h11.5A2.5 2.5 0 0 0 20 18.5V17" />
          <path d="M8 7h8M8 10h6" />
        </svg>
      </label>

      <!-- Boards selected - emoji picker -->
      <template v-if="store.selectedBoards.length > 0">
        <div v-if="store.selectedItems.size !== 2" class="toolbar-button" @click="toggleBoardColorPicker" title="Background Color">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :fill="store.selectedBoards[0]?.bgColor || '#F3F4F6'" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
          <span class="tooltip">Background Color</span>
        </div>
        <div v-if="store.selectedItems.size !== 2" class="toolbar-button" @click="toggleEmojiPicker" title="Change Emoji">
          <span :style="{ fontSize: '24px', filter: store.selectedBoards[0]?.emojiGrayscale ? 'grayscale(1)' : 'none' }">{{ store.selectedBoards[0]?.emoji || '📋' }}</span>
          <span class="tooltip">Change Emoji</span>
        </div>
      </template>

      <label
        v-if="selectedPreviewFile"
        class="toolbar-button preview-setting"
        :class="{ active: selectedPreviewFile.showPreview !== false }"
        title="Preview"
      >
        <input
          type="checkbox"
          class="preview-toggle"
          aria-label="Preview"
          :checked="selectedPreviewFile.showPreview !== false"
          @change="toggleFilePreview"
        >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        <span class="tooltip">Preview</span>
      </label>

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
const showAlignmentMenu = ref(false)
const showDistributionMenu = ref(false)
const fileInputRef = ref(null)
const noteButtonRef = ref(null)
const boardButtonRef = ref(null)
const shakeNote = ref(false)
const shakeBoard = ref(false)
const shakeChecklist = ref(false)
const shakeTable = ref(false)

const selectedChecklist = computed(() => {
  if (store.selectedItems.size !== 1) return null
  const item = store.selectedNotes[0]
  return item?.itemType === 'checklist' ? item : null
})

const selectedPlainNotes = computed(() => {
  return store.selectedNotes.filter(note => !note.itemType || note.itemType === 'note')
})

const selectedPreviewFile = computed(() => {
  if (store.selectedItems.size !== 1) return null
  const file = store.selectedFiles[0]
  if (!file) return null
  const extension = file.filename?.split('.').pop()?.toLowerCase()
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'avif'].includes(extension)
  const isDocument = ['pdf', 'doc', 'docx'].includes(extension)
  return isDocument || isImage || file.thumbnailUrl ? file : null
})

const currentPickerColor = computed(() => {
  if (colorPickerType.value === 'boardBg') {
    return store.selectedBoards[0]?.bgColor || '#F3F4F6'
  } else if (colorPickerType.value === 'bg') {
    return store.selectedNotes[0]?.bgColor || '#FEF3C7'
  } else if (colorPickerType.value === 'checklistAccent') {
    return selectedChecklist.value?.accentColor || '#FFFFFF'
  } else if (colorPickerType.value === 'noteAccent') {
    return selectedPlainNotes.value[0]?.accentColor || '#FFFFFF'
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

function handleChecklistClick() {
  shakeChecklist.value = true
  setTimeout(() => {
    shakeChecklist.value = false
  }, 2500)
}

function handleTableClick() {
  shakeTable.value = true
  setTimeout(() => {
    shakeTable.value = false
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

function createChecklist() {
  const canvas = document.querySelector('.canvas-container')
  const rect = canvas.getBoundingClientRect()
  const x = Math.round((rect.width / 2 - 100) / 10) * 10
  const y = Math.round((rect.height / 2 - 95) / 10) * 10
  store.createChecklist(x, y)
}

function handleDragStartNote(e) {
  e.dataTransfer.setData('application/x-create-item', 'note')
  e.dataTransfer.effectAllowed = 'copy'
}

function handleDragStartBoard(e) {
  e.dataTransfer.setData('application/x-create-item', 'board')
  e.dataTransfer.effectAllowed = 'copy'
}

function handleDragStartChecklist(e) {
  e.dataTransfer.setData('application/x-create-item', 'checklist')
  e.dataTransfer.effectAllowed = 'copy'
}

function handleDragStartTable(e) {
  e.dataTransfer.setData('application/x-create-item', 'table')
  e.dataTransfer.setData('text/plain', 'table')
  e.dataTransfer.effectAllowed = 'copy'
}

function createTable() {
  const canvas = document.querySelector('.canvas-container')
  const rect = canvas.getBoundingClientRect()
  const x = Math.round((rect.width / 2 - 150) / 10) * 10
  const y = Math.round((rect.height / 2 - 105) / 10) * 10
  store.createTable(x, y)
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
  const pickerType = type
  colorPickerType.value = pickerType
  colorPickerTop.value = pickerType === 'text' ? 164 : (pickerType === 'noteAccent' ? 112 : 60)
  showColorPicker.value = !showColorPicker.value
  showEmojiPicker.value = false
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
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
      if (colorPickerType.value === 'checklistAccent') {
        store.updateNote(note.id, { accentColor: color })
      } else if (colorPickerType.value === 'noteAccent' && (!note.itemType || note.itemType === 'note')) {
        store.updateNote(note.id, { accentColor: color })
      } else if (colorPickerType.value === 'bg' && note.itemType !== 'checklist') {
        store.updateNote(note.id, { bgColor: color })
      } else if (colorPickerType.value === 'text' && note.itemType !== 'checklist') {
        store.updateNote(note.id, { textColor: color })
      }
    })
  }
}

function toggleChecklistTitle(event) {
  if (selectedChecklist.value) {
    store.updateNote(selectedChecklist.value.id, { showTitle: event.target.checked })
  }
}

function toggleFilePreview(event) {
  if (selectedPreviewFile.value) {
    store.updateFile(selectedPreviewFile.value.id, { showPreview: event.target.checked })
  }
}

function handleEmojiSelect(emoji) {
  const selectedBoards = store.selectedBoards
  selectedBoards.forEach(board => {
    store.updateBoard(board.id, { emoji })
  })
  showEmojiPicker.value = false
}

function toggleAlignmentMenu() {
  showAlignmentMenu.value = !showAlignmentMenu.value
  showDistributionMenu.value = false
}

function toggleDistributionMenu() {
  showDistributionMenu.value = !showDistributionMenu.value
  showAlignmentMenu.value = false
}

function alignHorizontal() {
  alignItems('centerX')
}

function alignVertical() {
  alignItems('centerY')
}

function alignItems(alignment) {
  const items = getSelectedItemsWithBounds()
  if (items.length < 2) return
  const undoSnapshot = store.captureUndoSnapshot(items.map(({ id }) => id))

  const left = Math.min(...items.map(({ item }) => item.x))
  const top = Math.min(...items.map(({ item }) => item.y))
  const right = Math.max(...items.map(({ item, width }) => item.x + width))
  const bottom = Math.max(...items.map(({ item, height }) => item.y + height))
  const targets = {
    left,
    centerX: (left + right) / 2,
    right,
    top,
    centerY: (top + bottom) / 2,
    bottom
  }

  items.forEach(({ id, item, width, height }) => {
    if (alignment === 'left' || alignment === 'centerX' || alignment === 'right') {
      const offset = alignment === 'centerX' ? width / 2 : alignment === 'right' ? width : 0
      item.x = Math.round(targets[alignment] - offset)
    } else {
      const offset = alignment === 'centerY' ? height / 2 : alignment === 'bottom' ? height : 0
      item.y = Math.round(targets[alignment] - offset)
    }

    saveItemPosition(id, item)
  })
  store.commitUndoSnapshot(undoSnapshot)
  showAlignmentMenu.value = false
}

function distributeItems(axis) {
  const items = getSelectedItemsWithBounds()
  if (items.length < 3) return
  const undoSnapshot = store.captureUndoSnapshot(items.map(({ id }) => id))

  const isHorizontal = axis === 'horizontal'
  const getStart = ({ item }) => isHorizontal ? item.x : item.y
  const getSize = ({ width, height }) => isHorizontal ? width : height
  items.sort((first, second) => getStart(first) - getStart(second))

  const firstStart = getStart(items[0])
  const lastItem = items[items.length - 1]
  const lastEnd = getStart(lastItem) + getSize(lastItem)
  const occupiedSize = items.reduce((total, item) => total + getSize(item), 0)
  const gap = (lastEnd - firstStart - occupiedSize) / (items.length - 1)
  let nextStart = firstStart

  items.forEach(({ id, item, width, height }) => {
    if (isHorizontal) item.x = Math.round(nextStart)
    else item.y = Math.round(nextStart)
    nextStart += getSize({ width, height }) + gap
    saveItemPosition(id, item)
  })
  store.commitUndoSnapshot(undoSnapshot)
  showDistributionMenu.value = false
}

function getSelectedItemsWithBounds() {
  const selectedIds = Array.from(store.selectedItems)
  const elements = new Map(
    Array.from(document.querySelectorAll('[data-item-id]'))
      .map(element => [element.dataset.itemId, element])
  )
  const items = selectedIds.map(id => {
    const item = store.notes[id] || store.boards[id] || store.files[id]
    const element = elements.get(id)
    if (!item || !element) return null
    return {
      id,
      item,
      width: element.offsetWidth,
      height: element.offsetHeight
    }
  }).filter(Boolean)
  return items
}

function saveItemPosition(id, item) {
  const position = { x: item.x, y: item.y }
  if (item.type === 'note') store.updateNote(id, position)
  else if (item.type === 'board') store.updateBoard(id, position)
  else if (item.type === 'file') store.updateFile(id, position)
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

.alignment-tools {
  position: relative;
}

.alignment-popover {
  position: absolute;
  z-index: 20;
  top: 0;
  left: 56px;
  display: grid;
  grid-template-columns: repeat(3, 48px);
  gap: 4px;
  padding: 6px;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
}

.distribution-popover {
  grid-template-columns: repeat(2, 48px);
}

.alignment-option {
  cursor: pointer;
}

.alignment-trigger {
  cursor: pointer;
}

.alignment-trigger:active {
  cursor: pointer;
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

.checklist-setting {
  position: relative;
  cursor: pointer;
}

.checklist-setting.active {
  background-color: #F3F4F6;
  color: #6B7280;
  outline: 2px solid #9CA3AF;
  outline-offset: 1px;
}

.checklist-title-toggle {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
}

.checklist-title-icon {
  pointer-events: none;
}

.preview-setting {
  cursor: pointer;
}

.preview-setting.active {
  background-color: #F3F4F6;
  color: #1F2937;
  outline: 2px solid #9CA3AF;
  outline-offset: 1px;
}

.preview-toggle {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
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