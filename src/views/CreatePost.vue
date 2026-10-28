<template>
  <div class="page-container">
    <div class="navbar">
      <div class="brand" @click="router.push('/home')">
        <div class="brand-logo">闲</div>
        <span>部落闲聊</span>
      </div>
      <div class="nav-links">
        <span class="nav-link" @click="router.push('/home')">首页</span>
        <span class="nav-link active" @click="router.push('/create')">发帖</span>
        <span class="nav-link" @click="router.push('/my-posts')">我的帖子</span>
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

    <div class="container narrow">
      <div class="card">
        <div class="section-title">发表新帖</div>
        <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
          <el-form-item label="选择部落" prop="tribeId">
            <el-select v-model="form.tribeId" placeholder="请选择我加入的部落" style="width:220px;">
              <el-option v-for="b in tribes" :key="b.id" :label="b.name" :value="b.id" />
            </el-select>
            <span v-if="tribes.length === 0" class="muted">你还没有加入任何部落，先去首页加入一个吧</span>
          </el-form-item>
          <el-form-item label="标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入帖子标题" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="正文" prop="content">
            <el-input
              ref="contentRef"
              v-model="form.content"
              type="textarea"
              :rows="10"
              placeholder="分享你的想法，友善交流"
              maxlength="5000"
              show-word-limit
            />
            <div class="upload-row">
              <el-upload
                :show-file-list="false"
                :http-request="uploadImage"
                accept="image/*"
              >
                <el-button :loading="uploading" size="small" :icon="Picture">上传图片</el-button>
              </el-upload>
              <EmojiPicker @select="insertEmoji" />
              <span class="muted">支持 jpg/png/gif/webp，单张不超过 10MB，最多 6 张；图片会排在文字下方</span>
            </div>
            <div v-if="pendingImages.length" class="image-preview">
              <div v-for="(url, i) in pendingImages" :key="url" class="preview-item">
                <img :src="url" class="preview-img" />
                <span class="preview-remove" @click="removeImage(i)">×</span>
              </div>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="submit" :loading="submitting">发布帖子</el-button>
            <el-button @click="router.push('/home')">取消</el-button>
          </el-form-item>
        </el-form>
        <p class="muted">发布后需管理员审核，通过后才会在板块中展示。</p>
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
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import http from '../utils/http'
import NotificationBell from '../components/NotificationBell.vue'
import TribeMenu from '../components/TribeMenu.vue'
import EmojiPicker from '../components/EmojiPicker.vue'
import { currentUsername, currentRole, currentAvatar, clearAuth } from '../composables/auth'

const router = useRouter()
const route = useRoute()
const role = currentRole
const tribes = ref([])
const form = reactive({ tribeId: null, title: '', content: '' })
const formRef = ref()
const contentRef = ref()
const pendingImages = ref([])
const submitting = ref(false)
const uploading = ref(false)
const dialogVisible = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdFormRef = ref()
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码' }],
  newPassword: [{ required: true, min: 6, message: '新密码至少6位' }],
  confirmPassword: [{ required: true, validator: (r, v, cb) => v === pwdForm.value.newPassword ? cb() : cb(new Error('不一致')) }]
}

const rules = {
  tribeId: [{ required: true, message: '请选择部落' }],
  title: [{ required: true, message: '请输入标题' }],
  content: [{ required: true, message: '请输入正文' }]
}

const loadTribes = async () => {
  const res = await http.get('/tribe/my/list')
  tribes.value = res.data.data || []
  const preset = Number(route.query.tribe || 0)
  if (preset && tribes.value.some(t => t.id === preset)) form.tribeId = preset
}

// 文字与图片分开保存，提交时拼成「文字在上、图片在下」的正文
const buildContent = () => {
  const text = (form.content || '').trim()
  const images = pendingImages.value.map(url => `<img src="${url}" />`).join('')
  if (!text && !images) return ''
  return text ? text + images : images
}

const submit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  const content = buildContent()
  if (!content) return ElMessage.warning('请输入正文或添加图片')
  submitting.value = true
  try {
    const res = await http.post('/post/create', { tribeId: form.tribeId, title: form.title, content })
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || '帖子已提交，等待管理员审核')
      router.push('/my-posts')
    } else {
      ElMessage.error(res.data.message || '发布失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发布失败')
  } finally {
    submitting.value = false
  }
}

const MAX_IMAGES = 6

const uploadImage = async (opts) => {
  const file = opts.file
  if (!file.type.startsWith('image/')) { ElMessage.error('请上传图片文件'); return }
  if (file.size > 10 * 1024 * 1024) { ElMessage.error('图片不能超过 10MB'); return }
  if (pendingImages.value.length >= MAX_IMAGES) {
    ElMessage.warning(`最多上传 ${MAX_IMAGES} 张图片`)
    return
  }
  uploading.value = true
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await http.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data.code === 200) {
      pendingImages.value.push(res.data.data.url)
      ElMessage.success('图片已添加')
    } else ElMessage.error(res.data.message || '上传失败')
  } catch (e) {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}

const removeImage = (index) => {
  pendingImages.value.splice(index, 1)
}

// 在光标处插入表情标签
const insertEmoji = (tag) => {
  const el = contentRef.value?.textarea
  if (el && typeof el.selectionStart === 'number') {
    const start = el.selectionStart
    const end = el.selectionEnd
    form.content = form.content.slice(0, start) + tag + form.content.slice(end)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + tag.length
      el.setSelectionRange(pos, pos)
    })
    return
  }
  form.content += tag
}

const logout = () => {
  clearAuth()
  router.push('/home')
}

const openChangePasswordDialog = () => { pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }; dialogVisible.value = true }

const submitChangePassword = async () => {
  try { await pwdFormRef.value.validate() } catch { return }
  const res = await http.post('/user/changePassword', { oldPassword: pwdForm.value.oldPassword, newPassword: pwdForm.value.newPassword })
  if (res.data.code === 200) { ElMessage.success('修改成功，请重新登录'); clearAuth(); router.push('/home') }
  else ElMessage.error(res.data.message)
}

onMounted(loadTribes)
</script>

<style scoped>
.narrow {
  max-width: 760px;
}
.upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}

/* 待发布图片纵向排列，一张一行，可移除 */
.image-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.preview-item { position: relative; align-self: flex-start; }
.preview-img {
  display: block;
  max-width: 240px;
  max-height: 180px;
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
