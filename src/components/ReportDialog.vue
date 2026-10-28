<template>
  <el-dialog
    :model-value="modelValue"
    :title="`举报${targetType === 'tribe' ? '部落' : '帖子'}`"
    width="440px"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="onOpen"
  >
    <div class="target">{{ targetTitle }}</div>
    <div class="label">举报原因</div>
    <el-radio-group v-model="reason" class="reasons">
      <el-radio v-for="r in reasons" :key="r" :value="r" :label="r">{{ r }}</el-radio>
    </el-radio-group>
    <div class="label">补充说明（选填）</div>
    <el-input
      v-model="detail"
      type="textarea"
      :rows="3"
      maxlength="200"
      show-word-limit
      placeholder="可以描述具体问题，方便管理员核实"
    />
    <div class="tip">恶意举报会被记录，请如实反馈。</div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="danger" :loading="submitting" @click="submit">提交举报</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../utils/http'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  targetType: { type: String, required: true }, // POST / TRIBE
  targetId: { type: [Number, String], default: null },
  targetTitle: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'reported'])

const reasons = ['违法违规', '色情低俗', '广告引流', '人身攻击', '虚假信息', '其他']
const reason = ref('')
const detail = ref('')
const submitting = ref(false)

const onOpen = () => {
  reason.value = ''
  detail.value = ''
}

const submit = async () => {
  if (!props.targetId) return
  if (!reason.value) {
    ElMessage.warning('请选择举报原因')
    return
  }
  submitting.value = true
  try {
    const res = await http.post('/report', {
      targetType: props.targetType,
      targetId: props.targetId,
      reason: reason.value,
      detail: detail.value
    })
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || '举报已提交')
      emit('update:modelValue', false)
      emit('reported')
    } else {
      ElMessage.error(res.data.message || '举报失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '举报失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.target {
  font-size: 13px; color: #333; background: #f7f8ff; border-radius: 6px;
  padding: 8px 10px; margin-bottom: 14px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.label { font-size: 13px; color: #666; margin: 10px 0 6px; }
.reasons { display: flex; flex-wrap: wrap; gap: 4px 0; }
.reasons :deep(.el-radio) { margin-right: 14px; }
.tip { font-size: 12px; color: #bbb; margin-top: 10px; }
</style>
