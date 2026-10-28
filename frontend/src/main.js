import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles.css'
import { useThemeStore } from './store/theme'

const app = createApp(App)
const pinia = createPinia()
const theme = useThemeStore(pinia)
theme.initialize()

app.use(pinia)
app.use(router)
app.mount('#app')