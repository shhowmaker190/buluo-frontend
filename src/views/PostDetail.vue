<template>
  <div class="page-container">
    <div class="navbar">
      <div class="brand" @click="router.push('/home')">
        <div class="brand-logo">闲</div>
        <span>部落闲聊</span>
      </div>
      <div class="nav-links">
        <span class="nav-link" @click="router.push('/home')">首页</span>
        <span class="nav-link" @click="router.push('/create')">发帖</span>
        <span class="nav-link" @click="router.push('/my-posts')">我的帖子</span>
        <span class="nav-link" @click="router.push('/chat')">好友</span>
        <TribeMenu />
        <span v-if="role === 'ADMIN'" class="nav-link" @click="router.push('/admin')">管理后台</span>
      </div>
      <template v-if="loggedIn">
        <span class="nav-link" @click="openChangePasswordDialog">修改密码</span>
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
      <div class="back-bar">
        <span class="back-link" @click="router.push('/home')">← 返回首页</span>
      </div>

      <div v-loading="loading">
        <div v-if="detail.id" class="card post-card">
          <div class="post-head">
            <span class="board-tag">{{ detail.boardName || '综合' }}</span>
            <h1 class="post-title">{{ detail.title }}</h1>
          </div>
          <div class="post-meta">
            <img v-if="detail.avatar" :src="detail.avatar" class="owner-avatar" @click="openUser(detail.userId)" @error="detail.avatar = ''" />
            <div v-else class="owner-avatar avatar-ph" @click="openUser(detail.userId)">{{ initial(detail.username) }}</div>
            <span class="author-name" @click="openUser(detail.userId)">{{ detail.username }}</span>
            <span class="author-level" :class="'lv' + authorLevel.level">Lv{{ authorLevel.level }} · {{ authorLevel.name }}</span>
            <RoleTag :role="detail.authorTribeRole" />
            <span class="tribe-chip" @click="goTribe(detail.tribeId)">
              <img v-if="detail.tribeAvatar" :src="detail.tribeAvatar" class="chip-avatar" @error="detail.tribeAvatar = ''" />
              {{ detail.tribeName || '未分类' }}
            </span>
            <span>楼主</span>
            <span>{{ formatTime(detail.createdAt) }}</span>
          </div>
          <div class="post-content" v-html="renderContent(detail.content) || '（暂无正文）'"></div>
          <div class="post-tools">
            <el-button size="small" @click="shareVisible = true">分享给好友</el-button>
            <el-button v-if="!isOwner" size="small" :disabled="reported" @click="reportVisible = true">
              {{ reported ? '已举报，等待处理' : '举报' }}
            </el-button>
          </div>
        </div>

        <div v-if="detail.id" class="card comment-card">
          <div class="section-title">全部回复（{{ detail.commentCount || 0 }}）</div>

          <div v-if="detail.comments.length === 0" class="empty">还没有人回复，来说两句吧</div>

          <div v-for="c in detail.comments" :key="c.id" class="floor">
            <img v-if="c.avatar" :src="c.avatar" class="avatar" @click="openUser(c.userId)" @error="c.avatar = ''" />
            <div v-else class="avatar" @click="openUser(c.userId)">{{ initial(c.username) }}</div>
            <div class="floor-body">
              <div class="floor-head">
                <span class="username author-name" @click="openUser(c.userId)">{{ c.username }}</span>
                <span class="author-level" :class="'lv' + levelOf(c).level">Lv{{ levelOf(c).level }}</span>
                <RoleTag :role="c.role" />
                <span v-if="c.userId === detail.userId" class="owner-tag">楼主</span>
                <span class="floor-tag">{{ c.floor }}楼</span>
                <span class="time">{{ formatTime(c.createdAt) }}</span>
              </div>
              <div class="floor-content" v-html="renderComment(c.content)"></div>
              <div class="floor-actions">
                <span
                  class="like-action"
                  :class="{ liked: c.liked }"
                  :title="c.liked ? '再点一下取消点赞' : '点赞'"
                  @click="toggleLike(c)"
                >👍 {{ c.liked ? '已赞' : '赞' }} {{ c.likeCount || 0 }}</span>
                <span @click="startReply(c)">回复</span>
                <span v-if="canDelete(c)" class="danger" @click="deleteComment(c.id)">删除</span>
              </div>

              <div v-if="c.replies.length" class="reply-list">
                <div v-for="r in c.replies" :key="r.id" class="reply-item">
                  <div class="reply-head">
                    <img v-if="r.avatar" :src="r.avatar" class="reply-avatar" @click="openUser(r.userId)" @error="r.avatar = ''" />
                    <span v-else class="reply-avatar reply-avatar-ph" @click="openUser(r.userId)">{{ initial(r.username) }}</span>
                    <span class="username author-name" @click="openUser(r.userId)">{{ r.username }}</span>
                    <span class="author-level" :class="'lv' + levelOf(r).level">Lv{{ levelOf(r).level }}</span>
                    <RoleTag :role="r.role" />
                    <span v-if="r.userId === detail.userId" class="owner-tag">楼主</span>
                    <span class="time">{{ formatTime(r.createdAt) }}</span>
                  </div>
                  <div class="reply-content" v-html="renderComment(r.content)"></div>
                  <div class="floor-actions">
                    <span
                      class="like-action"
                      :class="{ liked: r.liked }"
                      :title="r.liked ? '再点一下取消点赞' : '点赞'"
                      @click="toggleLike(r)"
                    >👍 {{ r.liked ? '已赞' : '赞' }} {{ r.likeCount || 0 }}</span>
                    <span @click="startReply(c, r)">回复</span>
                    <span v-if="canDelete(r)" class="danger" @click="deleteComment(r.id)">删除</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="composer">
            <div v-if="replyTo" class="replying-tip">
              回复 @{{ replyTo.username }}
              <span class="cancel-reply" @click="cancelReply">取消</span>
            </div>
            <el-input
              v-model="commentContent"
              type="textarea"
              :rows="4"
              :disabled="!loggedIn"
              :placeholder="loggedIn ? (replyTo ? `回复 @${replyTo.username}` : '友善发言，理性讨论') : '登录后即可发表回复'"
              @focus="focusComposer"
            />
            <div v-if="pendingImages.length" class="image-preview">
              <div v-for="(url, i) in pendingImages" :key="url" class="preview-item">
                <img :src="url" class="preview-img" />
                <span class="preview-remove" @click="removePendingImage(i)">×</span>
              </div>
            </div>
            <div class="composer-actions">
              <template v-if="loggedIn">
                <el-upload
                  :show-file-list="false"
                  :http-request="uploadCommentImage"
                  accept="image/*"
                >
                  <el-button size="small" :icon="Picture" :loading="uploading">图片</el-button>
                </el-upload>
                <EmojiPicker @select="insertEmoji" />
              </template>
              <span v-if="loggedIn" class="composer-tip">支持表情与图片，图片会附在文字下方</span>
              <el-button v-if="!loggedIn" type="primary" size="small" @click="openLogin">登录后发言</el-button>
              <el-button v-else type="primary" size="small" :loading="submitting" @click="addComment">发表回复</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">积极交流，友善发言，违规评论与投票一经发现直接删除！</div>

    <el-dialog title="修改密码" v-model="dialogVisible" width="400px">
      <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="90px">
        <el-form-item label="原密码" prop="oldPassword"><el-input type="password" v-model="pwdForm.oldPassword" show-password /></el-form-item>
        <el-form-item label="新密码" prop="newPassword"><el-input type="password" v-model="pwdForm.newPassword" show-password /></el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword"><el-input type="password" v-model="pwdForm.confirmPassword" show-password /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="submitChangePassword">确认</el-button></template>
    </el-dialog>

    <ShareDialog
      v-model="shareVisible"
      target-type="post"
      :target-id="detail.id"
      :target-title="detail.title"
    />
    <ReportDialog
      v-model="reportVisible"
      target-type="POST"
      :target-id="detail.id"
      :target-title="detail.title"
      @reported="reported = true"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import http from '../utils/http'
