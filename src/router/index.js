import { createRouter, createWebHashHistory } from 'vue-router'
import chat from "@/components/chat.vue";
import login from "@/components/login.vue";
import VdioCall from "@/components/vdioCall.vue";
import contact from "@/components/contact.vue";
import VideoCallAns from "@/components/videoCallAns.vue";

const routes = [
    {
        path: '/chat',
        name: 'chat',
        component: chat
    },
    {
        path: '/chat/:id',
        name: 'chat',
        component: chat
    },
    {
        path:'/',
        name: 'login',
        component: login
    },
    {
        path:'/vdiocall/:id',
        name: 'vdiocall',
        component: VdioCall
    },
    {
        path:'/vdiocallans/:id',
        name: 'vdiocallans',
        component: VideoCallAns
    },
    {
        path: '/contact',
        name: 'contact',
        component: contact
    }
]

const router = createRouter({
    history: createWebHashHistory('/zchat/'),
    routes
})

export default router
