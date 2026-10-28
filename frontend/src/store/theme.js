import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'

const systemThemeQuery = '(prefers-color-scheme: dark)'

export const useThemeStore = defineStore('theme', () => {
  const preference = ref('light')
  const isLoaded = ref(false)
  let mediaQuery

  const resolvedTheme = computed(() => {
    if (preference.value !== 'system') {
      return preference.value
    }
    return mediaQuery?.matches ? 'dark' : 'light'
  })

  function applyTheme() {
    document.documentElement.dataset.theme = resolvedTheme.value
  }

  function handleSystemThemeChange() {
    if (preference.value === 'system') {
      applyTheme()
    }
  }

  async function load() {
    try {
      const preferences = await api.getPreferences()
      preference.value = preferences.theme || 'light'
    } catch (error) {
      console.error('Could not load theme preference:', error)
    } finally {
      isLoaded.value = true
      applyTheme()
    }
  }

  async function setPreference(theme) {
    const previousTheme = preference.value
    preference.value = theme
    applyTheme()

    try {
      const preferences = await api.updatePreferences({ theme })
      preference.value = preferences.theme
      applyTheme()
    } catch (error) {
      preference.value = previousTheme
      applyTheme()
      throw error
    }
  }

  function initialize() {
    mediaQuery = window.matchMedia(systemThemeQuery)
    mediaQuery.addEventListener?.('change', handleSystemThemeChange)
    applyTheme()
  }

  function dispose() {
    mediaQuery?.removeEventListener?.('change', handleSystemThemeChange)
  }

  return { preference, resolvedTheme, isLoaded, initialize, load, setPreference, dispose }
})