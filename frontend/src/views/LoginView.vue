<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Bejelentkezés</h1>
      <p>Jelentkezz be email/jelszóval vagy Google fiókkal.</p>

      <form class="login-form" @submit.prevent="handleEmailLogin">
        <label>
          Email
          <input v-model="email" type="email" autocomplete="email" required />
        </label>

        <label>
          Jelszó
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <button type="submit" class="primary-button" :disabled="loading">
          {{ loading ? 'Bejelentkezés...' : 'Bejelentkezés' }}
        </button>
      </form>

      <button type="button" class="link-button" @click="goToForgotPassword">
        Elfelejtetted a jelszavad?
      </button>

      <div class="divider"><span>vagy</span></div>

      <div id="google-button" class="google-button"></div>

      <div v-if="error" class="login-error">{{ error }}</div>
      <div v-if="!clientId" class="login-help">
        A Google kliensazonosító nincs beállítva. Add hozzá a `VITE_GOOGLE_CLIENT_ID` környezeti változót.
      </div>
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
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

async function handleEmailLogin() {
  error.value = null
  loading.value = true

  try {
    await auth.loginWithEmail(email.value, password.value)
    router.push('/board/root')
  } catch (err) {
    console.error('Email login error:', err)
    error.value = err.response?.data?.detail || 'Email bejelentkezés sikertelen.'
  } finally {
    loading.value = false
  }
}

function goToForgotPassword() {
  router.push({ name: 'ForgotPassword' })
}

function handleGoogleCredential(response) {
  console.log('Google credential response:', response)

  if (!response?.credential) {
    error.value = 'Google bejelentkezés sikertelen.'
    return
  }

  auth.loginWithGoogle(response.credential)
    .then(() => {
      router.push('/board/root')
    })
    .catch((err) => {
      console.error('Login error:', err)
      error.value = err.response?.data?.detail || 'Google bejelentkezés sikertelen.'
    })
}

function initGoogle() {
  if (!window.google?.accounts?.id) {
    error.value = 'Google SDK nem töltődött be.'
    return
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredential,
    ux_mode: 'popup',
  })

  window.google.accounts.id.renderButton(
    document.getElementById('google-button'),
    {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'signin_with',
    }
  )

  window.google.accounts.id.prompt()
}

onMounted(async () => {
  if (!auth.isLoaded) {
    await auth.loadUser()
  }

  if (auth.user) {
    router.push('/board/root')
    return
  }

  if (!clientId) {
    return
  }

  if (document.getElementById('google-sdk-script')) {
    initGoogle()
    return
  }

  const script = document.createElement('script')
  script.id = 'google-sdk-script'
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  script.onload = initGoogle
  script.onerror = () => {
    error.value = 'Google SDK nem töltődött be.'
  }

  document.head.appendChild(script)
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

.divider {
  margin: 24px 0;
  text-align: center;
  color: #6b7280;
}

.divider span {
  background: white;
  padding: 0 12px;
}

.login-error,
.login-help {
  margin-top: 18px;
  color: #dc2626;
  font-size: 14px;
}

.google-button {
  display: flex;
  justify-content: center;
}
</style>
