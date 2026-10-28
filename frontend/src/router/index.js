import { createRouter, createWebHistory } from 'vue-router'
import WorkspaceView from '../views/WorkspaceView.vue'
import LoginView from '../views/LoginView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'
import PlannerView from '../views/PlannerView.vue'
import PlannerSettingsView from '../views/PlannerSettingsView.vue'
import SettingsView from '../views/SettingsView.vue'
import VaultView from '../views/VaultView.vue'
import { useAuthStore } from '../store/auth'
import { useThemeStore } from '../store/theme'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPasswordView
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPasswordView
  },
  {
    path: '/',
    redirect: '/board/root'
  },
  {
    path: '/board/:id',
    name: 'Board',
    component: WorkspaceView,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/planner',
    name: 'Planner',
    component: PlannerView,
    meta: { requiresAuth: true }
  },
  {
    path: '/planner/settings',
    name: 'PlannerSettings',
    component: PlannerSettingsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/vault',
    name: 'Vault',
    component: VaultView,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const theme = useThemeStore()
  if (!auth.isLoaded) {
    await auth.loadUser()
  }

  if (to.meta.requiresAuth && !auth.user) {
    return { name: 'Login' }
  }

  if (auth.user && !theme.isLoaded) {
    await theme.load()
  }

  if (to.name === 'Login' && auth.user) {
    return { name: 'Board', params: { id: 'root' } }
  }
})

export default router