import { createRouter, createWebHistory } from 'vue-router'
import chat from "@/components/chat.vue";
import login from "@/components/login.vue";

const routes = [
    {
        path: '/chat',
        name: 'chat',
        component: chat
    },
    {
        path:'/',
        name: 'login',
        component: login
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
