import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Home from '../views/Home.vue'
import PostDetail from '../views/PostDetail.vue'
import CreatePost from '../views/CreatePost.vue'
import MyPosts from '../views/MyPosts.vue'
import Profile from '../views/Profile.vue'
import UserProfile from '../views/UserProfile.vue'
import TribeCreate from '../views/TribeCreate.vue'
import TribeEdit from '../views/TribeEdit.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import Chat from '../views/Chat.vue'
import { loginVisible } from '../composables/auth'

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/home', component: Home },
  { path: '/post/:id', component: PostDetail, meta: { requiresAuth: true } },
  { path: '/create', component: CreatePost, meta: { requiresAuth: true } },
  { path: '/tribe/create', component: TribeCreate, meta: { requiresAuth: true } },
  { path: '/tribe/edit/:id', component: TribeEdit, meta: { requiresAuth: true } },
  { path: '/chat', component: Chat, meta: { requiresAuth: true } },
  { path: '/my-posts', component: MyPosts, meta: { requiresAuth: true } },
  { path: '/profile', component: Profile, meta: { requiresAuth: true } },
  // 他人主页需要登录，游客直接输入地址也会被守卫拦下
  { path: '/user/:id', component: UserProfile, meta: { requiresAuth: true } },
  { path: '/admin', component: AdminDashboard, meta: { requiresAuth: true, role: 'ADMIN' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  const token = sessionStorage.getItem('token')
  const role = sessionStorage.getItem('role')
  if (to.meta.requiresAuth && !token) {
    loginVisible.value = true
    next('/home')
  } else if (to.meta.role && to.meta.role !== role) {
    next('/home')
  } else {
    next()
  }
})

export default router
