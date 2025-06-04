import { createRouter, createWebHashHistory } from 'vue-router'
import chat from "@/components/chat.vue";
import login from "@/components/login.vue";
import VdioCall from "@/components/vdioCall.vue";

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
    },
    {
        path:'/vdiocall',
        name: 'vdiocall',
        component: VdioCall
    }
]

const router = createRouter({
    history: createWebHashHistory('/zchat/'),
    routes
})

export default router
