import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/newsreader/latin-400.css'
import '@fontsource/newsreader/latin-400-italic.css'
import './styles/main.scss'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
