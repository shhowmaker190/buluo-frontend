<template>
  <div class="page-container">
    <div class="navbar">
      <div class="brand" @click="router.push('/home')">
        <div class="brand-logo">闲</div>
        <span>部落闲聊</span>
      </div>
      <div class="nav-links">
        <span class="nav-link" @click="router.push('/home')">首页</span>
        <span class="nav-link" @click="goCreate">发帖</span>
        <span class="nav-link" @click="goMyPosts">我的帖子</span>
        <span class="nav-link active">好友</span>
        <TribeMenu />
        <span v-if="role === 'ADMIN'" class="nav-link" @click="router.push('/admin')">管理后台</span>
      </div>
      <template v-if="loggedIn">
        <span class="nav-link" @click="logout">退出</span>
        <span class="user-info" @click="router.push('/profile')" style="cursor:pointer">
          <img v-if="currentAvatar" :src="currentAvatar" class="nav-avatar" @error="currentAvatar = ''" />
          <span v-else class="nav-avatar-placeholder">{{ currentUsername ? currentUsername[0].toUpperCase() : 'U' }}</span>
          {{ currentUsername }}
        </span>
        <NotificationBell />
      </template>
      <template v-else>
        <span class="nav-link login-btn" @click="openLogin">登录</span>
        <span class="nav-link" @click="router.push('/register')">注册</span>
      </template>
    </div>

    <div class="container">
      <div class="chat-layout">
        <aside class="chat-side card">
          <div class="side-search">
            <el-input
              v-model="searchKeyword"
              size="small"
              placeholder="搜索用户名或 6 位 ID"
              clearable
              @keyup.enter="doSearchUser"
              @clear="clearSearchUser"
            >
              <template #append>
                <el-button size="small" @click="doSearchUser">搜索</el-button>
              </template>
            </el-input>
          </div>

          <div v-if="searchActive" class="side-list search-results">
            <div v-if="searchResults.length === 0" class="side-empty">没有找到匹配的用户</div>
            <div v-for="u in searchResults" :key="u.userId" class="result-item">
              <img v-if="u.avatar" :src="u.avatar" class="conv-avatar clickable" title="查看主页" @click.stop="goProfile(u.userId)" @error="u.avatar = ''" />
              <span v-else class="conv-avatar conv-avatar-ph clickable" title="查看主页" @click.stop="goProfile(u.userId)">{{ (u.username || '?')[0].toUpperCase() }}</span>
              <div class="conv-info">
                <div class="conv-name">{{ u.username }}</div>
                <div class="user-no">ID {{ u.userNo }}</div>
              </div>
              <div class="result-actions">
                <el-button v-if="!u.isSelf" size="small" @click="selectUser(u.userId)">私聊</el-button>
                <el-button v-if="u.isSelf" size="small" @click="goProfile(u.userId)">我的主页</el-button>
                <el-button v-else-if="u.isFriend" size="small" disabled>已是好友</el-button>
                <el-button v-else-if="u.pending" size="small" disabled>已申请</el-button>
                <el-button v-else size="small" type="primary" plain @click="requestFriend(u)">加好友</el-button>
              </div>
            </div>
          </div>

          <template v-else>
          <div class="side-tabs">
            <span :class="{ active: tab === 'conv' }" @click="tab = 'conv'">会话</span>
            <span :class="{ active: tab === 'friend' }" @click="tab = 'friend'">好友 {{ friends.length }}</span>
            <span :class="{ active: tab === 'request' }" @click="tab = 'request'">
              申请 <em v-if="requests.length" class="req-badge">{{ requests.length }}</em>
            </span>
          </div>

          <div v-if="tab === 'conv'" class="side-list">
            <div v-if="conversations.length === 0" class="side-empty">还没有会话</div>
            <div
              v-for="c in conversations"
              :key="c.userId"
              :class="['conv-item', { active: isCurrent(c.userId) }]"
              @click="selectUser(c.userId)"
              @contextmenu="openConvMenu($event, c)"
            >
              <img v-if="c.avatar" :src="c.avatar" class="conv-avatar clickable" title="查看主页" @click.stop="goProfile(c.userId)" @error="c.avatar = ''" />
              <span v-else class="conv-avatar conv-avatar-ph clickable" title="查看主页" @click.stop="goProfile(c.userId)">{{ (c.username || '?')[0].toUpperCase() }}</span>
              <div class="conv-info">
                <div class="conv-name">
                  {{ c.username }}
                  <span v-if="!c.isFriend" class="stranger-tag">陌生人</span>
                </div>
                <div class="conv-last">{{ c.lastMessage }}</div>
              </div>
              <span v-if="c.unread > 0" class="unread-badge">{{ c.unread }}</span>
            </div>
          </div>

          <div v-else-if="tab === 'friend'" class="side-list">
            <div v-if="friends.length === 0" class="side-empty">还没有好友，去别人主页添加吧</div>
            <div
              v-for="f in friends"
              :key="f.userId"
              :class="['conv-item', { active: isCurrent(f.userId) }]"
              @click="selectUser(f.userId)"
            >
              <img v-if="f.avatar" :src="f.avatar" class="conv-avatar clickable" title="查看主页" @click.stop="goProfile(f.userId)" @error="f.avatar = ''" />
              <span v-else class="conv-avatar conv-avatar-ph clickable" title="查看主页" @click.stop="goProfile(f.userId)">{{ (f.username || '?')[0].toUpperCase() }}</span>
              <div class="conv-info">
                <div class="conv-name">{{ f.username }}</div>
              </div>
            </div>
          </div>

          <div v-else class="side-list">
            <div v-if="requests.length === 0" class="side-empty">暂无好友申请</div>
            <div v-for="r in requests" :key="r.id" class="request-item">
              <img v-if="r.avatar" :src="r.avatar" class="conv-avatar" @error="r.avatar = ''" />
              <span v-else class="conv-avatar conv-avatar-ph">{{ (r.username || '?')[0].toUpperCase() }}</span>
              <div class="conv-info">
                <div class="conv-name">{{ r.username }}</div>
                <div class="conv-last">{{ r.message || '想添加你为好友' }}</div>
              </div>
              <div class="request-actions">
                <el-button size="small" type="primary" @click="handleRequest(r, true)">同意</el-button>
                <el-button size="small" @click="handleRequest(r, false)">拒绝</el-button>
              </div>
            </div>
          </div>
          </template>
        </aside>

        <main class="chat-main card">
          <template v-if="current">
            <div class="chat-header">
              <img v-if="current.avatar" :src="current.avatar" class="chat-avatar clickable" title="查看主页" @click="goProfile(current.userId)" />
              <span v-else class="chat-avatar chat-avatar-ph clickable" title="查看主页" @click="goProfile(current.userId)">{{ (current.username || '?')[0].toUpperCase() }}</span>
              <span class="chat-name clickable" title="查看主页" @click="goProfile(current.userId)">{{ current.username }}</span>
              <span v-if="!current.isFriend" class="stranger-tag">非好友</span>
              <span v-if="!current.isFriend" class="quota-tip">
                非好友时你最多可发 {{ quota }} 条
              </span>
              <template v-if="!current.isFriend">
                <el-button v-if="relation === 'pending'" size="small" disabled>申请已发送</el-button>
                <el-button v-else-if="relation === 'incoming'" size="small" @click="tab = 'request'">处理申请</el-button>
                <el-button v-else size="small" type="primary" plain @click="addFriend">添加好友</el-button>
              </template>
              <el-button v-else size="small" type="danger" plain @click="removeFriend">删除好友</el-button>
            </div>

            <div ref="msgBox" class="message-list">
              <div v-if="messages.length === 0" class="side-empty">还没有消息，打个招呼吧</div>
              <div
                v-for="m in messages"
                :key="m.id"
                :class="['message-row', m.mine ? 'mine' : 'theirs']"
                @contextmenu="openMessageMenu($event, m)"
              >
                <div v-if="m.msgType && m.msgType !== 'text'" class="share-card" @click="openShareTarget(m)">
                  <img v-if="m.refAvatar" :src="m.refAvatar" class="share-avatar" @error="m.refAvatar = ''" />
                  <span v-else class="share-avatar share-avatar-ph">{{ m.msgType === 'tribe' ? '部' : '帖' }}</span>
                  <div class="share-body">
                    <div class="share-title">{{ m.refTitle }}</div>
                    <div class="share-sub">{{ m.refSub }}</div>
                  </div>
                  <span class="share-go">查看 ›</span>
                </div>
                <div v-else class="message-bubble" v-html="renderMessage(m.content)"></div>
                <div class="message-time">{{ formatTime(m.createdAt) }}</div>
              </div>
            </div>

            <div class="chat-composer">
              <el-input
                v-model="draft"
                type="textarea"
                :rows="2"
                :disabled="!canSend"
                :placeholder="canSend ? '输入消息，回车发送（Ctrl+Enter 换行）' : '你们还不是好友，只能发送 1 条消息'"
                @keydown.enter="onEnter"
              />
              <div class="composer-row">
                <div class="composer-left">
                  <EmojiPicker @select="insertEmoji" />
                  <el-button size="small" :disabled="!canSend" @click="openShare">分享帖子 / 部落</el-button>
                </div>
                <el-button type="primary" size="small" :disabled="!canSend || !draft.trim()" :loading="sending" @click="sendMessage">
                  发送
                </el-button>
              </div>
            </div>
          </template>

          <div v-else class="empty">从左侧选择一个好友开始聊天</div>
        </main>
      </div>
    </div>

    <div class="footer">积极交流，友善发言，违规评论与投票一经发现直接删除！</div>

    <!-- 分享帖子 / 部落 -->
    <el-dialog v-model="shareVisible" :title="`分享给 ${current?.username || ''}`" width="520px">
      <el-tabs v-model="shareTab">
        <el-tab-pane label="我的帖子" name="post">
          <div v-if="shareLoading" class="side-empty">加载中…</div>
          <div v-else-if="sharePosts.length === 0" class="side-empty">还没有已发布的帖子</div>
          <div v-else class="share-pick-list">
            <div v-for="p in sharePosts" :key="'p' + p.id" class="share-pick" @click="doShare('post', p)">
              <div class="share-pick-body">
                <div class="share-pick-title">{{ p.title }}</div>
                <div class="share-pick-sub">{{ p.tribeName || '未分类' }} · {{ formatTime(p.createdAt) }}</div>
              </div>
              <span class="share-pick-go">发送</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="我的部落" name="tribe">
          <div v-if="shareLoading" class="side-empty">加载中…</div>
          <div v-else-if="shareTribes.length === 0" class="side-empty">还没有加入或创建部落</div>
          <div v-else class="share-pick-list">
            <div v-for="t in shareTribes" :key="'t' + t.id" class="share-pick" @click="doShare('tribe', t)">
              <img v-if="t.avatar" :src="t.avatar" class="tribe-mini" @error="t.avatar = ''" />
              <span v-else class="tribe-mini tribe-mini-ph">{{ (t.name || '?')[0] }}</span>
              <div class="share-pick-body">
                <div class="share-pick-title">{{ t.name }}</div>
                <div class="share-pick-sub">{{ t.memberCount || 0 }} 人 · {{ t.description || '暂无简介' }}</div>
              </div>
              <span class="share-pick-go">发送</span>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <!-- 右键菜单：会话删除 / 消息删除 -->
    <Teleport to="body">
      <div v-if="ctx.visible" class="ctx-menu" :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }">
        <div class="ctx-title">{{ ctx.title }}</div>
        <div class="ctx-item danger" @click="runCtxAction">{{ ctx.label }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '../utils/http'
import NotificationBell from '../components/NotificationBell.vue'
import TribeMenu from '../components/TribeMenu.vue'
import EmojiPicker from '../components/EmojiPicker.vue'
import { requireAuth, loginVisible, isLoggedIn, currentUsername, currentRole, currentAvatar, currentUserId, clearAuth } from '../composables/auth'
import { onChatEvent } from '../composables/chat'
import { renderEmoji } from '../utils/emoji'

const route = useRoute()
const router = useRouter()
const role = currentRole
const loggedIn = isLoggedIn

const tab = ref('conv')
const conversations = ref([])
const friends = ref([])
const requests = ref([])
const sentRequests = ref([])
const searchKeyword = ref('')
const searchResults = ref([])
const searchActive = ref(false)
const messages = ref([])
const current = ref(null)
const quota = ref(0)
const draft = ref('')
const sending = ref(false)
const msgBox = ref()

const canSend = computed(() => !current.value || current.value.isFriend || quota.value > 0)

const loadConversations = async () => {
  try {
    const res = await http.get('/chat/conversations')
    conversations.value = res.data.data || []
  } catch (e) {
    console.error('加载会话失败:', e)
  }
}

const loadFriends = async () => {
  try {
    const [a, b, c] = await Promise.all([
      http.get('/friend/list'),
      http.get('/friend/requests'),
      http.get('/friend/sent')
    ])
    friends.value = a.data.data || []
    requests.value = b.data.data || []
    sentRequests.value = c.data.data || []
  } catch (e) {
    console.error('加载好友失败:', e)
  }
}

const loadMessages = async (userId) => {
  try {
    const [h, q] = await Promise.all([
      http.get(`/chat/history/${userId}`, { params: { limit: 200 } }),
      http.get(`/chat/quota/${userId}`)
    ])
    messages.value = h.data.data || []
    quota.value = q.data.data?.quota ?? 0
    scrollToBottom()
  } catch (e) {
    console.error('加载聊天记录失败:', e)
  }
}

// 当前选中的会话：会话列表与好友列表共用同一套高亮
const isCurrent = (userId) => !!current.value && Number(current.value.userId) === Number(userId)

// 与当前聊天对象的关系：friend / pending(我发出待处理) / incoming(对方申请待我处理) / none
const relation = computed(() => {
  const id = Number(current.value?.userId)
  if (!id) return 'none'
  if (friends.value.some(f => Number(f.userId) === id)) return 'friend'
  if (sentRequests.value.some(r => Number(r.userId) === id)) return 'pending'
  if (requests.value.some(r => Number(r.userId) === id)) return 'incoming'
  return 'none'
})

const selectUser = async (userId) => {
  const fromConv = conversations.value.find(c => Number(c.userId) === Number(userId))
  const fromFriend = friends.value.find(f => Number(f.userId) === Number(userId))
  let username, avatar, isFriend
  if (fromConv || fromFriend) {
    username = fromConv?.username || fromFriend?.username || '用户'
    avatar = fromConv?.avatar || fromFriend?.avatar || ''
    // 会话里带 isFriend；好友列表里点出来的一定是好友
    isFriend = fromConv ? !!fromConv.isFriend : true
  } else {
    // 从别人主页直接跳转时，本地列表没有这个人，必须向后端补全，
    // 绝不能默认按好友处理（否则会错误地显示"删除好友"）
    try {
      const [p, c] = await Promise.all([
        http.get(`/user/${userId}/profile`),
        http.get(`/friend/check/${userId}`)
      ])
      username = p.data.data?.username || '用户'
      avatar = p.data.data?.avatar || ''
      isFriend = !!c.data.data?.isFriend
    } catch (e) {
      console.error('加载对方信息失败:', e)
      username = '用户'
      avatar = ''
      isFriend = false
    }
  }
  current.value = { userId, username, avatar, isFriend }
  await loadMessages(userId)
  await loadConversations()
}

// ===== 点击头像跳转主页 =====
const goProfile = (userId) => {
  if (!userId) return
  // 点到自己（搜索结果里会出现自己）时去「我的主页」，不进入他人主页视图
  if (Number(userId) === Number(currentUserId.value)) {
    router.push('/profile')
    return
  }
  router.push(`/user/${userId}`)
}

// ===== 分享帖子 / 部落 =====
const shareVisible = ref(false)
const shareTab = ref('post')
const shareLoading = ref(false)
const sharePosts = ref([])
const shareTribes = ref([])

const openShare = async () => {
  if (!current.value) return
  shareVisible.value = true
  shareLoading.value = true
  try {
    const [p, joined, created] = await Promise.all([
      http.get('/post/my'),
      http.get('/tribe/my/list'),
      http.get('/tribe/my/created')
    ])
    // 只能分享已通过审核的帖子 / 部落
    sharePosts.value = (p.data.data || []).filter(x => x.status === 1)
    const map = new Map()
    ;[...(joined.data.data || []), ...(created.data.data || [])]
      .forEach(t => map.set(t.id, t))
    shareTribes.value = [...map.values()].filter(t => t.status === 1)
    // 帖子为空时默认切到部落栏
    if (sharePosts.value.length === 0 && shareTribes.value.length > 0) shareTab.value = 'tribe'
  } catch (e) {
    ElMessage.error('加载可分享内容失败')
  } finally {
    shareLoading.value = false
  }
}

const doShare = async (type, item) => {
  if (!current.value) return
  try {
    const res = await http.post('/chat/share', {
      toUserId: current.value.userId,
      msgType: type,
      refId: item.id
    })
    if (res.data.code === 200) {
      ElMessage.success('已发送')
      shareVisible.value = false
      await loadMessages(current.value.userId)
      await loadConversations()
    } else {
      ElMessage.error(res.data.message || '发送失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发送失败')
  }
}

// 点击分享卡片跳转到帖子 / 部落
const openShareTarget = (m) => {
  if (!m.refId) return
  if (m.msgType === 'post') router.push(`/post/${m.refId}`)
  else if (m.msgType === 'tribe') router.push(`/home?tribe=${m.refId}`)
}

// ===== 右键菜单（会话 / 消息）=====
const ctx = ref({ visible: false, x: 0, y: 0, type: '', data: null, title: '', label: '' })

const openCtx = (e, type, data, title, label) => {
  e.preventDefault()
  // 贴边时往回收，避免菜单被窗口截断
  const x = Math.min(e.clientX, window.innerWidth - 160)
  const y = Math.min(e.clientY, window.innerHeight - 90)
  ctx.value = { visible: true, x: Math.max(8, x), y: Math.max(8, y), type, data, title, label }
}

const closeCtx = () => { ctx.value.visible = false }

const openConvMenu = (e, c) => openCtx(e, 'conv', c, `与 ${c.username} 的会话`, '删除会话')
const openMessageMenu = (e, m) => openCtx(e, 'msg', m, m.mine ? '我发送的消息' : '对方发送的消息', '删除消息')

const runCtxAction = async () => {
  const { type, data } = ctx.value
  closeCtx()
  if (type === 'conv') await deleteConversation(data)
  else if (type === 'msg') await deleteMessage(data)
}

// 删除会话：仅自己不再看到，对方记录保留
const deleteConversation = async (c) => {
  const ok = await ElMessageBox.confirm(
    `删除与「${c.username}」的会话后，仅你自己看不到聊天记录，对方不受影响；对方再次发消息时会话会重新出现。`,
    '删除会话',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  ).then(() => true).catch(() => false)
  if (!ok) return
  try {
    const res = await http.delete(`/chat/conversation/${c.userId}`)
    if (res.data.code === 200) {
      ElMessage.success('会话已删除')
      if (isCurrent(c.userId)) {
        current.value = null
        messages.value = []
      }
      await loadConversations()
    } else ElMessage.error(res.data.message || '删除失败')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  }
}

// 删除单条消息：仅自己不再看到
const deleteMessage = async (m) => {
  try {
    const res = await http.delete(`/chat/message/${m.id}`)
    if (res.data.code === 200) {
      messages.value = messages.value.filter(x => x.id !== m.id)
      ElMessage.success('消息已删除')
      await loadConversations()
    } else ElMessage.error(res.data.message || '删除失败')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  }
}

const onGlobalClick = () => closeCtx()
const onGlobalKey = (e) => { if (e.key === 'Escape') closeCtx() }

const sendMessage = async () => {
  if (!draft.value.trim() || !current.value) return
  sending.value = true
  try {
    const res = await http.post('/chat/send', { toUserId: current.value.userId, content: draft.value.trim() })
    if (res.data.code === 200) {
      draft.value = ''
      await loadMessages(current.value.userId)
      await loadConversations()
      await loadFriends()
    } else {
      ElMessage.error(res.data.message || '发送失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

const onEnter = (e) => {
  if (e.ctrlKey || e.shiftKey) return
  e.preventDefault()
  sendMessage()
}

const insertEmoji = (tag) => {
  draft.value += tag
}

// 搜索用户：6 位数字按 ID 精确匹配，否则按用户名模糊匹配
const doSearchUser = async () => {
  const kw = searchKeyword.value.trim()
  if (!kw) {
    clearSearchUser()
    return
  }
  searchActive.value = true
  try {
    const res = await http.get('/user/search', { params: { keyword: kw } })
    searchResults.value = res.data.data || []
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '搜索失败')
    searchResults.value = []
  }
}

const clearSearchUser = () => {
  searchKeyword.value = ''
  searchActive.value = false
  searchResults.value = []
}

const requestFriend = async (u) => {
  try {
    const { value } = await ElMessageBox.prompt('发送好友申请', `添加 ${u.username}`, {
      inputPlaceholder: '可以留一句自我介绍（可留空）',
      inputValue: ''
    }).catch(() => ({ value: undefined }))
    if (value === undefined) return
    const res = await http.post(`/friend/request/${u.userId}`, { message: value || '' })
    if (res.data.code === 200) {
      ElMessage.success('申请已发送')
      u.pending = true
      await loadFriends()
    } else ElMessage.error(res.data.message || '发送失败')
  } catch (e) {
    if (e?.response) ElMessage.error(e.response.data?.message || '发送失败')
  }
}

const addFriend = async () => {
  if (!current.value) return
  try {
    const { value } = await ElMessageBox.prompt('发送好友申请', '添加好友', {
      inputPlaceholder: '可以留一句自我介绍（可留空）',
      inputValue: ''
    }).catch(() => ({ value: undefined }))
    if (value === undefined) return
    const res = await http.post(`/friend/request/${current.value.userId}`, { message: value || '' })
    if (res.data.code === 200) {
      ElMessage.success('申请已发送')
      await loadFriends()
    } else ElMessage.error(res.data.message || '发送失败')
  } catch (e) {
    if (e?.response) ElMessage.error(e.response.data?.message || '发送失败')
  }
}

const handleRequest = async (req, accept) => {
  try {
    const res = await http.post(`/friend/handle/${req.id}`, { accept })
    if (res.data.code === 200) {
      ElMessage.success(accept ? `已添加 ${req.username} 为好友` : '已拒绝申请')
      await loadFriends()
      await loadConversations()
      if (accept) selectUser(req.userId)
    } else ElMessage.error(res.data.message || '操作失败')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

const removeFriend = async () => {
  if (!current.value) return
  try {
    await http.delete(`/friend/${current.value.userId}`)
    ElMessage.success('已删除好友')
    current.value.isFriend = false
    await loadFriends()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const renderMessage = (text) => {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  return renderEmoji(escaped)
}

const scrollToBottom = () => {
  nextTick(() => {
    if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
  })
}

const formatTime = (t) => {
  if (!t) return ''
  const d = new Date(typeof t === 'string' ? t.replace(' ', 'T') : t)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const goCreate = async () => {
  if (!await requireAuth()) return
  router.push('/create')
}
const goMyPosts = async () => {
  if (!await requireAuth()) return
  router.push('/my-posts')
}
const openLogin = () => { loginVisible.value = true }
const logout = () => { clearAuth(); router.push('/home') }

// SSE 推送：新消息、好友申请、同意好友
const offChat = onChatEvent(async (type, data) => {
  await loadConversations()
  if (type === 'friend-request' || type === 'friend-accept') await loadFriends()
  if (type === 'friend-accept' && current.value &&
      Number(data.userId) === Number(current.value.userId)) {
    // 对方同意了我的申请，当前会话即时变为好友
    current.value.isFriend = true
  }
  if (type === 'chat' && current.value && Number(data.fromUserId) === Number(current.value.userId)) {
    await loadMessages(current.value.userId)
  }
})

// 支持从通知铃铛带 ?tab=request 直接进入申请列表（好友验证跳转）
watch(() => route.query.tab, (val) => {
  if (val === 'request' || val === 'friend') tab.value = val
})

watch(() => route.query.user, (val) => {
  const id = val ? Number(val) : null
  if (id) selectUser(id)
})

onMounted(async () => {
  await loadFriends()
  await loadConversations()
  const tabParam = route.query.tab
  if (tabParam === 'request' || tabParam === 'friend') tab.value = tabParam
  const preset = route.query.user ? Number(route.query.user) : null
  if (preset) await selectUser(preset)
  // 点空白处 / 按 Esc / 滚动列表时收起右键菜单
  window.addEventListener('click', onGlobalClick)
  window.addEventListener('keydown', onGlobalKey)
  window.addEventListener('scroll', onGlobalClick, true)
})

onUnmounted(() => {
  offChat()
  window.removeEventListener('click', onGlobalClick)
  window.removeEventListener('keydown', onGlobalKey)
  window.removeEventListener('scroll', onGlobalClick, true)
})
</script>

<style scoped>
.chat-layout { display: flex; gap: 14px; align-items: stretch; height: calc(100vh - 200px); min-height: 420px; }
.chat-side { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; padding: 12px; }
.chat-main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 0; }

.side-tabs { display: flex; gap: 14px; font-size: 14px; color: #666; padding-bottom: 10px; border-bottom: 1px solid #e5e5e5; }
.side-tabs span { cursor: pointer; }
.side-tabs span.active { color: #4e6ef2; font-weight: 600; }
.req-badge {
  display: inline-block; min-width: 16px; padding: 0 4px; border-radius: 8px;
  background: #f56c6c; color: #fff; font-size: 11px; font-style: normal; text-align: center;
}
.side-search { padding-bottom: 10px; border-bottom: 1px solid #e5e5e5; }
.side-list { flex: 1; overflow-y: auto; margin-top: 8px; }
.side-empty { font-size: 12px; color: #bbb; padding: 16px 4px; text-align: center; }
.user-no { font-size: 11px; color: #bbb; letter-spacing: 0.5px; }
.result-item { display: flex; align-items: center; gap: 8px; padding: 8px 6px; border-radius: 6px; }
.result-item:hover { background: #f7f7f7; }
.result-actions { display: flex; gap: 4px; flex-shrink: 0; }

.conv-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 6px;
  border-radius: 6px; cursor: pointer;
}
.conv-item:hover { background: #f7f7f7; }
.conv-item.active { background: #eef2ff; }
.conv-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.conv-avatar-ph {
  background: #4e6ef2; color: #fff; font-size: 13px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
.conv-info { flex: 1; min-width: 0; }
.conv-name { font-size: 13px; color: #333; display: flex; align-items: center; gap: 4px; }
.conv-last { font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.unread-badge {
  min-width: 18px; height: 18px; line-height: 18px; padding: 0 5px; border-radius: 9px;
  background: #f56c6c; color: #fff; font-size: 11px; text-align: center; flex-shrink: 0;
}
.stranger-tag { font-size: 11px; color: #e6a23c; background: #fdf6ec; border-radius: 8px; padding: 0 5px; }

.request-item { display: flex; align-items: center; gap: 8px; padding: 8px 6px; }
.request-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }

.chat-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-bottom: 1px solid #e5e5e5;
}
.chat-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.chat-avatar-ph {
  background: #4e6ef2; color: #fff; font-size: 13px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
.chat-name { font-size: 15px; font-weight: 600; color: #333; }
.quota-tip { font-size: 12px; color: #bbb; }

.message-list { flex: 1; overflow-y: auto; padding: 16px; background: #fafafa; }
.message-row { display: flex; flex-direction: column; margin-bottom: 12px; }
.message-row.mine { align-items: flex-end; }
.message-row.theirs { align-items: flex-start; }
.message-bubble {
  max-width: 66%; padding: 8px 12px; border-radius: 8px;
  font-size: 14px; line-height: 1.6; word-break: break-word; white-space: pre-wrap;
}
.message-row.mine .message-bubble { background: #4e6ef2; color: #fff; }
.message-row.theirs .message-bubble { background: #fff; color: #333; border: 1px solid #eee; }
.message-time { font-size: 11px; color: #bbb; margin-top: 4px; }

.chat-composer { padding: 12px; border-top: 1px solid #e5e5e5; }
.composer-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.login-btn { color: #4e6ef2; font-weight: 600; }

/* 头像 / 昵称可点击进主页 */
.clickable { cursor: pointer; }
.clickable:hover { opacity: 0.85; }
.chat-name.clickable:hover { color: #4e6ef2; }

/* 右键菜单 */
.ctx-menu {
  position: fixed; z-index: 3000; min-width: 150px; padding: 4px;
  background: #fff; border: 1px solid #e8e8e8; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}
.ctx-title {
  padding: 6px 12px 4px; font-size: 11px; color: #bbb;
  border-bottom: 1px solid #f2f2f2; margin-bottom: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;
}
.ctx-item { padding: 7px 12px; font-size: 13px; color: #333; border-radius: 6px; cursor: pointer; white-space: nowrap; }
.ctx-item:hover { background: #f5f5f5; }
.ctx-item.danger { color: #f56c6c; }
.ctx-item.danger:hover { background: #fef0f0; }

/* 分享卡片消息 */
.share-card {
  display: flex; align-items: center; gap: 10px; max-width: 66%; min-width: 220px;
  padding: 10px 12px; background: #fff; border: 1px solid #e6e9f5;
  border-left: 3px solid #4e6ef2; border-radius: 8px; cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}
.share-card:hover { box-shadow: 0 4px 14px rgba(78, 110, 242, 0.16); transform: translateY(-1px); }
.share-avatar { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.share-avatar-ph {
  background: #eef2ff; color: #4e6ef2; font-size: 15px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.share-body { flex: 1; min-width: 0; }
.share-title {
  font-size: 13px; font-weight: 600; color: #333; line-height: 1.4;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.share-sub { font-size: 11px; color: #999; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.share-go { font-size: 12px; color: #4e6ef2; flex-shrink: 0; }

/* 分享弹窗列表 */
.composer-left { display: flex; align-items: center; gap: 8px; }
.share-pick-list { max-height: 320px; overflow-y: auto; }
.share-pick {
  display: flex; align-items: center; gap: 10px; padding: 9px 8px;
  border-radius: 6px; cursor: pointer;
}
.share-pick:hover { background: #f7f8ff; }
.share-pick-body { flex: 1; min-width: 0; }
.share-pick-title {
  font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.share-pick-sub {
  font-size: 11px; color: #999; margin-top: 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.share-pick-go {
  font-size: 12px; color: #4e6ef2; border: 1px solid #c8d3fb;
  border-radius: 12px; padding: 1px 10px; flex-shrink: 0;
}
.share-pick:hover .share-pick-go { background: #4e6ef2; color: #fff; border-color: #4e6ef2; }
.tribe-mini {
  width: 30px; height: 30px; border-radius: 8px; object-fit: cover; flex-shrink: 0;
}
.tribe-mini-ph {
  background: #4e6ef2; color: #fff; font-size: 13px;
  display: inline-flex; align-items: center; justify-content: center;
}
</style>
