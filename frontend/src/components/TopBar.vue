<template>
  <div class="top-bar">
    <div class="breadcrumbs">
      <div 
        v-for="(crumb, index) in store.breadcrumbs" 
        :key="crumb.id"
        class="breadcrumb-item"
        @click="navigateToBoard(crumb.id)"
      >
        <span class="breadcrumb-emoji">{{ crumb.emoji }}</span>
        <span class="breadcrumb-title">{{ crumb.title }}</span>
        <span v-if="index < store.breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
      </div>
    </div>
    <div class="top-bar-actions">
      <div v-if="auth.user" class="user-status">
        <span>{{ auth.user.email }}</span>
        <button class="logout-button" @click="logout">Kilépés</button>
      </div>
      <button class="icon-button" title="Settings">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6m0-18a9 9 0 0 1 9 9m-9-9a9 9 0 0 0-9 9m9 9a9 9 0 0 1-9-9m9 9a9 9 0 0 0 9-9"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '../store/workspace'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const store = useWorkspaceStore()
const auth = useAuthStore()

function navigateToBoard(boardId) {
  router.push(`/board/${boardId}`)
}

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.top-bar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #E5E7EB;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.breadcrumb-item:hover {
  background-color: #F3F4F6;
}

.breadcrumb-emoji {
  font-size: 18px;
}

.breadcrumb-title {
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
}

.breadcrumb-separator {
  color: #9CA3AF;
  margin: 0 4px;
}

.top-bar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4b5563;
  font-size: 13px;
}

.logout-button {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: transparent;
  color: #111827;
  padding: 6px 10px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.logout-button:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.icon-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6B7280;
  transition: background-color 0.2s, color 0.2s;
}

.icon-button:hover {
  background-color: #F3F4F6;
  color: #1F2937;
}
</style>