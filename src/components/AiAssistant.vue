<template>
  <!-- 左下角 AI 小助手：按钮 + 可展开的对话面板 -->
  <button class="ai-fab" :class="{ open }" title="AI 小助手" @click="toggle">
    <span v-if="!open" class="ai-fab-text">AI</span>
    <span v-else class="ai-fab-text">×</span>
  </button>

  <transition name="ai-panel">
    <div v-if="open" class="ai-panel">
      <div class="ai-head">
        <div class="ai-head-left">
          <span class="ai-dot"></span>
          <span class="ai-title">AI 小助手</span>
          <span class="ai-badge" :title="modeHint">{{ modeLabel }}</span>
        </div>
        <div class="ai-head-actions">
          <span class="ai-act" title="清空对话" @click="clearChat">清空</span>
        </div>
      </div>

      <div ref="listRef" class="ai-list">
        <div v-if="messages.length === 0" class="ai-welcome">
          <div class="ai-welcome-title">你好，我是部落闲聊的 AI 小助手</div>
          <div class="ai-welcome-sub">社区怎么用、等级怎么升、帖子怎么写，都可以问我</div>
          <div v-if="mode === 'free'" class="ai-welcome-sub ai-welcome-free">
            当前使用免费 AI（约 30 秒 1 条），忙时会用站内知识库先回答
          </div>
          <div class="ai-chips">
            <span v-for="q in quickQuestions" :key="q" class="ai-chip" @click="askQuick(q)">{{ q }}</span>
          </div>
        </div>

        <div
          v-for="(m, i) in messages"
          :key="i"
          :class="['ai-row', m.role === 'user' ? 'mine' : 'theirs']"
        >
          <div :class="['ai-bubble', m.role, { error: m.error }]" v-html="render(m.content)"></div>
        </div>

        <div v-if="sending" class="ai-row theirs">
          <div class="ai-bubble assistant typing"><i></i><i></i><i></i></div>
          <span v-if="slow" class="ai-slow">免费 AI 较慢，通常 10~25 秒…</span>
        </div>
      </div>

      <div v-if="!loggedIn" class="ai-login">
        <span>登录后即可使用 AI 助手</span>
        <el-button size="small" type="primary" @click="loginVisible = true">去登录</el-button>
      </div>
      <div v-else class="ai-input">
        <textarea
          v-model="draft"
          class="ai-textarea"
          rows="1"
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          :disabled="sending"
          @keydown.enter.exact.prevent="send"
          @input="autoGrow"
        ></textarea>
        <el-button type="primary" size="small" :loading="sending" :disabled="!draft.trim()" @click="send">
          发送
        </el-button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { isLoggedIn, loginVisible } from '../composables/auth'
import http from '../utils/http'

const STORAGE_KEY = 'ai-assistant-history'

const loggedIn = isLoggedIn
const open = ref(false)
const draft = ref('')
const sending = ref(false)
// 免费 AI 慢的时候给个提示，别让用户以为卡死了
const slow = ref(false)
const messages = ref(loadHistory())
const listRef = ref(null)
// 当前回答来源：deepseek / free / local，由后端 /ai/status 告知
const mode = ref('')

// 免费小模型的事实性内容不一定准，给个说明
const modeHint = computed(() => {
  if (mode.value === 'free') return '免费小模型：回答较慢，事实性内容可能不准确'
  if (mode.value === 'local') return '本地知识库：只覆盖社区使用相关问题'
  if (mode.value === 'ollama') return '本机模型，离线运行'
  return modeLabel.value
})

const modeLabel = computed(() => {
  if (mode.value === 'deepseek') return 'DeepSeek'
  if (mode.value === 'zhipu') return '智谱 GLM'
  if (mode.value === 'ollama') return '本地模型'
  if (mode.value === 'free') return '免费 AI'
  if (mode.value === 'local') return '本地知识库'
  return 'AI'
})

const loadStatus = async () => {
  if (!loggedIn.value) return
  try {
    const res = await http.get('/ai/status')
    if (res.data.code === 200) mode.value = res.data.data?.mode || ''
  } catch {
    // 拿不到就保持默认标签，不影响对话
  }
}

onMounted(loadStatus)

const quickQuestions = [
  '等级怎么升得最快？',
  '怎么创建自己的部落？',
  '为什么我的帖子没显示？',
  '怎么加好友私聊？'
]

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.slice(-20) : []
  } catch {
    return []
  }
}

function saveHistory() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value.slice(-20)))
  } catch {
    // 存不下就算了，不影响对话
  }
}

// 只做最小转义 + 换行：AI 回复按纯文本展示
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
const render = (text) => escapeHtml(text).replace(/\n/g, '<br>')

const scrollToBottom = async () => {
  await nextTick()
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}

const toggle = () => {
  open.value = !open.value
  if (open.value) scrollToBottom()
}

const autoGrow = (e) => {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 96) + 'px'
}

const pushMessage = (role, content, extra = {}) => {
  messages.value.push({ role, content, ...extra })
  saveHistory()
  scrollToBottom()
}

const clearChat = () => {
  messages.value = []
  saveHistory()
}

const askQuick = (q) => {
  draft.value = q
  send()
}

