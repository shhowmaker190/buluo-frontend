<template>
  <div class="page-container">
    <div class="navbar">
      <div class="brand" @click="router.push('/home')">
        <div class="brand-logo">闲</div>
        <span>部落闲聊</span>
      </div>
      <div class="nav-links">
        <span class="nav-link" @click="router.push('/home')">首页</span>
        <span class="nav-link" @click="goCreatePost">发帖</span>
        <span class="nav-link" @click="goMyPosts">我的帖子</span>
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
        <span class="nav-link login-btn" @click="loginVisible = true">登录</span>
        <span class="nav-link" @click="router.push('/register')">注册</span>
      </template>
    </div>

    <div class="container">
      <div class="narrow">
        <div class="card">
          <div class="section-title">建设部落</div>
          <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
            <el-form-item label="部落名称" prop="name">
              <el-input v-model="form.name" placeholder="给部落起个名字" maxlength="20" show-word-limit />
            </el-form-item>
            <el-form-item label="部落简介" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="3" placeholder="这个部落是聊什么的" maxlength="100" show-word-limit />
            </el-form-item>
            <el-form-item label="部落头像">
              <div class="avatar-row">
                <img v-if="form.avatar" :src="form.avatar" class="tribe-preview" />
                <div v-else class="tribe-preview tribe-preview-ph">{{ form.name ? form.name[0] : '部' }}</div>
                <el-upload :show-file-list="false" :http-request="uploadAvatar" accept="image/*">
                  <el-button size="small" :loading="uploading" :icon="Picture">上传头像</el-button>
                </el-upload>
                <span class="muted">支持 jpg/png，不超过 10MB，会自动压缩</span>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submit" :loading="submitting">提交审核</el-button>
              <el-button @click="router.push('/home')">取消</el-button>
            </el-form-item>
          </el-form>
          <p class="muted">提交后需管理员审核，审核通过后你会自动成为该部落的首领。</p>
        </div>
      </div>
    </div>

    <div class="footer">积极交流，友善发言，违规评论与投票一经发现直接删除！</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import http from '../utils/http'
import NotificationBell from '../components/NotificationBell.vue'
import TribeMenu from '../components/TribeMenu.vue'
import { requireAuth, loginVisible, isLoggedIn, currentUsername, currentRole, currentAvatar, clearAuth } from '../composables/auth'

const router = useRouter()
const role = currentRole
const loggedIn = isLoggedIn
const formRef = ref()
const submitting = ref(false)
const uploading = ref(false)
const form = ref({ name: '', description: '', avatar: '' })
const rules = {
  name: [
    { required: true, message: '请输入部落名称' },
    { min: 2, max: 20, message: '名称长度 2-20 个字' }
  ]
}

const goCreatePost = async () => {
  if (!await requireAuth()) return
  router.push('/create')
}
const goMyPosts = async () => {
  if (!await requireAuth()) return
  router.push('/my-posts')
}

const uploadAvatar = async (opts) => {
  const file = opts.file
  if (!file.type.startsWith('image/')) { ElMessage.error('请上传图片文件'); return }
  if (file.size > 10 * 1024 * 1024) { ElMessage.error('图片不能超过 10MB'); return }
  uploading.value = true
  const fd = new FormData()
  fd.append('file', file)
  try {
    // 部落头像走专用接口，服务端会裁成正方形
    const res = await http.post('/upload/tribe-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data.code === 200) {
      form.value.avatar = res.data.data.url
      ElMessage.success('头像已上传')
    } else ElMessage.error(res.data.message || '上传失败')
  } catch (e) {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}

const submit = async () => {
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    const res = await http.post('/tribe/create', { ...form.value })
    if (res.data.code === 200) {
      ElMessage.success('部落已提交，等待管理员审核')
      router.push('/home')
    } else ElMessage.error(res.data.message || '提交失败')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const logout = () => { clearAuth(); router.push('/home') }

onMounted(async () => {
  if (!await requireAuth()) router.push('/home')
})
</script>

<style scoped>
.narrow { max-width: 640px; margin: 0 auto; }
.section-title { font-size: 16px; font-weight: 600; padding-bottom: 12px; border-bottom: 1px solid #e5e5e5; margin-bottom: 16px; }
.avatar-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tribe-preview { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e5e5; }
.tribe-preview-ph {
  background: #4e6ef2; color: #fff; font-size: 24px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.login-btn { color: #4e6ef2; font-weight: 600; }
</style>
