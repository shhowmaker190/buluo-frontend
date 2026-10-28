<template>
  <div class="profile-page">
    <div class="back-bar">
      <span class="back-link" @click="goBack">← 返回</span>
      <span class="back-link home-link" @click="router.push('/home')">首页</span>
    </div>

    <div class="profile-header">
      <div class="avatar-wrap">
        <img v-if="profile.avatar" :src="profile.avatar" class="avatar" @error="profile.avatar = ''" />
        <div v-else class="avatar avatar-placeholder">{{ profile.username ? profile.username[0].toUpperCase() : 'U' }}</div>
        <el-upload
          class="avatar-uploader"
          :show-file-list="false"
          :http-request="uploadAvatar"
          accept="image/*"
        >
          <div class="upload-mask">
            <el-icon><Camera /></el-icon>
            <span>更换头像</span>
          </div>
        </el-upload>
      </div>
      <!-- 注意：不要叫 .user-info，App.vue 里已有同名全局导航栏样式（flex + nowrap），会把这里挤成一行 -->
      <div class="profile-info">
        <div class="username-row">
          <div class="username">{{ profile.username }}</div>
          <span v-if="profile.userNo" class="user-no" @click="copyUserNo">ID {{ profile.userNo }}</span>
          <span class="level-badge" :class="'lv' + level.level">Lv{{ level.level }} · {{ level.name }}</span>
          <div class="role-tag" :class="profile.role === 'ADMIN' ? 'admin' : 'user'">{{ profile.role === 'ADMIN' ? '管理员' : '普通用户' }}</div>
          <el-button size="small" text type="primary" class="rename-btn" @click="openRename">修改用户名</el-button>
        </div>
        <div v-if="renameState.status === 0" class="rename-tip">
          改名申请审核中：「{{ renameState.newName }}」，管理员通过后生效
        </div>
        <div v-else-if="renameState.status === 2" class="rename-tip rejected">
          上次改名「{{ renameState.newName }}」未通过{{ renameState.rejectReason ? '：' + renameState.rejectReason : '' }}
        </div>
        <div class="stats">
          <div class="stat"><span class="num">{{ profile.postCount }}</span><span class="label">已发布</span></div>
          <div class="stat"><span class="num">{{ profile.commentCount }}</span><span class="label">回复</span></div>
          <div v-if="profile.pendingCount" class="stat"><span class="num">{{ profile.pendingCount }}</span><span class="label">待审核</span></div>
          <div class="stat"><span class="num">{{ level.exp }}</span><span class="label">活跃值</span></div>
        </div>
        <div class="level-progress">
          <div class="progress-track">
            <div class="progress-bar" :class="'lv' + level.level" :style="{ width: level.progress + '%' }"></div>
          </div>
          <span class="level-tip">
            {{ level.max ? '已达最高等级 Lv6' : `距 Lv${level.level + 1} 还需 ${level.toNext} 活跃值（发帖 +3 / 回复 +1 / 签到 +5）` }}
          </span>
        </div>
        <div v-if="tribes.length" class="tribe-list">
          <span class="tribe-row-label">我的部落</span>
          <span v-for="t in tribes" :key="t.id" class="tribe-chip" @click="router.push(`/home?tribe=${t.id}`)">
            <img v-if="t.avatar" :src="t.avatar" class="chip-avatar" @error="t.avatar = ''" />
            {{ t.name }}
            <RoleTag :role="t.myRole" />
          </span>
        </div>
      </div>
    </div>

    <div class="profile-body">
      <div class="section-head">
        <div class="section-title">我的帖子</div>
        <div class="privacy">
          <span class="privacy-label">在主页公开帖子列表</span>
          <el-switch v-model="postsPublicOn" size="small" />
        </div>
      </div>
      <div v-if="!postsPublicOn" class="privacy-tip">当前已隐藏：其他人访问你的主页时只看到等级与统计，看不到帖子列表（你自己始终可见）</div>
      <div v-if="myPosts.length === 0" class="empty">还没有发过帖子</div>
      <div v-for="post in myPosts" :key="post.id" class="post-item" @click="router.push(`/post/${post.id}`)">
        <div class="post-title">{{ post.title }}</div>
        <div class="post-meta">
          <span class="board-tag">{{ post.boardName || '综合' }}</span>
          <span>{{ formatTime(post.createdAt) }}</span>
          <span>评论 {{ post.commentCount || 0 }}</span>
          <span class="status" :class="'status-' + post.status">
            {{ post.status === 0 ? '待审核' : post.status === 1 ? '已发布' : '已拒绝' }}
          </span>
        </div>
      </div>
    </div>

    <el-dialog v-model="renameVisible" title="修改用户名" width="420px">
      <p class="rename-hint">
        当前用户名：<b>{{ profile.username }}</b><br />
        提交后需管理员审核，通过后才会生效；审核期间用户名保持不变。
      </p>
      <el-input
        v-model="newName"
        maxlength="20"
        show-word-limit
        placeholder="2~20 位中文、字母、数字或下划线"
        @keyup.enter="submitRename"
      />
      <template #footer>
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" :loading="renameSubmitting" @click="submitRename">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import http from '../utils/http'
import { updateAvatar, currentUsername } from '../composables/auth'
import { calcLevel } from '../utils/level'
import RoleTag from '../components/RoleTag.vue'

