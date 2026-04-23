<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Google bejelentkezés</h1>
      <p>A folytatáshoz jelentkezz be Google fiókkal.</p>
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
const error = ref(null)
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

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
  if (!clientId) {
    return
  }

  if (!auth.isLoaded) {
    await auth.loadUser()
  }

  if (auth.user) {
    router.push('/board/root')
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
