<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Elfelejtett jelszó</h1>
      <p>Írd be az email címed, és küldünk egy visszaállító linket.</p>

      <form class="login-form" @submit.prevent="sendResetLink">
        <label>
          Email
          <input v-model="email" type="email" autocomplete="email" required />
        </label>

        <button type="submit" class="primary-button" :disabled="loading">
          {{ loading ? 'Küldés...' : 'Visszaállító link küldése' }}
        </button>
      </form>

      <div v-if="message" class="login-success">{{ message }}</div>
      <div v-if="error" class="login-error">{{ error }}</div>

      <button type="button" class="link-button" @click="goBack">
        Vissza a bejelentkezéshez
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const loading = ref(false)
const message = ref(null)
const error = ref(null)

async function sendResetLink() {
  message.value = null
  error.value = null
  loading.value = true

  try {
    await auth.requestPasswordReset(email.value)
    message.value = 'Ha van ilyen felhasználó, küldtünk egy visszaállító linket az email címedre.'
  } catch (err) {
    console.error('Password reset request failed:', err)
    error.value = err.response?.data?.detail || 'A visszaállító link küldése sikertelen volt.'
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