import NotificationBell from '../components/NotificationBell.vue'
import TribeMenu from '../components/TribeMenu.vue'
import RoleTag from '../components/RoleTag.vue'
import EmojiPicker from '../components/EmojiPicker.vue'
import ShareDialog from '../components/ShareDialog.vue'
import ReportDialog from '../components/ReportDialog.vue'
import { requireAuth, loginVisible, isLoggedIn, currentUsername, currentRole, currentUserId, currentAvatar, clearAuth } from '../composables/auth'
import { calcLevel } from '../utils/level'
import { renderEmoji } from '../utils/emoji'

const route = useRoute()
const router = useRouter()
const postId = route.params.id
const loading = ref(false)
const detail = ref({ id: null, comments: [], commentCount: 0, userId: null, title: '' })
const commentContent = ref('')
const replyTo = ref(null)
const authorLevel = computed(() => calcLevel(detail.value.authorPostCount, detail.value.authorCommentCount, detail.value.authorExp))
const levelOf = (comment) => calcLevel(comment.authorPostCount, comment.authorCommentCount, comment.authorExp)

const goTribe = (tribeId) => {
  if (tribeId) router.push(`/home?tribe=${tribeId}`)
}

// 点自己的头像进个人主页，点别人的进 TA 的主页
const openUser = (userId) => {
  if (!userId) return
  if (Number(userId) === Number(currentUserId.value)) router.push('/profile')
  else router.push(`/user/${userId}`)
}
const role = currentRole
const loggedIn = isLoggedIn
const dialogVisible = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdFormRef = ref()
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码' }],
  newPassword: [{ required: true, min: 6, message: '新密码至少6位' }],
  confirmPassword: [{ required: true, validator: (r, v, cb) => v === pwdForm.value.newPassword ? cb() : cb(new Error('不一致')) }]
}

