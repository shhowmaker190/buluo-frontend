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
        <span class="nav-link" @click="router.push('/chat')">好友</span>
        <TribeMenu />
        <span v-if="role === 'ADMIN'" class="nav-link" @click="router.push('/admin')">管理后台</span>
      </div>
      <template v-if="loggedIn">
        <span class="user-info" @click="router.push('/profile')" style="cursor:pointer">
          <img v-if="currentAvatar" :src="currentAvatar" class="nav-avatar" @error="currentAvatar = ''" />
          <span v-else class="nav-avatar-placeholder">{{ currentUsername ? currentUsername[0].toUpperCase() : 'U' }}</span>
          {{ currentUsername }}
        </span>
        <NotificationBell />
      </template>
      <template v-else>
        <span class="nav-link login-btn" @click="loginVisible = true">登录</span>
        <span class="nav-link" @click="router.push('/register')">注册</span>
      </template>
    </div>

    <div class="container">
      <!-- 从好友列表 / 用户列表 / 搜索结果进来时，给一条回到上级的路 -->
      <div class="back-bar">
        <span class="back-link" @click="goBack">← 返回</span>
        <span class="back-link home-link" @click="router.push('/home')">首页</span>
      </div>
      <div v-loading="loading">
        <div v-if="notFound" class="card empty">该用户不存在</div>

        <template v-else>
          <div class="card user-header">
            <img v-if="user.avatar" :src="user.avatar" class="user-avatar" @error="user.avatar = ''" />
            <div v-else class="user-avatar avatar-placeholder">{{ user.username ? user.username[0].toUpperCase() : 'U' }}</div>
            <div class="profile-info">
              <div class="username-row">
                <div class="username">{{ user.username }}</div>
                <span v-if="user.userNo" class="user-no">ID {{ user.userNo }}</span>
                <span class="level-badge" :class="'lv' + level.level">Lv{{ level.level }} · {{ level.name }}</span>
                <div class="role-tag" :class="user.role === 'ADMIN' ? 'admin' : 'user'">
                  {{ user.role === 'ADMIN' ? '管理员' : '普通用户' }}
                </div>
              </div>
              <div class="stats">
                <div class="stat"><span class="num">{{ user.postCount }}</span><span class="label">已发布</span></div>
                <div class="stat"><span class="num">{{ user.commentCount }}</span><span class="label">回复</span></div>
                <div class="stat"><span class="num">{{ level.exp }}</span><span class="label">活跃值</span></div>
              </div>
              <div class="level-progress">
                <div class="progress-track">
                  <div class="progress-bar" :class="'lv' + level.level" :style="{ width: level.progress + '%' }"></div>
                </div>
                <span class="level-tip">
                  {{ level.max ? '已达最高等级 Lv6' : `距 Lv${level.level + 1} 还需 ${level.toNext} 活跃值（发帖 +3 / 回复 +1）` }}
                </span>
              </div>
              <div class="joined">注册于 {{ formatTime(user.createdAt) }}</div>
              <div class="profile-actions">
                <!-- 自己的主页：不显示私聊/加好友，避免对自己发起这些操作 -->
                <template v-if="isSelf">
                  <el-button size="small" type="primary" @click="router.push('/profile')">编辑我的主页</el-button>
                </template>
                <template v-else>
                  <el-button size="small" type="primary" @click="startChat">私聊</el-button>
                  <el-button v-if="relation === 'friend'" size="small" @click="removeFriend">删除好友</el-button>
                  <el-button v-else-if="relation === 'pending'" size="small" disabled>申请已发送</el-button>
                  <el-button v-else-if="relation === 'incoming'" size="small" @click="router.push('/chat?tab=request')">处理申请</el-button>
                  <el-button v-else size="small" @click="addFriend">添加好友</el-button>
                </template>
              </div>
              <div v-if="tribes.length" class="tribe-list">
                <span class="tribe-row-label">加入的部落</span>
                <span v-for="t in tribes" :key="t.id" class="tribe-chip" @click="router.push(`/home?tribe=${t.id}`)">
                  <img v-if="t.avatar" :src="t.avatar" class="chip-avatar" @error="t.avatar = ''" />
                  {{ t.name }}
                  <RoleTag :role="t.myRole" />
                </span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="section-title">{{ isSelf ? '我的帖子' : 'TA 的帖子' }}</div>
            <div v-if="postsHidden" class="empty">{{ isSelf ? '你' : '该用户' }}已设置隐藏帖子列表</div>
            <div v-else-if="posts.length === 0" class="empty">还没有发布过帖子</div>
            <div v-for="post in posts" :key="post.id" class="post-item" @click="router.push(`/post/${post.id}`)">
              <div class="post-title-row">
                <span class="board-tag">{{ post.boardName || '综合' }}</span>
                <span class="post-title">{{ post.title }}</span>
              </div>
              <div class="post-meta">
                <span>{{ formatTime(post.createdAt) }}</span>
                <span>评论 {{ post.commentCount || 0 }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="footer">积极交流，友善发言，违规评论与投票一经发现直接删除！</div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '../utils/http'
import NotificationBell from '../components/NotificationBell.vue'
import TribeMenu from '../components/TribeMenu.vue'
import RoleTag from '../components/RoleTag.vue'
import { requireAuth, loginVisible, isLoggedIn, currentUsername, currentRole, currentAvatar, currentUserId } from '../composables/auth'
import { calcLevel } from '../utils/level'

const route = useRoute()
const router = useRouter()
// 返回上一级（好友列表 / 用户列表 / 帖子详情等）；直接输网址进来时没有历史，回首页
const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/home')
}
const loading = ref(false)
const notFound = ref(false)
const user = ref({})
const posts = ref([])
const postsHidden = ref(false)
const tribes = ref([])