const router = useRouter()
// 主页没有导航栏，这里给一个返回入口：有历史就回上一页，直接打开的则回首页
const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/home')
}
const profile = reactive({
  id: null,
  username: '',
  email: '',
  avatar: '',
  role: '',
  createdAt: '',
  postCount: 0,
  pendingCount: 0,
  commentCount: 0,
  postsPublic: 1
})
const myPosts = reactive([])
const tribes = ref([])
// 点击复制自己的 6 位 ID，方便告诉别人来搜索
const copyUserNo = async () => {
  if (!profile.userNo) return
  try {
    await navigator.clipboard.writeText(profile.userNo)
    ElMessage.success('已复制 ID：' + profile.userNo)
  } catch (e) {
    ElMessage.info('你的 ID 是 ' + profile.userNo)
  }
}

const level = computed(() => calcLevel(profile.postCount, profile.commentCount, profile.exp))

// 主页帖子列表是否对他人公开（0=隐藏，1=公开）
const postsPublicOn = computed({
  get: () => profile.postsPublic !== 0,
  set: (val) => savePostsVisibility(val)
})

const savePostsVisibility = async (visible) => {
  try {
    const res = await http.post('/user/posts-visibility', { visible })
    if (res.data.code === 200) {
      profile.postsPublic = res.data.data.postsPublic
      ElMessage.success(visible ? '已公开帖子列表' : '已隐藏帖子列表')
    } else {
      ElMessage.error(res.data.message || '设置失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '设置失败')
  }
}

const loadProfile = async () => {
  const res = await http.get('/user/profile')
  if (res.data.code === 200) {
    Object.assign(profile, res.data.data)
    tribes.value = res.data.data.tribes || []
    // 改名通过后这里会把导航栏的旧名字同步过来
    if (res.data.data.username) currentUsername.value = res.data.data.username
  }
}
const loadMyPosts = async () => {
  const res = await http.get('/post/my')
  if (res.data.code === 200) myPosts.splice(0, myPosts.length, ...(res.data.data || []))
}

// ===== 改名申请（提交后由管理员审核） =====
const renameVisible = ref(false)
const renameSubmitting = ref(false)
const newName = ref('')
const renameState = reactive({ status: null, newName: '', rejectReason: '' })

const loadRenameState = async () => {
  try {
    const res = await http.get('/rename/latest')
    const d = res.data.data || {}
    renameState.status = d.status === undefined ? null : d.status
    renameState.newName = d.newName || ''
    renameState.rejectReason = d.rejectReason || ''
  } catch (e) {
    // 忽略：不影响主页展示
  }
}

const openRename = () => {
  if (renameState.status === 0) {
    ElMessage.info('你有一条改名申请正在审核中')
    return
  }
  newName.value = ''
  renameVisible.value = true
}

const submitRename = async () => {
  const name = newName.value.trim()
  if (!name) {
    ElMessage.warning('请输入新用户名')
    return
  }
  renameSubmitting.value = true
  try {
    const res = await http.post('/rename', { newName: name })
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || '申请已提交，等待管理员审核')
      renameVisible.value = false
      await loadRenameState()
    } else {
      ElMessage.error(res.data.message || '提交失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败')
  } finally {
    renameSubmitting.value = false
  }
}

const uploadAvatar = async (opts) => {
  const file = opts.file
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('头像不能超过 10MB')
    return
  }
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await http.post('/upload/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data.code === 200) {
      const url = res.data.data.url
      await http.post('/user/avatar', { avatar: url })
      profile.avatar = url
      updateAvatar(url)
      ElMessage.success('头像更新成功')
    } else ElMessage.error(res.data.message)
  } catch (e) {
    ElMessage.error('上传失败')
  }
}

