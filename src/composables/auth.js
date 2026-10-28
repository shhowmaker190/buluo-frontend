import { ref } from 'vue'

export const loginVisible = ref(false)
export const isLoggedIn = ref(!!sessionStorage.getItem('token'))
export const currentUsername = ref(sessionStorage.getItem('username') || '')
export const currentRole = ref(sessionStorage.getItem('role') || '')
export const currentUserId = ref(parseInt(sessionStorage.getItem('userId') || 0))
export const currentAvatar = ref(sessionStorage.getItem('avatar') || '')

let resolver = null

export function requireAuth() {
  if (isLoggedIn.value) return Promise.resolve(true)
  loginVisible.value = true
  return new Promise(resolve => { resolver = resolve })
}

export function resolveAuth(ok) {
  loginVisible.value = false
  if (resolver) {
    const r = resolver
    resolver = null
    r(!!ok)
  }
}

export function setAuth(token, username, role, userId, avatar) {
  sessionStorage.setItem('token', token)
  sessionStorage.setItem('username', username)
  sessionStorage.setItem('role', role)
  sessionStorage.setItem('userId', userId)
  sessionStorage.setItem('avatar', avatar || '')
  isLoggedIn.value = true
  currentUsername.value = username
  currentRole.value = role
  currentUserId.value = parseInt(userId)
  currentAvatar.value = avatar || ''
}

export function updateAvatar(avatar) {
  sessionStorage.setItem('avatar', avatar || '')
  currentAvatar.value = avatar || ''
}

export function clearAuth() {
  sessionStorage.clear()
  isLoggedIn.value = false
  currentUsername.value = ''
  currentRole.value = ''
  currentUserId.value = 0
  currentAvatar.value = ''
}
