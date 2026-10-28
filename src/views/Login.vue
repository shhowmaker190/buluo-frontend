<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="brand-logo">闲</div>
        <h2>部落闲聊</h2>
        <p class="auth-slogan">来这里，聊聊你感兴趣的一切</p>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" size="large" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input type="password" v-model="form.password" placeholder="请输入密码" show-password size="large" />
        </el-form-item>
        <el-form-item style="margin-top:24px;">
          <el-button type="primary" @click="handleLogin" style="width:100%;height:40px;font-size:15px;" :loading="loading">
            登录
          </el-button>
        </el-form-item>
        <div class="auth-footer">
          <span>还没有账号？</span>
          <router-link to="/register">立即注册</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../utils/http'
import { setAuth } from '../composables/auth'

const router = useRouter()
const form = reactive({ username: '', password: '' })
const formRef = ref()
const loading = ref(false)
const rules = { username: [{ required: true, message: '请输入用户名' }], password: [{ required: true, message: '请输入密码' }] }

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
      if (role === 'ADMIN') router.push('/admin')
      else router.push('/home')
    } else ElMessage.error(res.data.message)
  } catch (err) {
    console.error('登录错误:', err)
    ElMessage.error(err.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2f2f2;
  padding: 20px;
}

.auth-card {
  width: 380px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 30px 28px;
}

.auth-header {
  text-align: center;
  padding-bottom: 22px;
}

.auth-header .brand-logo {
  margin: 0 auto 12px;
  width: 42px;
  height: 42px;
  font-size: 20px;
  border-radius: 8px;
}

.auth-header h2 {
  font-size: 22px;
  color: #333;
  margin-bottom: 6px;
}

.auth-slogan {
  color: #999;
  font-size: 13px;
}

.auth-footer {
  text-align: center;
  margin-top: 16px;
  color: #999;
  font-size: 13px;
}

.auth-footer a {
  color: #4e6ef2;
  margin-left: 4px;
}

:deep(.el-form-item__label) {
  color: #666;
  font-size: 13px;
  padding-bottom: 4px;
}
</style>
