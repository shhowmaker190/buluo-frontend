<template>
  <el-dialog v-model="visible" width="380px" :close-on-click-modal="false" :show-close="true" @close="handleClose" append-to-body>
    <div class="login-header">
      <div class="brand-logo">闲</div>
      <h3>登录部落闲聊</h3>
      <p>登录后即可发帖、评论和点赞</p>
    </div>
    <el-form :model="form" :rules="rules" ref="formRef" label-position="top" @keyup.enter="handleLogin">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="请输入用户名" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input type="password" v-model="form.password" placeholder="请输入密码" show-password />
      </el-form-item>
      <el-button type="primary" @click="handleLogin" style="width:100%;height:40px;font-size:15px;" :loading="loading">
        登录
      </el-button>
      <div class="login-footer">
        <span>还没有账号？</span>
        <span class="link" @click="goRegister">立即注册</span>
      </div>
    </el-form>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../utils/http'
import { resolveAuth, setAuth } from '../composables/auth'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])
const router = useRouter()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
import { computed } from 'vue'

const form = reactive({ username: '', password: '' })
const formRef = ref()
const loading = ref(false)
const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }]
}

watch(visible, (v) => {
  if (v) {
    form.username = ''
    form.password = ''
  }
})

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const res = await http.post('/auth/login', form)
    if (res.data.code === 200) {
      const { token, username, role, userId, avatar } = res.data.data
      setAuth(token, username, role, userId, avatar)
      ElMessage.success('登录成功')
      emit('update:modelValue', false)
      resolveAuth(true)
    } else {
      ElMessage.error(res.data.message)
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const goRegister = () => {
  emit('update:modelValue', false)
  resolveAuth(false)
  router.push('/register')
}

const handleClose = () => {
  resolveAuth(false)
}
</script>

<style scoped>
.login-header {
  text-align: center;
  padding-bottom: 18px;
}

.brand-logo {
  margin: 0 auto 10px;
  width: 40px;
  height: 40px;
  font-size: 18px;
  border-radius: 8px;
  background: #4e6ef2;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-header h3 {
  font-size: 18px;
  color: #333;
  margin-bottom: 4px;
}

.login-header p {
  color: #999;
  font-size: 12px;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
  color: #999;
  font-size: 13px;
}

.link {
  color: #4e6ef2;
  cursor: pointer;
  margin-left: 4px;
}

:deep(.el-form-item__label) {
  color: #666;
  font-size: 13px;
}
</style>
