<template>
  <div
    class="note"
    :data-item-id="note.id"
    :class="{ selected, dragging: isDragging }"
    :style="{
      left: note.x + 'px',
      top: note.y + 'px',
      width: note.width + 'px',
      height: note.height + 'px',
      backgroundColor: note.bgColor,
      color: note.textColor
    }"
    @mousedown="handleMouseDown"
    @dblclick="startEditing"
  >
    <textarea
      v-if="isEditing"
      ref="textareaRef"
      v-model="editContent"
      class="note-content"
      :style="{ color: note.textColor }"
      @blur="finishEditing"
      @keydown.enter.exact="finishEditing"
    />
    <div v-else class="note-content" :style="{ color: note.textColor }">
      {{ note.content || 'Double-click to edit' }}
    </div>
    <div
      v-if="!isEditing"
      class="resize-handle"
      @mousedown.stop="startResize"
    />
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useWorkspaceStore } from '../store/workspace'

const props = defineProps({
  note: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'drag-start', 'drag', 'drag-end'])

const store = useWorkspaceStore()
const isEditing = ref(false)
const editContent = ref('')
const textareaRef = ref(null)
const isDragging = ref(false)
const isResizing = ref(false)
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

function handleMouseDown(e) {
  if (isEditing.value || isResizing.value) return
  
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

function startEditing() {
  isEditing.value = true
  editContent.value = props.note.content
  nextTick(() => {
    textareaRef.value?.focus()
    textareaRef.value?.select()
  })
}

function finishEditing() {
  isEditing.value = false
  if (editContent.value !== props.note.content) {
    store.updateNote(props.note.id, { content: editContent.value })
  }
}

function startResize(e) {
  e.stopPropagation()
  isResizing.value = true
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: props.note.width,
    height: props.note.height
  }

  const handleMouseMove = (moveEvent) => {
    if (isResizing.value) {
      const deltaX = moveEvent.clientX - resizeStart.value.x
      const deltaY = moveEvent.clientY - resizeStart.value.y
      
      const newWidth = Math.max(150, resizeStart.value.width + deltaX)
      const newHeight = Math.max(100, resizeStart.value.height + deltaY)
      
      store.updateNote(props.note.id, {
        width: Math.round(newWidth / 10) * 10,
        height: Math.round(newHeight / 10) * 10
      })
    }
  }

  const handleMouseUp = () => {
    isResizing.value = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}
</script>

<style scoped>
.note {
  position: absolute;
  cursor: move;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  transition: box-shadow 0.2s;
  user-select: none;
}

.note:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.note.selected {
  outline: 2px solid #6366F1;
  outline-offset: 2px;
}

.note.dragging {
  opacity: 0.8;
  z-index: 100;
}

.note-content {
  width: 100%;
  height: 100%;
  padding: 12px;
  border: none;
  background: transparent;
  resize: none;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  outline: none;
  overflow: auto;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.2) 50%);
  border-bottom-right-radius: 8px;
}
</style>