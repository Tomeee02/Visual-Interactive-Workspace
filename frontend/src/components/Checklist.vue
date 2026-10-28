<template>
  <div
    ref="checklistRef"
    class="checklist"
    :data-item-id="checklist.id"
    :class="{ selected, dragging: isDragging }"
    :style="{ left: checklist.x + 'px', top: checklist.y + 'px', width: checklist.width + 'px', height: checklist.height + 'px', backgroundColor: checklist.bgColor, borderTop: '3px solid ' + checklist.accentColor, color: '#000000' }"
    @mousedown="handleMouseDown"
  >
    <input
      v-if="checklist.showTitle"
      v-model="checklist.title"
      placeholder="New checklist"
      class="checklist-title"
      @mousedown.stop
      @change="saveTitle"
      @keydown.enter.prevent="$event.target.blur()"
    >
    <div v-for="(item, index) in checklist.checklistItems" :key="index" class="checklist-row">
      <input v-model="item.checked" type="checkbox" @mousedown.stop="selectChecklist" @change="saveItems">
      <input
        v-if="isEditing"
        v-model="item.text"
        class="checklist-input"
        :class="{ completed: item.checked }"
        placeholder="Add an item..."
        @mousedown.stop="selectChecklist"
        @focus="startEditing"
        @blur="handleInputBlur"
        @change="saveItems"
        @keydown.enter.prevent="addItem(index)"
        @keydown.backspace="removeEmptyItem(index)"
      >
      <span v-else class="checklist-text" :class="{ completed: item.checked }" @mousedown.stop="selectChecklist" @click="startEditing">{{ item.text || 'Add an item...' }}</span>
    </div>
    <div class="resize-handle" @mousedown.stop="startResize" />
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { useWorkspaceStore } from '../store/workspace'

const props = defineProps({ checklist: Object, selected: Boolean })
const emit = defineEmits(['select', 'drag-start', 'drag', 'drag-end'])
const store = useWorkspaceStore()
const checklistRef = ref(null)
const isDragging = ref(false)
const isResizing = ref(false)
const isEditing = ref(true)

function getRequiredHeight() {
  if (!checklistRef.value) {
    return Math.max(130, props.checklist.height)
  }

  const rows = checklistRef.value.querySelectorAll('.checklist-row')
  const title = checklistRef.value.querySelector('.checklist-title')
  const rowHeights = Array.from(rows).reduce((sum, row) => sum + row.getBoundingClientRect().height, 0)
  const gaps = Math.max(0, rows.length - 1) * 12
  const titleHeight = title ? title.getBoundingClientRect().height + 10 : 0
  const padding = 14

  return Math.max(130, titleHeight + rowHeights + gaps + padding)
}

function ensureMinimumHeight() {
  const requiredHeight = getRequiredHeight()
  const currentHeight = Number(props.checklist.height) || 0

  if (currentHeight !== requiredHeight && currentHeight < requiredHeight) {
    store.updateNote(props.checklist.id, { height: requiredHeight })
    return
  }

  if (currentHeight > requiredHeight + 8) {
    store.updateNote(props.checklist.id, { height: requiredHeight })
  }
}

watch(
  () => [props.checklist.checklistItems, props.checklist.showTitle, props.checklist.height],
  async () => {
    await nextTick()
    ensureMinimumHeight()
  },
  { deep: true, immediate: true }
)

function saveItems() {
  store.updateNote(props.checklist.id, { checklistItems: props.checklist.checklistItems })
}

function saveTitle() {
  store.updateNote(props.checklist.id, { title: props.checklist.title })
}

function startEditing() {
  isEditing.value = true
}

function selectChecklist(event) {
  emit('select', event)
}

function handleInputBlur(event) {
  if (!event.currentTarget.parentElement.parentElement.contains(event.relatedTarget)) {
    isEditing.value = false
    saveItems()
  }
}

function addItem(index) {
  isEditing.value = true
  props.checklist.checklistItems.splice(index + 1, 0, { text: '', checked: false })
  saveItems()
  nextTick(() => document.querySelectorAll('.checklist-input')[index + 1]?.focus())
}

function removeEmptyItem(index) {
  if (props.checklist.checklistItems[index].text || props.checklist.checklistItems.length === 1) return
  props.checklist.checklistItems.splice(index, 1)
  saveItems()
}

function handleMouseDown(event) {
  if (event.target.closest('input, button') || isResizing.value) return
  emit('select', event)
  isDragging.value = true
  emit('drag-start', event)
  const move = moveEvent => isDragging.value && emit('drag', moveEvent)
  const up = () => {
    if (isDragging.value) { isDragging.value = false; emit('drag-end') }
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

function startResize(event) {
  isResizing.value = true
  const start = { x: event.clientX, y: event.clientY, width: props.checklist.width, height: props.checklist.height }
  const move = moveEvent => {
    const nextHeight = Math.max(getRequiredHeight(), start.height + moveEvent.clientY - start.y)
    store.updateNote(props.checklist.id, {
      width: Math.max(180, start.width + moveEvent.clientX - start.x),
      height: nextHeight
    })
  }
  const up = () => {
    isResizing.value = false
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
</script>

<style scoped>
.checklist { position: absolute; padding: 14px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,.1); cursor: move; user-select: none; }
.checklist.selected { outline: 2px solid #6366F1; outline-offset: 2px; }
.checklist.dragging { opacity: .8; z-index: 100; }
.checklist-title { display: block; width: 100%; padding: 0; border: 0; margin: 0 0 10px; background: transparent; outline: 0; color: inherit; font: inherit; font-weight: 600; }
.checklist-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.checklist-input { flex: 1; min-width: 0; border: 0; background: transparent; outline: 0; color: inherit; font: inherit; font-size: 13px; opacity: .6; }
.checklist-text { flex: 1; min-width: 0; overflow-wrap: anywhere; cursor: text; font-size: 13px; opacity: .6; }
.checklist-input.completed { opacity: .6; }
.checklist-text.completed { opacity: .6; }
.add-item { margin-top: 6px; border: 0; background: transparent; color: #4F46E5; cursor: pointer; }
.checklist-setting { width: 48px; display: flex; align-items: center; gap: 5px; color: #4B5563; font-size: 12px; cursor: pointer; }
.resize-handle { position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 50%, rgba(0,0,0,.2) 50%); border-bottom-right-radius: 8px; }
</style>
