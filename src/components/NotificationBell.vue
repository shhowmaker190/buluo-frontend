<template>
  <div>
    <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
      <el-button @click="notificationVisible = true" style="background:transparent;border:none;color:#3b82f6;cursor:pointer;padding:10px;font-size:20px;">
        🔔
      </el-button>
    </el-badge>
    <el-drawer v-model="notificationVisible" title="消息通知" direction="rtl" size="400px" @open="loadNotifications">
      <div v-if="loading" style="text-align:center;padding:40px;color:#909399;">
        加载中...
      </div>
      <div v-else-if="notifications.length === 0" style="text-align:center;padding:40px;color:#909399;">
        暂无消息通知
      </div>
      <div v-else style="display:flex;flex-direction:column;gap:15px;">
        <div v-for="item in notifications" :key="item.id" style="background:#fff;border:1px solid #e4e7ed;border-radius:8px;padding:15px;cursor:pointer;transition:all 0.3s;" @click="goToNotification(item)" :class="{ 'unread': !item.isRead }">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;padding-right:10px;">
              <div style="font-weight:bold;color:#303133;margin-bottom:8px;">{{ item.title }}</div>
              <div style="color:#606266;font-size:14px;margin-bottom:8px;">{{ item.content }}</div>
              <div style="color:#909399;font-size:12px;">{{ formatTime(item.createdAt) }}</div>
            </div>
            <el-button type="danger" size="small" circle @click.stop="deleteNotification(item.id)" style="margin-left:10px;">
              ×
            </el-button>
          </div>
        </div>
      </div>
      <div v-if="notifications.length > 0" style="margin-top:20px;text-align:center;display:flex;gap:10px;justify-content:center;">
        <el-button @click="markAllRead" size="small" style="border-radius:4px;">全部标为已读</el-button>
        <el-button @click="clearAllNotifications" size="small" style="border-radius:4px;">清空所有消息</el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../utils/http'
import { onChatEvent } from '../composables/chat'

// 未读数量轮询间隔：页面可见时 15s 拉一次，标签页切回来立即拉一次
// 私聊/好友消息由 SSE 推送即时刷新，轮询只作为兜底
const POLL_INTERVAL = 15000

const router = useRouter()
const notificationVisible = ref(false)
const notifications = ref([])
const loading = ref(false)
const unreadCount = ref(0)
let pollTimer = null

const loadUnreadCount = async () => {
  try {
    const res = await http.get('/notification/unread/count')
    unreadCount.value = res.data.data || 0
  } catch (error) {
    console.error('加载未读数失败:', error)
  }
}

const loadNotifications = async () => {
  loading.value = true
  try {
    const [listRes, countRes] = await Promise.all([
      http.get('/notification/unread'),
      http.get('/notification/unread/count')
    ])
    notifications.value = listRes.data.data || []
    unreadCount.value = countRes.data.data || 0
  } catch (error) {
    console.error('加载通知失败:', error)
  } finally {
    loading.value = false
  }
}

const deleteNotification = async (notificationId) => {
  try {
    await http.delete(`/notification/${notificationId}`)
    notifications.value = notifications.value.filter(n => n.id !== notificationId)
    if (unreadCount.value > 0) unreadCount.value--
    ElMessage.success('删除成功')
  } catch (error) {
    console.error('删除通知失败:', error)
    ElMessage.error('删除失败')
  }
}

const markAllRead = async () => {
  try {
    await http.put('/notification/read-all')
    notifications.value = []
    unreadCount.value = 0
    ElMessage.success('已全部标为已读')
  } catch (error) {
    console.error('标记已读失败:', error)
    ElMessage.error('操作失败')
  }
}

const clearAllNotifications = async () => {
  try {
    await http.delete('/notification/clear-all')
    notifications.value = []
    unreadCount.value = 0
    ElMessage.success('已清空所有消息')
  } catch (error) {
    console.error('清空通知失败:', error)
    ElMessage.error('清空失败')
  }
}

const goToNotification = async (item) => {
  if (!item.isRead) {
    try {
      await http.put(`/notification/${item.id}/read`)
      item.isRead = true
      if (unreadCount.value > 0) unreadCount.value--
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }
  notificationVisible.value = false
  // 按 bizType 决定跳转目标：帖子 / 部落 / 私聊会话 / 好友申请 / 后台审核面板
  // 老数据没有 bizType，退回到按 postId 跳帖子（字段是 postId，不是 voteId）
  if (item.bizType === 'CHAT') {
    router.push(`/chat?user=${item.bizId}`)
    return
  }
  if (item.bizType === 'FRIEND') {
    router.push('/chat?tab=request')
    return
  }
  if (item.bizType === 'POST' && item.bizId) {
    router.push(`/post/${item.bizId}`)
    return
  }
  if (item.bizType === 'TRIBE' && item.bizId) {
    router.push(`/home?tribe=${item.bizId}`)
    return
  }
  // 审核提醒：ADMIN_POST / ADMIN_TRIBE / ADMIN_EDIT / ADMIN_RENAME / ADMIN_REPORT
  if (item.bizType && item.bizType.startsWith('ADMIN_')) {
    router.push(`/admin?tab=${item.bizType.slice(6).toLowerCase()}`)
    return
  }
  // 系统通知（举报处理、改名结果）没有跳转目标，展开即已读，不再提示
  if (item.bizType === 'NONE') return
  if (!item.postId) {
    ElMessage.warning('该消息没有可跳转的目标')
    return
  }
  router.push(`/post/${item.postId}`)
}

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString()
}

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') loadUnreadCount()
  }, POLL_INTERVAL)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') loadUnreadCount()
}

// 收到私聊/好友推送时立即刷新未读数，不用等下一次轮询
const offChat = onChatEvent(() => { loadUnreadCount() })

onMounted(() => {
  loadUnreadCount()
  startPolling()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  stopPolling()
  offChat()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.unread {
  border-left: 3px solid #4e6ef2 !important;
  background: #f2f6ff !important;
  border-radius: 4px;
}
</style>
