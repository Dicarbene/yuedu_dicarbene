import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { create } from 'naive-ui'
import App from '@/App.vue'
import router from '@/router'
import '@/style.css'

const naive = create()
createApp(App).use(createPinia()).use(router).use(naive).mount('#app')
