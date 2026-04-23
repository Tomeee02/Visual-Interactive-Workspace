<template>
  <div
    class="board-card"
    :data-item-id="board.id"
    :class="{ dragging: isDragging, 'drop-target': dropTarget }"
    :style="{
      left: board.x + 'px',
      top: board.y + 'px'
    }"
    @mousedown="handleMouseDown"
    @dblclick="handleDoubleClick"
  >
    <div class="board-icon-square" :class="{ selected }" :style="{ backgroundColor: board.bgColor || '#F3F4F6' }">
      <div class="board-emoji" :class="{ grayscale: board.emojiGrayscale }">{{ board.emoji }}</div>
    </div>
    <input
      v-if="isEditingTitle"
      ref="titleInputRef"
      v-model="editTitle"
      class="board-title-input"
      @blur="finishEditingTitle"
      @keydown.enter="finishEditingTitle"
    />
    <div v-else class="board-title">{{ board.title }}</div>
    <div class="board-stats">
      <template v-for="(stat, index) in stats" :key="index">
        <span>{{ stat }}</span>
        <span v-if="index < stats.length - 1" class="separator">•</span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useWorkspaceStore } from '../store/workspace'

const props = defineProps({
  board: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  dropTarget: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'drag-start', 'drag', 'drag-end', 'open'])

const store = useWorkspaceStore()
const isDragging = ref(false)
const isEditingTitle = ref(false)
const editTitle = ref('')
const titleInputRef = ref(null)

const boardCount = computed(() => {
  // Use backend-provided count if available, otherwise compute from loaded items
  if (props.board.boardCount !== undefined) return props.board.boardCount
  if (!props.board.items) return 0
  return props.board.items.filter(id => store.boards[id]).length
})

const cardCount = computed(() => {
  // Use backend-provided count if available, otherwise compute from loaded items
  if (props.board.noteCount !== undefined) return props.board.noteCount
  if (!props.board.items) return 0
  return props.board.items.filter(id => store.notes[id]).length
})

const fileCount = computed(() => {
  // Use backend-provided count if available, otherwise compute from loaded items
  if (props.board.fileCount !== undefined) return props.board.fileCount
  if (!props.board.items) return 0
  return props.board.items.filter(id => store.files[id]).length
})

const formatCount = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`

const stats = computed(() => {
  const items = []
  if (boardCount.value > 0) items.push(formatCount(boardCount.value, 'board', 'boards'))
  if (cardCount.value > 0) items.push(formatCount(cardCount.value, 'card', 'cards'))
  if (fileCount.value > 0) items.push(formatCount(fileCount.value, 'file', 'files'))
  return items
})

function handleMouseDown(e) {
  if (isEditingTitle.value) return
  
  emit('select', e)
  
  isDragging.value = true
  emit('drag-start', e)

  const handleMouseMove = (moveEvent) => {
    if (isDragging.value) {
      emit('drag', moveEvent)
    }
  }

  const handleMouseUp = () => {
    if (isDragging.value) {
      isDragging.value = false
      emit('drag-end')
    }
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

function handleDoubleClick(e) {
  // Check if double-clicking on title
  if (e.target.classList.contains('board-title')) {
    startEditingTitle()
  } else {
    emit('open')
  }
}

function startEditingTitle() {
  isEditingTitle.value = true
  editTitle.value = props.board.title
  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

function finishEditingTitle() {
  isEditingTitle.value = false
  if (editTitle.value && editTitle.value !== props.board.title) {
    store.updateBoard(props.board.id, { title: editTitle.value })
  }
}
</script>

<style scoped>
.board-card {
  position: absolute;
  width: 140px;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: none;
}

.board-card.dragging {
  opacity: 0.8;
  z-index: 100;
}

.board-card.drop-target {
  outline: 2px dashed #10B981;
  outline-offset: 4px;
  transform: scale(1.05);
  transition: transform 0.15s ease, outline 0.15s ease;
}

.board-card.drop-target .board-icon-square {
  background: #D1FAE5;
  border-color: #10B981;
}

.board-icon-square {
  width: 70px;
  height: 70px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
}

.board-icon-square:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.board-icon-square.selected {
  outline: 2px solid #6366F1;
  outline-offset: 2px;
}

.board-emoji {
  font-size: 32px;
  line-height: 1;
  margin-top: 4px;
  transition: filter 0.2s;
}

.board-emoji.grayscale {
  filter: grayscale(1);
}

.board-title {
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 1px;
  word-break: break-word;
  cursor: text;
  width: 100%;
}

.board-title-input {
  width: 100%;
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 1px;
  border: 1px solid #6366F1;
  border-radius: 4px;
  padding: 4px;
  outline: none;
  font-family: 'Inter', sans-serif;
  text-align: center;
  background: white;
}

.board-stats {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #9CA3AF;
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
}

.board-stats span {
  white-space: nowrap;
}

.board-stats .separator {
  color: #D1D5DB;
}
</style>