const loadDetail = async () => {
  loading.value = true
  try {
    const res = await http.get(`/post/${postId}`)
    if (res.data.code === 200) {
      detail.value = res.data.data
    } else {
      ElMessage.error(res.data.message || '帖子不存在')
      router.push('/home')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '帖子加载失败')
  } finally {
    loading.value = false
  }
}

const initial = (name) => (name || '?').charAt(0).toUpperCase()

/**
 * 先整体转义，再按需放行两类内容：
 * 1) 上传功能写入的 <img src="..." />；2) [表情标签]。
 * 其余所有标签都会原样显示为文本，避免 v-html 带来的 XSS。
 */
const renderContent = (text) => {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  const withImage = escaped.replace(
    /&lt;img src=&quot;([^&]+?)&quot; \/&gt;/g,
    '<img src="$1" class="content-img" />'
  )
  return renderEmoji(withImage)
}

// 评论与正文共用同一套渲染规则
const renderComment = renderContent

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  return date.toLocaleString()
}

const canDelete = (comment) =>
  Number(comment.userId) === currentUserId.value || currentUserId.value === detail.value.userId || role.value === 'ADMIN'

const startReply = (root, reply) => {
  replyTo.value = { id: root.id, username: reply ? reply.username : root.username }
}

const cancelReply = () => {
  replyTo.value = null
  commentContent.value = ''
}

// 待发布的图片：先上传拿到 URL，发表时统一拼到文字后面（文字在上、图片在下）
const pendingImages = ref([])
const uploading = ref(false)
const submitting = ref(false)

const buildContent = () => {
  const text = commentContent.value.trim()
  const images = pendingImages.value.map(url => `<img src="${url}" />`).join('')
  if (!text && !images) return ''
  return text ? text + images : images
}

const addComment = async () => {
  const content = buildContent()
  if (!content) return ElMessage.warning('请输入回复内容或添加图片')
  submitting.value = true
  try {
    const res = await http.post('/post/comment', {
      postId: Number(postId),
      content,
      parentId: replyTo.value ? replyTo.value.id : null
    })
    if (res.data.code === 200) {
      ElMessage.success('回复成功')
      commentContent.value = ''
      pendingImages.value = []
      cancelReply()
      await loadDetail()
    } else {
      ElMessage.error(res.data.message || '回复失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '回复失败')
  } finally {
    submitting.value = false
  }
}

const uploadCommentImage = async (opts) => {
  const file = opts.file
  if (!file.type.startsWith('image/')) { ElMessage.error('请上传图片文件'); return }
  if (file.size > 10 * 1024 * 1024) { ElMessage.error('图片不能超过 10MB'); return }
  if (pendingImages.value.length >= 3) { ElMessage.warning('单条回复最多 3 张图片'); return }
  uploading.value = true
  const fd = new FormData()
  fd.append('file', file)
  try {
    // 复用正文图片接口：等比缩放，不裁剪
    const res = await http.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data.code === 200) pendingImages.value.push(res.data.data.url)
    else ElMessage.error(res.data.message || '上传失败')
  } catch (e) {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}

const removePendingImage = (index) => {
  pendingImages.value.splice(index, 1)
}

// 在光标位置插入表情标签，没有光标信息时追加到末尾
const insertEmoji = (tag) => {
  const el = document.querySelector('.composer textarea')
  if (el && typeof el.selectionStart === 'number') {
    const start = el.selectionStart
    const end = el.selectionEnd
    commentContent.value =
      commentContent.value.slice(0, start) + tag + commentContent.value.slice(end)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + tag.length
      el.setSelectionRange(pos, pos)
    })
    return
  }
  commentContent.value += tag
}

