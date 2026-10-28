<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="440px"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="onOpen"
  >
    <div v-if="loading" class="hint">加载好友列表…</div>
    <template v-else>
      <div v-if="friends.length === 0" class="hint">还没有好友，先去添加好友吧</div>
      <template v-else>
        <el-input v-model="keyword" size="small" placeholder="搜索好友" clearable class="search" />
        <div v-if="filtered.length === 0" class="hint">没有匹配的好友</div>
        <div v-else class="friend-list">
          <div v-for="f in filtered" :key="f.userId" class="friend-item" @click="send(f)">
            <img v-if="f.avatar" :src="f.avatar" class="avatar" @error="f.avatar = ''" />
            <span v-else class="avatar ph">{{ (f.username || '?')[0].toUpperCase() }}</span>
            <span class="name">{{ f.username }}</span>
            <span class="send-btn" :class="{ busy: sendingId === f.userId }">
              {{ sendingId === f.userId ? '发送中' : '发送' }}
            </span>
          </div>
        </div>
      </template>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../utils/http'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // post / tribe，直接对应后端 /chat/share 的 msgType
  targetType: { type: String, required: true },
  targetId: { type: [Number, String], default: null },
  targetTitle: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const friends = ref([])
const keyword = ref('')
const loading = ref(false)
const sendingId = ref(null)

const title = computed(() =>
  `分享${props.targetType === 'tribe' ? '部落' : '帖子'}给好友`
)
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return friends.value
  return friends.value.filter(f => (f.username || '').toLowerCase().includes(kw))
})

const onOpen = async () => {
  keyword.value = ''
  loading.value = true
  try {
    const res = await http.get('/friend/list')
    friends.value = res.data.data || []
  } catch (e) {
    ElMessage.error('加载好友失败')
    friends.value = []
  } finally {
    loading.value = false
  }
}

const send = async (f) => {
  if (!props.targetId || sendingId.value) return
  sendingId.value = f.userId
  try {
    const res = await http.post('/chat/share', {
      toUserId: f.userId,
      msgType: props.targetType,
      refId: props.targetId
    })
    if (res.data.code === 200) {
      ElMessage.success(`已分享给 ${f.username}`)
      emit('update:modelValue', false)
    } else {
      ElMessage.error(res.data.message || '分享失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '分享失败')
  } finally {
    sendingId.value = null
  }
}
</script>

<style scoped>
.hint { font-size: 13px; color: #999; text-align: center; padding: 20px 0; }
.search { margin-bottom: 8px; }
.friend-list { max-height: 320px; overflow-y: auto; }
.friend-item {
  display: flex; align-items: center; gap: 10px; padding: 8px;
  border-radius: 6px; cursor: pointer;
}
.friend-item:hover { background: #f7f8ff; }
.avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.avatar.ph {
  background: #4e6ef2; color: #fff; font-size: 13px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
.name { flex: 1; font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.send-btn {
  font-size: 12px; color: #4e6ef2; border: 1px solid #c8d3fb;
  border-radius: 12px; padding: 1px 10px; flex-shrink: 0;
}
.friend-item:hover .send-btn { background: #4e6ef2; color: #fff; border-color: #4e6ef2; }
.send-btn.busy { opacity: 0.6; }
</style>
