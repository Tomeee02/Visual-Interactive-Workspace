<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Sign in</h1>
      <p>Sign in with your email and password.</p>

      <form class="login-form" @submit.prevent="handleEmailLogin">
        <label>
          Email
          <input v-model="email" type="email" autocomplete="email" required>
        </label>

        <label>
          Password
          <input v-model="password" type="password" autocomplete="current-password" required>
        </label>

        <button type="submit" class="primary-button" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <button type="button" class="link-button" @click="goToForgotPassword">
        Forgot your password?
      </button>

      <div v-if="error" class="login-error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref(null)
const loading = ref(false)

async function handleEmailLogin() {
  error.value = null
  loading.value = true

  try {
    await auth.loginWithEmail(email.value, password.value)
    router.push('/board/root')
  } catch (err) {
    console.error('Email login error:', err)
    error.value = err.response?.data?.detail || 'Email sign-in failed.'
  } finally {
    loading.value = false
  }
}

function goToForgotPassword() {
  router.push({ name: 'ForgotPassword' })
}

onMounted(async () => {
  if (!auth.isLoaded) {
    await auth.loadUser()
  }

  if (auth.user) {
    router.push('/board/root')
  }
})
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
  margin-top: 8px;
}

.login-error {
  margin-top: 18px;
  color: #dc2626;
  font-size: 14px;
}
</style>