const deleteComment = async (commentId) => {
  try {
    await ElMessageBox.confirm('确定删除这条评论吗？', '提示', { type: 'warning' })
  } catch {
    return
  }
  if (role.value === 'ADMIN') await http.delete(`/admin/comment/${commentId}`)
  else await http.delete(`/post/comment/${commentId}`)
  ElMessage.success('删除成功')
  await loadDetail()
}

// 正在请求中的评论 id，防止连点重复提交
const liking = new Set()

/**
 * 点赞 / 取消点赞：先本地翻转（点下去立刻有反馈），失败再回滚并提示。
 * 之前是「发请求 → 重新拉整页」，一旦请求失败用户会以为按钮没反应、取消不了。
 */
const toggleLike = async (comment) => {
  if (liking.has(comment.id)) return
  liking.add(comment.id)

  const wasLiked = !!comment.liked
  const before = comment.likeCount || 0
  comment.liked = !wasLiked
  comment.likeCount = wasLiked ? Math.max(before - 1, 0) : before + 1

  try {
    const res = wasLiked
      ? await http.delete(`/post/comment/like/${comment.id}`)
      : await http.post(`/post/comment/like/${comment.id}`)
    if (res.data.code !== 200) throw new Error(res.data.message || '操作失败')
    if (wasLiked) ElMessage.success('已取消点赞')
  } catch (e) {
    // 回滚到点击前的状态
    comment.liked = wasLiked
    comment.likeCount = before
    ElMessage.error(e.response?.data?.message || e.message || '操作失败，请稍后再试')
  } finally {
    liking.delete(comment.id)
  }
}

const logout = () => {
  clearAuth()
  router.push('/home')
}

const openChangePasswordDialog = () => { pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }; dialogVisible.value = true }

// ===== 分享 / 举报 =====
const shareVisible = ref(false)
const reportVisible = ref(false)
const reported = ref(false)
const isOwner = computed(() =>
  !!detail.value.userId && Number(detail.value.userId) === Number(currentUserId.value)
)

const loadReportStatus = async () => {
  if (!detail.value.id || !isLoggedIn.value || isOwner.value) return
  try {
    const res = await http.get('/report/status', {
      params: { targetType: 'POST', targetId: detail.value.id }
    })
    reported.value = !!res.data.data?.pending
  } catch (e) {
    // 查询失败不影响页面，举报按钮仍可用（后端会拦重复举报）
  }
}

const submitChangePassword = async () => {
  try { await pwdFormRef.value.validate() } catch { return }
  const res = await http.post('/user/changePassword', { oldPassword: pwdForm.value.oldPassword, newPassword: pwdForm.value.newPassword })
  if (res.data.code === 200) { ElMessage.success('修改成功，请重新登录'); clearAuth(); router.push('/home') }
  else ElMessage.error(res.data.message)
}

onMounted(async () => {
  await loadDetail()
  loadReportStatus()
})
</script>

<style scoped>
.back-bar {
  margin-bottom: 12px;
}

.back-link {
  color: #666;
  font-size: 13px;
  cursor: pointer;
}

.back-link:hover {
  color: #4e6ef2;
}

.post-card {
  padding: 22px 24px;
}

.post-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.board-tag {
  flex-shrink: 0;
  font-size: 12px;
  color: #4e6ef2;
  background: #f2f6ff;
  border: 1px solid #dbe4ff;
  border-radius: 2px;
  padding: 0 7px;
}

.post-title {
  font-size: 21px;
  line-height: 1.4;
  color: #222;
}

.post-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  color: #999;
  font-size: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 16px;
}

