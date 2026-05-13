import { createRouter, createWebHistory } from 'vue-router'
import WorkspaceView from '../views/WorkspaceView.vue'
import LoginView from '../views/LoginView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'
import { useAuthStore } from '../store/auth'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.isLoaded) {
    await auth.loadUser()
  }

  if (to.meta.requiresAuth && !auth.user) {
    return { name: 'Login' }
  }

  if (to.name === 'Login' && auth.user) {
    return { name: 'Board', params: { id: 'root' } }
  }
})

export default router