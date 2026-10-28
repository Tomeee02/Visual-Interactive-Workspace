<template>
  <section class="template-chooser" role="dialog" aria-labelledby="template-chooser-title">
    <header class="chooser-header">
      <h2 id="template-chooser-title">Choose a template</h2>
      <button class="close-button" type="button" aria-label="Close template chooser" @click="store.dismissTemplateChooser">×</button>
    </header>

    <div class="template-list" role="radiogroup" aria-label="Board templates">
      <button
        v-for="template in visibleTemplates"
        :key="template.id"
        class="template-option"
        :class="{ selected: selectedTemplateId === template.id }"
        type="button"
        role="radio"
        :aria-checked="selectedTemplateId === template.id"
        @click="selectedTemplateId = template.id"
      >
        <span>{{ template.name }}</span>
        <small v-if="template.id === 'project'">POPULAR</small>
      </button>
    </div>

    <button class="more-button" type="button" :aria-expanded="showMoreTemplates" @click="showMoreTemplates = !showMoreTemplates">
      <span>{{ showMoreTemplates ? 'Fewer templates...' : 'More templates...' }}</span>
      <span aria-hidden="true">{{ showMoreTemplates ? '⌃' : '›' }}</span>
    </button>

    <button class="continue-button" type="button" @click="applyTemplate">Continue</button>
    <label class="example-toggle">
      <input v-model="keepExamples" type="checkbox" :disabled="selectedTemplateId === 'empty'">
      <span>Keep example content</span>
    </label>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useWorkspaceStore } from '../store/workspace'
import { BOARD_TEMPLATES } from '../boardTemplates'

const store = useWorkspaceStore()
const selectedTemplateId = ref('empty')
const keepExamples = ref(false)
const showMoreTemplates = ref(false)

const visibleTemplates = computed(() => {
  const primaryIds = ['empty', 'project', 'weekly', 'meeting', 'study']
  return BOARD_TEMPLATES.filter(template =>
    primaryIds.includes(template.id) || showMoreTemplates.value
  )
})

function applyTemplate() {
  store.applyBoardTemplate(selectedTemplateId.value, keepExamples.value)
}
</script>

<style scoped>
.template-chooser {
  position: absolute;
  z-index: 30;
  right: 20px;
  bottom: 20px;
  width: min(320px, calc(100% - 40px));
  max-height: min(560px, calc(100% - 40px));
  display: flex;
  flex-direction: column;
  padding: 18px 20px 14px;
  overflow: hidden;
  color: #F9FAFB;
  background: #303B4D;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.32);
}

.chooser-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chooser-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.close-button {
  padding: 0 2px;
  color: #CBD5E1;
  background: transparent;
  border: 0;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.template-option {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 12px;
  color: #F3F4F6;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 4px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.template-option:hover,
.template-option.selected {
  background: #4B5563;
}

.template-option small {
  padding: 2px 4px;
  color: #F9FAFB;
  background: #6B7280;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
}

.more-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 12px 12px;
  color: #CBD5E1;
  text-align: left;
  background: transparent;
  border: 0;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.more-button:hover {
  color: white;
}

.continue-button {
  min-height: 38px;
  margin-top: 2px;
  color: white;
  background: #F4511E;
  border: 0;
  border-radius: 5px;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
}

.continue-button:hover {
  background: #E84314;
}

.example-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-top: 10px;
  color: #CBD5E1;
  font-size: 12px;
  cursor: pointer;
}

.example-toggle input {
  accent-color: #F4511E;
}

.example-toggle input:disabled {
  cursor: not-allowed;
}
</style>
