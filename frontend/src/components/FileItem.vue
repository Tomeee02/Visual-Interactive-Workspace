<template>
  <div
    v-if="file"
    class="file-card"
    :data-item-id="file.id"
    :class="{
      selected,
      dragging: isDragging,
      'has-thumbnail': !!file.thumbnailUrl || (isImage && file.fileUrl),
      'upload-error': file.uploadError
    }"
    :style="{
      left: file.x + 'px',
      top: file.y + 'px'
    }"
    @mousedown.stop="handleMouseDown"
  >
    <!-- Image preview (for image files) -->
    <div v-if="isImage && file.fileUrl" class="image-preview-container">
      <img
        :src="file.fileUrl"
        :alt="file.filename"
        class="image-preview"
        loading="lazy"
        draggable="false"
        @dragstart.prevent
      />
    </div>

    <!-- Thumbnail preview (for PDF/DOCX) -->
    <div v-else-if="file.thumbnailUrl" class="thumbnail-container">
      <img
        :src="file.thumbnailUrl"
        :alt="file.filename"
        class="thumbnail-image"
        loading="lazy"
        draggable="false"
        @dragstart.prevent
      />
      <div class="thumbnail-badge">
        <span class="badge-ext" :style="{ color: iconColor }">{{ fileExtension.toUpperCase() }}</span>
      </div>
      <!-- File info bar for thumbnail files -->
      <div class="file-info-bar">
        <div class="file-info-text">
          <div class="file-info-name" :title="file.filename">{{ truncatedName }}</div>
          <div class="file-info-size">{{ formattedSize }}</div>
        </div>
        <div class="file-info-actions">
          <a
            v-if="file.fileUrl"
            class="file-action-btn"
            :href="file.fileUrl"
            target="_blank"
            @mousedown.stop
            title="Megnyitás"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <button
            v-if="file.fileUrl"
            class="file-action-btn"
            @click.stop="handleDownload"
            @mousedown.stop
            title="Letöltés"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Default file icon (for other file types or while uploading) -->
    <div v-else class="file-icon-container">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        :stroke="file.uploadError ? '#E53E3E' : iconColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <text
          v-if="fileExtension"
          x="12"
          y="17"
          text-anchor="middle"
          :fill="file.uploadError ? '#E53E3E' : iconColor"
          font-size="5"
          font-weight="600"
          stroke="none"
        >{{ fileExtension.toUpperCase() }}</text>
      </svg>
      <!-- Upload spinner overlay -->
      <div v-if="file.uploading" class="upload-spinner">
        <div class="spinner"></div>
      </div>
      <!-- Error icon overlay -->
      <div v-if="file.uploadError" class="upload-error-icon" title="Upload failed">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E53E3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
    </div>

    <!-- File name and size for non-thumbnail, non-image files (icon files only) -->
    <template v-if="!file.thumbnailUrl && !isImage">
      <div class="file-name" :title="file.filename">{{ truncatedName }}</div>
      <div v-if="file.uploadError" class="file-error-text">Upload failed</div>
      <div v-else class="file-size">{{ formattedSize }}</div>
    </template>

    <!-- Download button for non-thumbnail files (icons only, not images) -->
    <button
      v-if="file.fileUrl && !file.thumbnailUrl && !isImage"
      class="file-download"
      @click.stop="handleDownload"
      @mousedown.stop
      title="Download"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'drag-start', 'drag', 'drag-end'])

const isDragging = ref(false)

const fileExtension = computed(() => {
  if (!props.file?.filename) return ''
  const parts = props.file.filename.split('.')
  return parts.length > 1 ? parts.pop() : ''
})

const isImage = computed(() => {
  const ext = fileExtension.value.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'avif'].includes(ext)
})

