<template>
  <div
    class="note"
    :data-item-id="note.id"
    :class="{ selected, dragging: isDragging }"
    :style="{
      left: note.x + 'px',
      top: note.y + 'px',
      width: isLinkOnly ? '300px' : note.width + 'px',
      height: isLinkOnly ? '190px' : note.height + 'px',
      backgroundColor: note.bgColor,
      borderTop: '3px solid ' + (note.accentColor || '#FFFFFF'),
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
    />
    <div v-else-if="isLinkOnly" class="note-content link-preview-content">
      <a class="link-preview" :href="previewUrl" target="_blank" rel="noopener noreferrer" draggable="false" @mousedown.prevent @dragstart.prevent @click.stop="handlePreviewClick" @dblclick.stop.prevent="handlePreviewDoubleClick">
        <img v-if="linkPreview?.image && !previewImageFailed" class="link-preview-image" :src="linkPreview.image" alt="" referrerpolicy="no-referrer" @error="previewImageFailed = true">
        <div v-else class="link-preview-image-placeholder" aria-hidden="true" />
        <div class="link-preview-body">
          <div class="link-preview-domain"><img v-if="linkPreview?.favicon" :src="linkPreview.favicon" alt="">{{ previewUrl }}</div>
          <div class="link-preview-title">{{ linkPreview?.title || (previewFailed ? 'Preview unavailable' : 'Link preview loading...') }}</div>
        </div>
      </a>
    </div>
    <div v-else class="note-content" :style="{ color: note.textColor }">
      <template v-if="note.content">
        <template v-for="(part, index) in noteContentParts" :key="index">
          <a
            v-if="part.href"
            class="note-inline-link"
            :href="part.href"
            target="_blank"
            rel="noopener noreferrer"
            @mousedown.stop
            @dblclick.stop
          >{{ part.text }}</a>
          <template v-else>{{ part.text }}</template>
        </template>
      </template>
      <template v-else>Double-click to edit</template>
    </div>
    <div
      v-if="!isEditing && !isLinkOnly"
      class="resize-handle"
      @mousedown.stop="startResize"
    />
  </div>
</template>

<script setup>
import { computed, ref, nextTick, watch } from 'vue'
import { useWorkspaceStore } from '../store/workspace'
import api from '../services/api'

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
const hasDragged = ref(false)
const isResizing = ref(false)
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })
const linkPreview = ref(null)
const previewImageFailed = ref(false)
const previewFailed = ref(false)
const isLinkOnly = computed(() => /^https?:\/\/\S+$/i.test(props.note.content?.trim() || ''))
const previewUrl = computed(() => props.note.content?.trim() || '')
const noteContentParts = computed(() => {
  const content = props.note.content || ''
  const parts = []
  const urlPattern = /https?:\/\/[^\s<>"']+/gi
  let lastIndex = 0

  for (const match of content.matchAll(urlPattern)) {
    const rawUrl = match[0]
    const url = rawUrl.replace(/[.,!?;:)\]]+$/, '')
    const start = match.index

    if (start > lastIndex) parts.push({ text: content.slice(lastIndex, start) })
    if (url) parts.push({ text: url, href: url })
    if (rawUrl.length > url.length) parts.push({ text: rawUrl.slice(url.length) })
    lastIndex = start + rawUrl.length
  }

  if (lastIndex < content.length) parts.push({ text: content.slice(lastIndex) })
  return parts
})

async function loadLinkPreview(content) {
  linkPreview.value = null
  previewImageFailed.value = false
  previewFailed.value = false
  const url = content?.trim()
  if (!/^https?:\/\/\S+$/i.test(url || '')) return
  try {
    linkPreview.value = await api.getLinkPreview(url)
  } catch {
    previewFailed.value = true
  }
}

watch(() => props.note.content, loadLinkPreview, { immediate: true })

function handleMouseDown(e) {
  if (isEditing.value || isResizing.value) return
  hasDragged.value = false
  
  emit('select', e)
  
  isDragging.value = true
  emit('drag-start', e)

  const handleMouseMove = (moveEvent) => {
    if (isDragging.value) {
      if (Math.abs(moveEvent.clientX - e.clientX) > 3 || Math.abs(moveEvent.clientY - e.clientY) > 3) {
        hasDragged.value = true
      }
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

function handlePreviewClick(event) {
  event.preventDefault()
}

function handlePreviewDoubleClick(event) {
  window.open(event.currentTarget.href, '_blank', 'noopener,noreferrer')
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

.note-content:not(textarea):not(.link-preview-content) {
  white-space: pre-wrap;
}

.note-inline-link {
  color: #2563EB;
  text-decoration: underline;
  cursor: pointer;
}

.link-preview-content {
  padding: 0;
  overflow: hidden;
  border-radius: 5px 5px 8px 8px;
}

.link-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #1F2937;
  text-decoration: none;
  background: transparent;
}

.link-preview-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: 10px 12px;
  overflow: hidden;
}

.link-preview-image {
  width: 100%;
  height: 105px;
  flex-shrink: 0;
  object-fit: cover;
}

.link-preview-image-placeholder {
  width: 100%;
  height: 105px;
  flex-shrink: 0;
  background: #F3F4F6;
}

.link-preview-domain {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: #6B7280;
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.link-preview-domain img {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.link-preview-title {
  margin-top: 8px;
  overflow: hidden;
  color: #1F2937;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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