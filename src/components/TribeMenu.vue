<template>
  <el-dropdown v-if="loggedIn" trigger="click" @command="onCommand" @visible-change="onVisible">
    <span class="nav-link tribe-menu">我的部落 ▾</span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="__create">创建部落</el-dropdown-item>
        <el-dropdown-item divided disabled>我加入的部落</el-dropdown-item>
        <el-dropdown-item v-if="joined.length === 0" disabled>暂无</el-dropdown-item>
        <el-dropdown-item v-for="t in joined" :key="'j' + t.id" :command="'j:' + t.id">
          {{ t.name }}
        </el-dropdown-item>
        <el-dropdown-item divided disabled>我创建的部落</el-dropdown-item>
        <el-dropdown-item v-if="created.length === 0" disabled>暂无</el-dropdown-item>
        <el-dropdown-item v-for="t in created" :key="'c' + t.id" :command="'c:' + t.id">
          {{ t.name }}<span v-if="t.status === 0" class="pending">（待审核）</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../utils/http'
import { isLoggedIn } from '../composables/auth'

const router = useRouter()
const loggedIn = isLoggedIn
const joined = ref([])
const created = ref([])

const load = async () => {
  try {
    const [a, b] = await Promise.all([
      http.get('/tribe/my/list'),
      http.get('/tribe/my/created')
    ])
    joined.value = a.data.data || []
    created.value = b.data.data || []
  } catch (e) {
    console.error('加载我的部落失败:', e)
  }
}

const onVisible = (visible) => {
  if (visible && loggedIn.value) load()
}

const onCommand = (cmd) => {
  if (cmd === '__create') {
    router.push('/tribe/create')
    return
  }
  const id = String(cmd).split(':')[1]
  if (id) router.push(`/home?tribe=${id}`)
}

if (loggedIn.value) load()
</script>

<style scoped>
.tribe-menu { cursor: pointer; }
.pending { color: #e6a23c; font-size: 12px; }
</style>
