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
        <span class="nav-link active" @click="router.push('/my-posts')">我的帖子</span>
        <span class="nav-link" @click="router.push('/chat')">好友</span>
        <TribeMenu />
        <span v-if="role === 'ADMIN'" class="nav-link" @click="router.push('/admin')">管理后台</span>
      </div>
      <span class="nav-link" @click="openChangePasswordDialog">修改密码</span>
      <span class="nav-link" @click="logout">退出</span>
      <span class="user-info" @click="router.push('/profile')" style="cursor:pointer">
          <img v-if="currentAvatar" :src="currentAvatar" class="nav-avatar" @error="currentAvatar = ''" />
          <span v-else class="nav-avatar-placeholder">{{ currentUsername ? currentUsername[0].toUpperCase() : 'U' }}</span>
          {{ currentUsername }}
        </span>
      <NotificationBell />
    </div>

    <div class="container">
      <div class="card">
        <div class="section-title">我发布的帖子</div>
        <div v-if="posts.length === 0" class="empty">你还没有发过帖子，<router-link to="/create">去发一帖</router-link></div>
        <div v-for="post in posts" :key="post.id" class="my-post">
          <div class="my-post-main">
            <div class="my-post-title">
              <span class="post-title" @click="openPost(post)">{{ post.title }}</span>
              <el-tag v-if="post.status === 0" type="warning" size="small">待审核</el-tag>
              <el-tag v-else-if="post.status === 1" type="success" size="small">已通过</el-tag>
              <el-tag v-else-if="post.status === 2" type="danger" size="small">已拒绝</el-tag>
            </div>
            <div class="my-post-meta">
              <span>{{ formatTime(post.createdAt) }}</span>
              <span v-if="post.status === 2" class="reject-reason">拒绝原因：{{ post.rejectReason || '无' }}</span>
            </div>
          </div>
          <div class="my-post-actions">
            <el-button v-if="post.status === 1" size="small" @click="openPost(post)">查看</el-button>
            <el-button size="small" type="danger" @click="deletePost(post.id)">删除</el-button>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { currentUsername, currentRole, currentAvatar, clearAuth } from '../composables/auth'
import http from '../utils/http'
import NotificationBell from '../components/NotificationBell.vue'
import TribeMenu from '../components/TribeMenu.vue'

const router = useRouter()
const role = currentRole
const posts = ref([])
const dialogVisible = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdFormRef = ref()
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码' }],
  newPassword: [{ required: true, min: 6, message: '新密码至少6位' }],
  confirmPassword: [{ required: true, validator: (r, v, cb) => v === pwdForm.value.newPassword ? cb() : cb(new Error('不一致')) }]
}

const loadMyPosts = async () => {
  const res = await http.get('/post/my')
  posts.value = res.data.data || []
}

const openPost = (post) => {
  router.push(`/post/${post.id}`)
}

const deletePost = async (postId) => {
  try {
    await ElMessageBox.confirm('确定删除这个帖子吗？', '提示', { type: 'warning' })
  } catch {
    return
  }
  await http.delete(`/post/${postId}`)
  ElMessage.success('删除成功')
  await loadMyPosts()
}

const formatTime = (time) => time ? new Date(time).toLocaleString() : ''

const logout = () => {
  clearAuth()
  router.push('/login')
}

const openChangePasswordDialog = () => { pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }; dialogVisible.value = true }

const submitChangePassword = async () => {
  try { await pwdFormRef.value.validate() } catch { return }
  const res = await http.post('/user/changePassword', { oldPassword: pwdForm.value.oldPassword, newPassword: pwdForm.value.newPassword })
  if (res.data.code === 200) { ElMessage.success('修改成功，请重新登录'); clearAuth(); router.push('/home') }
  else ElMessage.error(res.data.message)
}

onMounted(loadMyPosts)
</script>

<style scoped>
.my-post {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}

.my-post:last-child {
  border-bottom: none;
}

.my-post-main {
  flex: 1;
  min-width: 0;
}

.my-post-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.post-title {
  font-size: 15px;
  color: #333;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-title:hover {
  color: #4e6ef2;
}

.my-post-meta {
  display: flex;
  gap: 16px;
  color: #999;
  font-size: 12px;
}

.reject-reason {
  color: #d9534f;
}

.my-post-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
</style>
