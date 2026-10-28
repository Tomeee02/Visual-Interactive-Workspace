<template>
  <div class="top-bar" :class="{ 'planner-top-bar': route.name === 'Planner' }">
    <div v-if="pageTitle" class="page-title">{{ pageTitle }}</div>
    <div v-else class="breadcrumbs">
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
    <div v-if="route.name === 'Planner'" class="planner-header-switcher" aria-label="Planner view">
      <button type="button" :class="{ active: plannerView === 'personal' }" :aria-pressed="plannerView === 'personal'" @click="emit('update:plannerView', 'personal')">Personal</button>
      <button type="button" :class="{ active: plannerView === 'work' }" :aria-pressed="plannerView === 'work'" @click="emit('update:plannerView', 'work')">Work</button>
    </div>
    <div v-if="auth.user" class="top-bar-actions">
      <button v-if="route.name === 'Planner'" class="nav-icon" title="Planner settings" aria-label="Planner settings" @click="router.push('/planner/settings')">
        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <button v-if="route.name === 'PlannerSettings'" class="nav-icon" title="Planner" aria-label="Planner" @click="router.push('/planner')">
        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
        </svg>
      </button>
      <BoardSearch v-if="route.name === 'Board'" @open="closeProfileMenu" />
      <button v-else-if="!['Planner', 'PlannerSettings'].includes(route.name)" class="nav-icon" :class="{ active: route.name === 'Vault' }" title="Vault" aria-label="Vault" @click="router.push('/vault')">
        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </button>
      <button class="profile-button" title="Profile menu" @click.stop="toggleProfileMenu">
        <span class="profile-avatar">{{ profileInitial }}</span>
        <span class="profile-email">{{ auth.user.email }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div v-if="profileMenuOpen" class="profile-menu" @click.stop>
        <button class="profile-menu-item" @click="goToBoards">Boards</button>
        <button class="profile-menu-item" @click="goToPlanner">Planner</button>
        <button class="profile-menu-item" @click="goToVault">Vault</button>
        <button class="profile-menu-item" @click="goToSettings">Settings</button>
        <button class="profile-menu-item danger" @click="logout">Log out</button>
      </div>
      <!-- Profile menu is anchored to the top-right action area. -->
    </div>
    <div v-else class="top-bar-actions">
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspaceStore } from '../store/workspace'
import { useAuthStore } from '../store/auth'
import BoardSearch from './BoardSearch.vue'

const router = useRouter()
const route = useRoute()
const store = useWorkspaceStore()
const auth = useAuthStore()
defineProps({ plannerView: { type: String, default: 'personal' } })
const emit = defineEmits(['update:plannerView'])
const profileMenuOpen = ref(false)
const profileInitial = computed(() => (auth.user?.email?.charAt(0) || '?').toUpperCase())
const pageTitle = computed(() => ({ Vault: 'Vault', Planner: 'Planner', PlannerSettings: 'Planner settings', Settings: 'Settings' })[route.name] || '')

function navigateToBoard(boardId) {
  router.push(`/board/${boardId}`)
}

function toggleProfileMenu() {
  profileMenuOpen.value = !profileMenuOpen.value
}

function closeProfileMenu() {
  profileMenuOpen.value = false
}

function goToBoards() {
  closeProfileMenu()
  router.push('/board/root')
}

function goToPlanner() {
  closeProfileMenu()
  router.push('/planner')
}

function goToVault() {
  closeProfileMenu()
  router.push('/vault')
}

function goToSettings() {
  closeProfileMenu()
  router.push('/settings')
}

async function logout() {
  try {
    await auth.logout()
  } catch (err) {
    console.error('Logout failed:', err)
  }
  router.push('/login')
}

function handleDocumentClick() {
  closeProfileMenu()
}

onMounted(() => document.addEventListener('click', handleDocumentClick))
onUnmounted(() => document.removeEventListener('click', handleDocumentClick))
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

.page-title {
  color: #17212B;
  font-size: 15px;
  font-weight: 700;
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
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
}

.planner-header-switcher {
  position: absolute;
  left: 50%;
  display: inline-flex;
  padding: 3px;
  border: 1px solid #CBD5DC;
  border-radius: 6px;
  background: #F1F4F6;
  transform: translateX(-50%);
}

.planner-header-switcher button {
  min-width: 82px;
  padding: 6px 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #64748B;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.planner-header-switcher button.active {
  background: #FFFFFF;
  color: #0067A8;
  box-shadow: 0 1px 3px rgba(44, 62, 75, .14);
}

.nav-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #64748B;
  cursor: pointer;
}

.nav-icon:hover,
.nav-icon.active {
  background: #E8F3FA;
  color: #0067A8;
}

.profile-button {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 8px;
  padding: 5px 8px 5px 5px;
  background: transparent;
  color: #4b5563;
  font-size: 13px;
  cursor: pointer;
}

.profile-button:hover {
  background: #f3f4f6;
}

.profile-avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #E5E7EB;
  color: #374151;
  font-size: 12px;
  font-weight: 700;
}

.profile-email {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1000;
  min-width: 160px;
  padding: 6px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #FFFFFF;
  box-shadow: 0 8px 20px rgba(15, 23, 42, .12);
}

.profile-menu-item {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #1F2937;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
}

.profile-menu-item:hover {
  background: #F3F4F6;
}

.profile-menu-item.danger {
  color: #DC2626;
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

:global([data-theme='dark'] .top-bar) {
  background: #1B232B;
  border-color: #34424D;
}

:global([data-theme='dark'] .breadcrumb-title),
:global([data-theme='dark'] .profile-button),
:global([data-theme='dark'] .page-title) {
  color: #E5EDF2;
}

:global([data-theme='dark'] .nav-icon:hover),
:global([data-theme='dark'] .nav-icon.active) {
  background: #293E4D;
  color: #9FD0F2;
}

:global([data-theme='dark'] .planner-header-switcher) {
  border-color: #52616D;
  background: #172027;
}

:global([data-theme='dark'] .planner-header-switcher button.active) {
  background: #293E4D;
  color: #9FD0F2;
}

:global([data-theme='dark'] .breadcrumb-item:hover) {
  background-color: #28343E;
}

:global([data-theme='dark'] .profile-button:hover),
:global([data-theme='dark'] .icon-button:hover) {
  background: #28343E;
  color: #FFFFFF;
}

:global([data-theme='dark'] .profile-menu) {
  border-color: #34424D;
  background: #202B34;
}

:global([data-theme='dark'] .profile-menu-item) {
  color: #E5EDF2;
}

:global([data-theme='dark'] .profile-menu-item:hover) {
  background: #2D3A45;
}

@media (max-width: 800px) {
  .top-bar {
    height: 56px;
    flex-shrink: 0;
    padding: 0 12px;
  }

  .page-title {
    font-size: 16px;
  }

  .planner-top-bar .page-title {
    display: none;
  }

  .planner-top-bar .top-bar-actions {
    margin-left: auto;
  }

  .planner-header-switcher button {
    min-width: 68px;
    padding-inline: 8px;
  }

  .top-bar-actions {
    gap: 4px;
  }

  .nav-icon,
  .profile-button {
    min-width: 40px;
    min-height: 40px;
  }

  .profile-button {
    padding: 5px;
  }

  .profile-email {
    display: none;
  }

  .profile-menu {
    top: calc(100% + 6px);
    min-width: 190px;
  }

  .profile-menu-item {
    min-height: 42px;
  }

  .breadcrumbs {
    min-width: 0;
    overflow: hidden;
  }

  .breadcrumb-item {
    min-width: 0;
    padding-inline: 6px;
  }

  .breadcrumb-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>