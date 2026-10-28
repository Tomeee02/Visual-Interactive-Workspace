<template>
  <div class="color-picker" @click.stop @mousedown.stop>
    <div class="color-picker-header">
      {{ accentPicker ? (type === 'noteAccent' ? 'Top Strip Color' : 'Checklist Color') : ((type === 'bg' || type === 'boardBg') ? 'Background Color' : 'Text Color') }}
    </div>
    <div class="color-grid">
      <div
        v-for="color in colors"
        :key="color.value"
        class="color-option"
        :class="{ selected: selectedColor === color.value, empty: color.empty }"
        :style="{ backgroundColor: color.empty ? '#FFFFFF' : color.value }"
        :title="color.name"
        @click="selectColor(color.value)"
      />
    </div>
    <div v-if="type === 'boardBg' || accentPicker" class="custom-color-section">
      <div class="custom-color-label">Custom Color</div>
      <div class="custom-color-row">
        <input
          type="color"
          :value="customColor"
          class="custom-color-input"
          @input="handleCustomColorChange"
        />
        <div 
          class="custom-color-preview" 
          :style="{ backgroundColor: customColor }"
          @click="selectColor(customColor)"
        />
        <input
          type="text"
          :value="customColor"
          class="custom-color-hex"
          placeholder="#FFFFFF"
          @input="handleHexInput"
          @blur="applyHexInput"
          @keydown.enter="applyHexInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'bg'
  },
  currentColor: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select', 'close'])

const selectedColor = ref(props.currentColor)
const customColor = ref(normalizeCustomColor(props.currentColor))
const accentPicker = computed(() => props.type === 'checklistAccent' || props.type === 'noteAccent')

// Watch for prop changes when picker reopens
watch(() => props.currentColor, (newColor) => {
  selectedColor.value = newColor
  customColor.value = normalizeCustomColor(newColor)
})

const backgroundColors = [
  { name: 'Cream', value: '#FEF3C7' },
  { name: 'Yellow', value: '#FDE68A' },
  { name: 'Peach', value: '#FED7AA' },
  { name: 'Orange', value: '#FDBA74' },
  { name: 'Blush', value: '#FECDD3' },
  { name: 'Rose', value: '#FECACA' },
  { name: 'Pink', value: '#FBCFE8' },
  { name: 'Lavender Pink', value: '#F9A8D4' },
  { name: 'Lavender', value: '#E9D5FF' },
  { name: 'Purple', value: '#DDD6FE' },
  { name: 'Light Blue', value: '#C7D2FE' },
  { name: 'Sky', value: '#BFDBFE' },
  { name: 'Powder Blue', value: '#BAE6FD' },
  { name: 'Aqua', value: '#A5F3FC' },
  { name: 'Mint', value: '#99F6E4' },
  { name: 'Seafoam', value: '#A7F3D0' },
  { name: 'Sage', value: '#BBF7D0' },
  { name: 'Lime', value: '#D9F99D' },
  { name: 'Beige', value: '#FEF08A' },
  { name: 'Stone', value: '#E7E5E4' },
  { name: 'Pearl', value: '#F5F5F4' },
  { name: 'Silver', value: '#E5E7EB' },
  { name: 'Dove', value: '#D1D5DB' },
  { name: 'White', value: '#FFFFFF' }
]

const textColors = [
  { name: 'Black', value: '#1F2937' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Yellow', value: '#CA8A04' },
  { name: 'Green', value: '#059669' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Pink', value: '#DB2777' },
  { name: 'White', value: '#FFFFFF' }
]

const colors = computed(() => {
  if (props.type === 'bg' || props.type === 'boardBg') return backgroundColors
  if (accentPicker.value) return [{ name: 'No top strip', value: 'transparent', empty: true }, ...textColors]
  return textColors
})

function normalizeCustomColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color.toUpperCase() : '#FFFFFF'
}

function selectColor(color) {
  selectedColor.value = color
  emit('select', color)
}

function handleCustomColorChange(e) {
  const color = e.target.value
  customColor.value = color.toUpperCase()
  selectedColor.value = color.toUpperCase()
  emit('select', color.toUpperCase())
}

function handleHexInput(e) {
  let value = e.target.value.trim()
  if (!value.startsWith('#')) {
    value = '#' + value
  }
  customColor.value = value.toUpperCase()
}

function applyHexInput() {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/
  if (hexRegex.test(customColor.value)) {
    selectedColor.value = customColor.value
    emit('select', customColor.value)
  }
}
</script>

<style scoped>
.color-picker {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 1000;
}

.color-picker-header {
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #E5E7EB;
  transition: transform 0.2s, border-color 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border: 2px solid #6366F1;
}

.color-option.empty {
  position: relative;
  overflow: hidden;
}

.color-option.empty::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 4px;
  width: 24px;
  height: 2px;
  background: #DC2626;
  transform: rotate(-35deg);
  transform-origin: center;
}

.custom-color-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E5E7EB;
}

.custom-color-label {
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.custom-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-color-input {
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
}

.custom-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.custom-color-input::-webkit-color-swatch {
  border: 1px solid #E5E7EB;
  border-radius: 6px;
}

.custom-color-preview {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #E5E7EB;
  cursor: pointer;
  transition: transform 0.2s;
}

.custom-color-preview:hover {
  transform: scale(1.1);
}

.custom-color-hex {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  text-transform: uppercase;
  width: 80px;
}

.custom-color-hex:focus {
  outline: none;
  border-color: #6366F1;
}
</style>