.author-level {
  padding: 0 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  line-height: 16px;
}
.author-level.lv1 { background: #b6b6b6; }
.author-level.lv2 { background: #67c23a; }
.author-level.lv3 { background: #409eff; }
.author-level.lv4 { background: #17b3a3; }
.author-level.lv5 { background: #e6a23c; }
.author-level.lv6 { background: #7c5cff; }

.post-content {
  font-size: 15px;
  line-height: 1.9;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}
/* 帖子底部：分享 / 举报 */
.post-tools {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px dashed #eee;
}
/* 正文与评论里的图片：竖排（一张一行，从上到下），并保留原图宽高比 */
.post-content :deep(img),
.floor-content :deep(img),
.reply-content :deep(img) {
  display: block;
  max-width: 100% !important;
  height: auto !important;
  border-radius: 6px;
  margin: 10px 0;
}

/* 表情：与文字等高，避免撑乱行距 */
.post-content :deep(.bili-emo),
.floor-content :deep(.bili-emo),
.reply-content :deep(.bili-emo) {
  font-size: 20px;
  line-height: 1;
  vertical-align: -0.15em;
  margin: 0 1px;
}

.comment-card {
  margin-top: 14px;
}

.floor {
  display: flex;
  gap: 12px;
  padding: 18px 0;
  border-bottom: 1px solid #f0f0f0;
}

.floor:last-of-type {
  border-bottom: none;
}

.avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 4px;
  background: #eef2ff;
  color: #4e6ef2;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  object-fit: cover;
  cursor: pointer;
}

.tribe-chip {
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
  background: #ecf5ff; color: #409eff; padding: 1px 8px; border-radius: 4px; font-size: 12px;
}
.chip-avatar { width: 14px; height: 14px; border-radius: 50%; object-fit: cover; }

.owner-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-ph {
  background: #4e6ef2;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.author-name {
  cursor: pointer;
}

.author-name:hover {
  color: #4e6ef2;
}

.meta-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  vertical-align: middle;
}
.meta-avatar-placeholder {
  display: inline-flex;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #4e6ef2;
  color: #fff;
  font-size: 12px;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  margin-right: 4px;
}

.floor-body {
  flex: 1;
  min-width: 0;
}

.floor-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.username {
  color: #4e6ef2;
  font-size: 13px;
  font-weight: 600;
}

.owner-tag {
  font-size: 11px;
  color: #fff;
  background: #4e6ef2;
  border-radius: 2px;
  padding: 0 5px;
}

.floor-tag {
  font-size: 11px;
  color: #999;
  border: 1px solid #e5e5e5;
  border-radius: 2px;
  padding: 0 5px;
}

.time {
  color: #bbb;
  font-size: 12px;
}

.floor-content {
  font-size: 14px;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.floor-actions {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  color: #999;
  font-size: 12px;
}

.floor-actions span {
  cursor: pointer;
}

.floor-actions span:hover {
  color: #4e6ef2;
}

.floor-actions .danger:hover {
  color: #d9534f;
}

/* 点赞：点一下赞，再点一下取消（已赞状态橙色高亮） */
.like-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 10px;
  transition: background 0.15s, color 0.15s;
}
.like-action:hover { background: #f2f6ff; color: #4e6ef2; }
.like-action.liked {
  color: #e6a23c;
  font-weight: 600;
  background: #fdf6ec;
}
.like-action.liked:hover { background: #faecd8; color: #d48806; }

.reply-list {
  margin-top: 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 4px 14px;
}

.reply-item {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.reply-item:last-child {
  border-bottom: none;
}

.reply-avatar {
  width: 22px; height: 22px; border-radius: 50%; object-fit: cover; cursor: pointer; flex-shrink: 0;
}
.reply-avatar-ph {
  background: #4e6ef2; color: #fff; font-size: 11px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.reply-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.reply-content {
  font-size: 13px;
  color: #444;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.composer {
  padding-top: 18px;
}

.replying-tip {
  font-size: 12px;
  color: #4e6ef2;
  background: #f2f6ff;
  border: 1px solid #dbe4ff;
  border-radius: 4px;
  padding: 6px 10px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}

.cancel-reply {
  color: #999;
  cursor: pointer;
}

.composer-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.composer-tip {
  flex: 1;
  font-size: 12px;
  color: #bbb;
  text-align: left;
}

/* 待发布图片：纵向排列，一张一行，可移除 */
.image-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.preview-item {
  position: relative;
  align-self: flex-start;
}
.preview-img {
  display: block;
  max-width: 200px;
  max-height: 160px;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
}
.preview-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 18px;
  height: 18px;
  line-height: 17px;
  text-align: center;
  border-radius: 50%;
  background: #f56c6c;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
</style>
