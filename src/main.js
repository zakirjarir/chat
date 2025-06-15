import { createApp } from 'vue'
import App from './App.vue'
import router from '../src/router/index'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import mixin from './mixin/mixin';
const app = createApp(App)
app.use(router)
app.mixin(mixin)

app.use(Toast)
app.mount('#app')
