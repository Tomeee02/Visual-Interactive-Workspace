<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Reset password</h1>
      <p>Choose a new password using the link you received.</p>

      <form class="login-form" @submit.prevent="resetPassword">
        <label>
          New password
          <input v-model="password" type="password" autocomplete="new-password" required>
        </label>

        <button type="submit" class="primary-button" :disabled="loading">
          {{ loading ? 'Saving...' : 'Reset password' }}
        </button>
      </form>

      <div v-if="message" class="login-success">{{ message }}</div>
      <div v-if="error" class="login-error">{{ error }}</div>

      <button type="button" class="link-button" @click="goBack">
        Back to sign in
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const password = ref('')
const loading = ref(false)
const message = ref(null)
const error = ref(null)
let uid = ''
let token = ''

onMounted(() => {
  uid = route.query.uid || ''
  token = route.query.token || ''

  if (!uid || !token) {
    error.value = 'The reset link is invalid or missing. Please request a new one.'
  }
})

async function resetPassword() {
  message.value = null
  error.value = null

  if (!uid || !token) {
    error.value = 'The reset link is invalid or missing.'
    return
  }

  loading.value = true
  try {
    await auth.confirmPasswordReset(uid, token, password.value)
    message.value = 'Password reset successfully. You can now sign in.'
    password.value = ''
  } catch (err) {
    console.error('Password reset confirm failed:', err)
    error.value = err.response?.data?.detail || 'Could not reset the password.'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'Login' })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f3f4f6;
  padding: 24px;
}

.login-card {
  width: min(420px, 100%);
  padding: 32px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.login-card h1 {
  margin-bottom: 12px;
  font-size: 28px;
  color: #111827;
}

.login-card p {
  margin-bottom: 24px;
  color: #6b7280;
}

.login-form {
  display: grid;
  gap: 16px;
  text-align: left;
}

.login-form label {
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: #374151;
}

.login-form input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
}

.primary-button,
.link-button {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 12px 18px;
  cursor: pointer;
}

.primary-button {
  background: #2563eb;
  color: white;
  font-weight: 600;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.link-button {
  background: transparent;
  color: #2563eb;
  text-decoration: underline;
  margin-top: 16px;
}

.login-success {
  margin-top: 18px;
  color: #15803d;
  font-size: 14px;
}

.login-error {
  margin-top: 18px;
  color: #dc2626;
  font-size: 14px;
}
</style>