const send = async () => {
  const text = draft.value.trim()
  if (!text || sending.value) return
  if (!loggedIn.value) {
    loginVisible.value = true
    return
  }

  draft.value = ''
  pushMessage('user', text)
  sending.value = true
  slow.value = false
  const slowTimer = setTimeout(() => { if (sending.value) slow.value = true }, 6000)
  try {
    const res = await http.post('/ai/chat', {
      // 带上历史（最近 12 条由后端截断），让回答能接上文
      messages: messages.value.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })),
      page: window.location.pathname + window.location.search
    }, {
      // 全局 axios 超时是 10 秒，免费 AI 往往要 10~25 秒，
      // 这里单独放宽，否则后端还在生成、前端先报「网络异常」
      timeout: 70000
    })
    if (res.data.code === 200) {
      const data = res.data.data || {}
      if (data.mode) mode.value = data.mode
      pushMessage('assistant', data.reply || '（没有返回内容）')
    } else {
      pushMessage('assistant', res.data.message || 'AI 暂时没法回答，请稍后再试', { error: true })
    }
  } catch (e) {
    const msg = e.response?.status === 403
      ? '请先登录后再使用 AI 助手'
      : (e.response?.data?.message || '网络异常，请稍后再试')
    pushMessage('assistant', msg, { error: true })
  } finally {
    clearTimeout(slowTimer)
    slow.value = false
    sending.value = false
    scrollToBottom()
  }
}

// 未登录时，面板里只提示登录；登录后自动聚焦输入
watch(open, (v) => {
  if (v) {
    scrollToBottom()
    if (!mode.value) loadStatus()
  }
})
// 登录 / 退出后刷新来源标签（游客拿不到 status）
watch(loggedIn, (v) => {
  if (v) loadStatus()
  else mode.value = ''
})
</script>

<style scoped>
.ai-fab {
  position: fixed;
  left: 28px;
  bottom: 28px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #4e6ef2, #6d8bff);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.5px;
  box-shadow: 0 6px 18px rgba(78, 110, 242, 0.35);
  transition: transform 0.15s, box-shadow 0.15s;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-fab:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(78, 110, 242, 0.45); }
.ai-fab.open { background: #fff; color: #4e6ef2; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12); }
.ai-fab-text { line-height: 1; font-size: 18px; }

.ai-panel {
  position: fixed;
  left: 28px;
  bottom: 92px;
  width: 360px;
  height: min(560px, calc(100vh - 140px));
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 29;
  border: 1px solid #eef0f5;
}
.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #f0f2f5;
}
.ai-head-left { display: flex; align-items: center; gap: 8px; }
.ai-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #67c23a;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.15);
}
.ai-title { font-size: 14px; font-weight: 600; color: #333; }
.ai-badge {
  font-size: 10px; color: #4e6ef2; background: #f0f4ff;
  border-radius: 8px; padding: 1px 6px;
}
.ai-act { font-size: 12px; color: #999; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.ai-act:hover { color: #4e6ef2; background: #f2f6ff; }

.ai-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: #fafbfe;
}
.ai-welcome { padding: 8px 4px; }
.ai-welcome-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 6px; }
.ai-welcome-sub { font-size: 12px; color: #999; line-height: 1.6; margin-bottom: 12px; }
.ai-welcome-free { color: #b0b8c9; font-size: 11px; margin-top: -8px; }
.ai-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.ai-chip {
  font-size: 12px; color: #4e6ef2; background: #fff;
  border: 1px solid #dde4ff; border-radius: 14px; padding: 5px 10px;
  cursor: pointer; transition: background 0.15s, border-color 0.15s;
}
.ai-chip:hover { background: #f0f4ff; border-color: #b9c8ff; }

.ai-row { display: flex; margin-bottom: 10px; }
.ai-row.mine { justify-content: flex-end; }
.ai-bubble {
  max-width: 82%;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.65;
  word-break: break-word;
  white-space: normal;
}
.ai-bubble.user { background: #4e6ef2; color: #fff; border-bottom-right-radius: 3px; }
.ai-bubble.assistant {
  background: #fff; color: #333; border: 1px solid #eef0f5;
  border-bottom-left-radius: 3px;
}
.ai-bubble.error { color: #c45656; border-color: #fde2e2; background: #fef5f5; }

/* 思考中的三点动画 */
.ai-bubble.typing { display: flex; gap: 4px; align-items: center; height: 20px; }
.ai-slow { font-size: 11px; color: #bbb; margin-left: 2px; align-self: flex-end; padding-bottom: 2px; }
.ai-bubble.typing i {
  width: 6px; height: 6px; border-radius: 50%; background: #c0c4cc;
  animation: ai-blink 1s infinite ease-in-out;
}
.ai-bubble.typing i:nth-child(2) { animation-delay: 0.15s; }
.ai-bubble.typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes ai-blink {
  0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}

.ai-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #f0f2f5;
  background: #fff;
}
.ai-textarea {
  flex: 1;
  resize: none;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  line-height: 1.5;
  font-family: inherit;
  outline: none;
  max-height: 96px;
  transition: border-color 0.15s;
}
.ai-textarea:focus { border-color: #a9bcff; }

.ai-login {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid #f0f2f5;
  font-size: 12px;
  color: #999;
}

.ai-panel-enter-active,
.ai-panel-leave-active { transition: opacity 0.18s, transform 0.18s; }
.ai-panel-enter-from,
.ai-panel-leave-to { opacity: 0; transform: translateY(10px) scale(0.98); }

@media (max-width: 768px) {
  .ai-fab { left: 16px; bottom: 16px; width: 46px; height: 46px; }
  .ai-panel {
    left: 12px;
    right: 12px;
    width: auto;
    bottom: 74px;
    height: min(70vh, 520px);
  }
}
</style>
