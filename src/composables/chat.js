import { ref } from 'vue'

// 私聊实时推送：SSE 长连接。服务端用 SseEmitter，浏览器用 EventSource。
// EventSource 断开后会自动重连（默认 3s），所以这里只负责建立与事件分发。
export const chatConnected = ref(false)
export const lastChatEvent = ref(null)
export const unreadChatCount = ref(0)

const handlers = new Set()
let source = null

export function onChatEvent(handler) {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

function emit(type, data) {
  lastChatEvent.value = { type, data, at: Date.now() }
  handlers.forEach(h => {
    try {
      h(type, data)
    } catch (e) {
      console.error('处理聊天推送事件失败:', e)
    }
  })
}

export function connectChat() {
  const token = sessionStorage.getItem('token')
  if (!token) return null
  if (source) return source

  source = new EventSource(`/api/chat/stream?token=${encodeURIComponent(token)}`)

  source.addEventListener('connected', () => { chatConnected.value = true })
  source.addEventListener('chat', (e) => {
    try { emit('chat', JSON.parse(e.data)) } catch { emit('chat', {}) }
  })
  source.addEventListener('friend-request', (e) => {
    try { emit('friend-request', JSON.parse(e.data)) } catch { emit('friend-request', {}) }
  })
  source.addEventListener('friend-accept', (e) => {
    try { emit('friend-accept', JSON.parse(e.data)) } catch { emit('friend-accept', {}) }
  })
  source.onopen = () => { chatConnected.value = true }
  source.onerror = () => { chatConnected.value = false }

  return source
}

export function disconnectChat() {
  if (source) {
    source.close()
    source = null
  }
  chatConnected.value = false
}