const role = currentRole
const loggedIn = isLoggedIn
const level = computed(() => calcLevel(user.value.postCount, user.value.commentCount, user.value.exp))
// 访问的是自己的主页（例如从聊天搜索结果点自己的头像进来）
const isSelf = computed(() => !!user.value.id && Number(user.value.id) === Number(currentUserId.value))

const loadUser = async () => {
  loading.value = true
  notFound.value = false
  try {
    const res = await http.get(`/user/${route.params.id}/profile`)
    if (res.data.code === 200) {
      user.value = res.data.data || {}
      // 访问的其实是自己：直接切到「我的主页」，避免出现私聊/加好友这类对自己无意义的操作
      if (isSelf.value) {
        router.replace('/profile')
        return
      }
      posts.value = res.data.data.posts || []
      postsHidden.value = !!res.data.data.postsHidden
      tribes.value = res.data.data.tribes || []
      await loadRelation()
    } else {
      notFound.value = true
    }
  } catch (e) {
    notFound.value = true
    ElMessage.error('用户信息加载失败')
  } finally {
    loading.value = false
  }
}

const goCreate = async () => {
  if (!await requireAuth()) return
  router.push('/create')
}

// 与当前访问用户的关系：friend / pending(我发出待处理) / incoming(对方申请待我处理) / none
const relation = ref('none')

const loadRelation = async () => {
  if (!loggedIn.value || !user.value.id || isSelf.value) return
  try {
    const [f, sent, incoming] = await Promise.all([
      http.get(`/friend/check/${user.value.id}`),
      http.get('/friend/sent'),
      http.get('/friend/requests')
    ])
    relation.value = f.data.data?.isFriend
      ? 'friend'
      : (sent.data.data || []).some(r => Number(r.userId) === Number(user.value.id))
        ? 'pending'
        : (incoming.data.data || []).some(r => Number(r.userId) === Number(user.value.id))
          ? 'incoming'
          : 'none'
  } catch (e) {
    console.error('加载好友关系失败:', e)
  }
}

const startChat = async () => {
  if (!await requireAuth()) return
  router.push(`/chat?user=${route.params.id}`)
}

const addFriend = async () => {
  if (!await requireAuth()) return
  try {
    const { value } = await ElMessageBox.prompt('发送好友申请', '添加好友', {
      inputPlaceholder: '可以留一句自我介绍（可留空）',
      inputValue: ''
    }).catch(() => ({ value: undefined }))
    if (value === undefined) return
    const res = await http.post(`/friend/request/${route.params.id}`, { message: value || '' })
    if (res.data.code === 200) {
      ElMessage.success('申请已发送')
      relation.value = 'pending'
    } else ElMessage.error(res.data.message || '发送失败')
  } catch (e) {
    if (e?.response) ElMessage.error(e.response.data?.message || '发送失败')
  }
}