const iconColor = computed(() => {
  const ext = fileExtension.value.toLowerCase()
  const colorMap = {
    pdf: '#E53E3E',
    doc: '#3182CE', docx: '#3182CE',
    xls: '#38A169', xlsx: '#38A169', csv: '#38A169',
    ppt: '#DD6B20', pptx: '#DD6B20',
    jpg: '#805AD5', jpeg: '#805AD5', png: '#805AD5', gif: '#805AD5', svg: '#805AD5', webp: '#805AD5',
    mp3: '#D53F8C', wav: '#D53F8C', ogg: '#D53F8C',
    mp4: '#E53E3E', avi: '#E53E3E', mov: '#E53E3E', webm: '#E53E3E',
    zip: '#718096', rar: '#718096', '7z': '#718096', tar: '#718096', gz: '#718096',
    js: '#ECC94B', ts: '#3182CE', py: '#38A169', html: '#DD6B20', css: '#805AD5',
    json: '#718096', xml: '#718096', md: '#718096', txt: '#718096'
  }
  return colorMap[ext] || '#6B7280'
})

const truncatedName = computed(() => {
  if (!props.file?.filename) return ''
  const name = props.file.filename
  if (name.length <= 20) return name
  const ext = fileExtension.value
  const baseName = name.slice(0, name.length - ext.length - 1)
  if (baseName.length > 14) {
    return baseName.slice(0, 12) + '….' + ext
  }
  return name
})

const formattedSize = computed(() => {
  const bytes = props.file?.fileSize || 0
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
})

async function handleDownload() {
  if (!props.file?.fileUrl) return
  
  try {
    const response = await fetch(props.file.fileUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.file.filename || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
    // Fallback: open in new tab
    window.open(props.file.fileUrl, '_blank')
  }
}

function handleMouseDown(e) {
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
</script>

<style scoped>
.file-card {
  position: absolute;
  width: 120px;
  cursor: pointer;
  background: transparent;
  border: 2px solid transparent;
  padding: 0 0 2px 0;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: none;
  border-radius: 8px;
  transition: background-color 0.15s, border-color 0.15s;
}

.file-card.has-thumbnail {
  width: 280px;
  padding: 0;
}

.file-card:hover {
  background: rgba(0, 0, 0, 0.04);
}

.file-card.selected {
  background: rgba(99, 102, 241, 0.08);
  border-color: transparent;
  outline: 2px solid #6366F1;
  outline-offset: -2px;
}

.file-card.upload-error {
  opacity: 0.7;
}

.file-card.dragging {
  opacity: 0.8;
  z-index: 100;
}

/* Image preview styles */
.image-preview-container {
  position: relative;
  width: 100%;
  max-height: 360px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06);
  background: #fff;
}

.image-preview {
  width: 100%;
  height: auto;
  max-height: 360px;
  object-fit: contain;
  display: block;
}

/* Thumbnail styles */
.thumbnail-container {
  position: relative;
  width: 100%;
  height: 410px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06);
  background: #fff;
}

.thumbnail-image {
  width: 100%;
  height: calc(100% - 50px);
  object-fit: cover;
  object-position: top;
  display: block;
}

.thumbnail-badge {
  position: absolute;
  bottom: 54px;
  right: 4px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 4px;
  padding: 1px 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.badge-ext {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* Default icon styles */
.file-icon-container {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

/* Upload spinner */
.upload-spinner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #E5E7EB;
  border-top-color: #6366F1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error icon */
.upload-error-icon {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-name {
  font-size: 12px;
  font-weight: 500;
  color: #1F2937;
  word-break: break-word;
  width: 100%;
  line-height: 1.3;
}

.file-size {
  font-size: 10px;
  color: #9CA3AF;
  margin-top: 1px;
}

.file-error-text {
  font-size: 10px;
  color: #E53E3E;
  margin-top: 1px;
}

.file-download {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #9CA3AF;
  opacity: 0;
  transition: opacity 0.15s, background-color 0.15s, color 0.15s;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  cursor: pointer;
  padding: 0;
}

.file-card:hover .file-download {
  opacity: 1;
}

.file-download:hover {
  background: rgba(255, 255, 255, 0.95);
  color: #4B5563;
}

/* File info bar for thumbnail files */
.file-info-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.05);
}

.file-info-text {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.file-info-name {
  font-size: 12px;
  font-weight: 500;
  color: #1F2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.file-info-size {
  font-size: 10px;
  color: #9CA3AF;
  margin-top: 1px;
}

.file-info-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  flex-shrink: 0;
}

.file-action-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #6B7280;
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.file-action-btn:hover {
  background: #F3F4F6;
  color: #1F2937;
}
</style>