const formatTime = (t) => t ? new Date(t).toLocaleString() : ''

onMounted(() => { loadProfile(); loadMyPosts(); loadRenameState() })
</script>

<style scoped>
.profile-page { max-width: 960px; margin: 24px auto; padding: 0 16px; }
/* 返回入口：主页整页没有导航栏，必须自带宽度的返回按钮 */
.back-bar {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 12px;
}
.back-link {
  font-size: 13px; color: #666; cursor: pointer;
  padding: 2px 8px; border-radius: 4px; transition: all 0.15s;
}
.back-link:hover { color: #4e6ef2; background: #f2f6ff; }
.home-link { color: #909399; }

.profile-header {
  display: flex;
  gap: 24px;
  align-items: center;
  background: linear-gradient(135deg, #fff 0%, #f5f9ff 100%);
  padding: 28px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
  margin-bottom: 20px;
}
.avatar-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
}
.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
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
.avatar-uploader { position: absolute; inset: 0; }
.upload-mask {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(0,0,0,.5);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0;
  transition: opacity .2s;
  cursor: pointer;
}
.avatar-wrap:hover .upload-mask { opacity: 1; }
.profile-info { flex: 1; min-width: 0; }
.username-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.username { font-size: 22px; font-weight: 700; }
.user-no {
  font-size: 12px; color: #909399; background: #f5f7fa; border: 1px solid #e5e5e5;
  border-radius: 4px; padding: 2px 8px; letter-spacing: 0.5px; cursor: pointer;
}
.user-no:hover { color: #4e6ef2; border-color: #c9d4f5; }
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

.level-progress { margin-top: 10px; }
.progress-track {
  height: 8px;
  background: #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar { height: 100%; border-radius: 4px; transition: width .3s; }
.progress-bar.lv1 { background: #b6b6b6; }
.progress-bar.lv2 { background: #67c23a; }
.progress-bar.lv3 { background: #409eff; }
.progress-bar.lv4 { background: #17b3a3; }
.progress-bar.lv5 { background: #e6a23c; }
.progress-bar.lv6 { background: #7c5cff; }
.level-tip { display: block; margin-top: 6px; font-size: 12px; color: #909399; }

.tribe-list { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.tribe-row-label { font-size: 12px; color: #999; }
.tribe-chip {
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
  background: #ecf5ff; color: #409eff; padding: 1px 8px; border-radius: 4px; font-size: 12px;
}
.chip-avatar { width: 14px; height: 14px; border-radius: 50%; object-fit: cover; }
.stats { display: flex; gap: 32px; }
.stat { display: flex; flex-direction: column; }
.stat .num { font-size: 22px; font-weight: 700; color: #4e6ef2; }
.stat .label { font-size: 12px; color: #999; margin-top: 2px; }
.profile-body { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.section-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; padding-left: 10px; border-left: 3px solid #4e6ef2; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.section-head .section-title { margin-bottom: 12px; }
.privacy { display: flex; align-items: center; gap: 8px; padding-bottom: 12px; }
.privacy-label { font-size: 13px; color: #606266; }
.privacy-tip {
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  border: 1px solid #f5dab1;
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 12px;
}
.post-item { padding: 14px 12px; border-radius: 8px; cursor: pointer; transition: background .15s; }
.post-item:hover { background: #f5f7fa; }
.post-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; color: #303133; }
.post-meta { display: flex; gap: 14px; font-size: 12px; color: #909399; align-items: center; }
.board-tag { background: #ecf5ff; color: #409eff; padding: 1px 8px; border-radius: 4px; }
.status-0 { color: #e6a23c; }
.status-1 { color: #67c23a; }
.status-2 { color: #f56c6c; }
.empty { color: #909399; text-align: center; padding: 40px 0; font-size: 14px; }

/* 改名 */
.rename-btn { padding: 0; height: auto; font-size: 12px; }
.rename-tip {
  margin-top: 6px; font-size: 12px; color: #e6a23c;
  background: #fdf6ec; border: 1px solid #f5dab1; border-radius: 4px;
  padding: 4px 10px; display: inline-block;
}
.rename-tip.rejected { color: #f56c6c; background: #fef0f0; border-color: #fbc4c4; }
.rename-hint { font-size: 13px; color: #606266; line-height: 1.7; margin: 0 0 12px; }
</style>
