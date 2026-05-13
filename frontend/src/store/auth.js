import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const authApi = axios.create({
  baseURL: '/api/auth/',
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: {
    'Content-Type': 'application/json'
  }
})

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoaded = ref(false)

  async function loadUser() {
    try {
      const response = await authApi.get('user/')
      user.value = response.data
    } catch (err) {
      user.value = null
    } finally {
      isLoaded.value = true
    }
    return user.value
  }

  async function loginWithGoogle(idToken) {
    const response = await authApi.post('google/', { id_token: idToken })
    user.value = response.data
    isLoaded.value = true
    return user.value
  }

  async function loginWithEmail(email, password) {
    const response = await authApi.post('login/', { email, password })
    user.value = response.data
    isLoaded.value = true
    return user.value
  }

  async function requestPasswordReset(email) {
    await authApi.post('password-reset/', { email })
    return true
  }

  async function confirmPasswordReset(uid, token, password) {
    await authApi.post('password-reset-confirm/', { uid, token, password })
    return true
  }

  async function logout() {
    try {
      await authApi.post('logout/')
    } catch (err) {
      console.error('Logout request failed:', err)
    }
    user.value = null
    return true
  }

  return {
    user,
    isLoaded,
    loadUser,
    loginWithGoogle,
    loginWithEmail,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
  }
})