const removeFriend = async () => {
  try {
    await http.delete(`/friend/${route.params.id}`)
    ElMessage.success('已删除好友')
    relation.value = 'none'
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const goMyPosts = async () => {
  if (!await requireAuth()) return
  router.push('/my-posts')
}

const formatTime = (t) => t ? new Date(t).toLocaleString() : ''

onMounted(loadUser)
watch(() => route.params.id, loadUser)
</script>

<style scoped>
/* 返回上级：好友列表 / 用户列表 / 搜索结果跳进来后可以原路退回 */
.back-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}
.back-link {
  font-size: 13px;
  color: #666;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}
.back-link:hover { color: #4e6ef2; background: #f2f6ff; }
.home-link { color: #909399; }

.user-header {
  display: flex;
  gap: 24px;
  align-items: center;
  margin-bottom: 14px;
}
.user-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
  flex-shrink: 0;
  display: block;
}
.avatar-placeholder {
  background: #4e6ef2;
  color: #fff;
  font-size: 36px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 注意：不要叫 .user-info，App.vue 里已有同名的全局导航栏样式 */
.profile-info { flex: 1; min-width: 0; }
.username-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.username { font-size: 22px; font-weight: 700; }
.user-no {
  font-size: 12px; color: #909399; background: #f5f7fa; border: 1px solid #e5e5e5;
  border-radius: 4px; padding: 2px 8px; letter-spacing: 0.5px;
}
.role-tag { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; }
.role-tag.admin { background: #fef0f0; color: #f56c6c; }
.role-tag.user { background: #ecf5ff; color: #409eff; }

.level-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}
.level-badge.lv1 { background: #b6b6b6; }
.level-badge.lv2 { background: #67c23a; }
.level-badge.lv3 { background: #409eff; }
.level-badge.lv4 { background: #17b3a3; }
.level-badge.lv5 { background: #e6a23c; }
.level-badge.lv6 { background: #7c5cff; }

.stats { display: flex; gap: 28px; }
.stat { display: flex; flex-direction: column; }
.stat .num { font-size: 18px; font-weight: 700; color: #333; }
.stat .label { font-size: 12px; color: #999; }

.level-progress { margin-top: 10px; }
.progress-track { height: 8px; background: #ebeef5; border-radius: 4px; overflow: hidden; }
.progress-bar { height: 100%; border-radius: 4px; transition: width .3s; }
.progress-bar.lv1 { background: #b6b6b6; }
.progress-bar.lv2 { background: #67c23a; }
.progress-bar.lv3 { background: #409eff; }
.progress-bar.lv4 { background: #17b3a3; }
.progress-bar.lv5 { background: #e6a23c; }
.progress-bar.lv6 { background: #7c5cff; }
.level-tip { display: block; margin-top: 6px; font-size: 12px; color: #909399; }
.joined { margin-top: 8px; font-size: 12px; color: #999; }
.profile-actions { display: flex; gap: 8px; margin-top: 12px; }
.tribe-list { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.tribe-row-label { font-size: 12px; color: #999; }
.tribe-chip {
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
  background: #ecf5ff; color: #409eff; padding: 1px 8px; border-radius: 4px; font-size: 12px;
}
.chip-avatar { width: 14px; height: 14px; border-radius: 50%; object-fit: cover; }

.post-item {
  cursor: pointer;
  padding: 12px 4px;
  border-bottom: 1px solid #f0f0f0;
}
.post-item:last-child { border-bottom: none; }
.post-item:hover .post-title { color: #4e6ef2; }
.post-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.board-tag {
  flex-shrink: 0;
  font-size: 12px;
  color: #4e6ef2;
  background: #f2f6ff;
  border: 1px solid #dbe4ff;
  border-radius: 2px;
  padding: 0 6px;
}
.post-title { font-size: 15px; font-weight: 600; color: #333; }
.post-meta { display: flex; gap: 18px; color: #999; font-size: 12px; }
.login-btn { color: #4e6ef2; font-weight: 600; }
</style>
