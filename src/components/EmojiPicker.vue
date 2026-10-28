<template>
  <el-popover :width="300" trigger="click" placement="bottom-start" @show="onShow">
    <template #reference>
      <el-button size="small" title="表情">
        <svg class="emoji-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" />
          <circle cx="9" cy="10" r="1.2" fill="currentColor" />
          <circle cx="15" cy="10" r="1.2" fill="currentColor" />
          <path d="M8 14.5c1 1.4 2.4 2.1 4 2.1s3-.7 4-2.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        表情
      </el-button>
    </template>
    <div class="emoji-panel">
      <div class="emoji-tabs">
        <span
          v-for="g in EMOJI_GROUPS"
          :key="g.name"
          :class="['emoji-tab', { active: activeGroup === g.name }]"
          @click="activeGroup = g.name"
        >{{ g.name }}</span>
      </div>
      <div class="emoji-grid">
        <span
          v-for="e in currentItems"
          :key="e.tag"
          class="emoji-item"
          :title="e.label"
          @click="pick(e)"
        >{{ e.char }}</span>
      </div>
      <div class="emoji-hint">点击插入「[{{ previewTag }}]」，发送后显示为表情</div>
    </div>
  </el-popover>
</template>

<script setup>
import { computed, ref } from 'vue'
import { EMOJI_GROUPS } from '../utils/emoji'

const emit = defineEmits(['select'])

const defaultGroup = EMOJI_GROUPS[0].name
const activeGroup = ref(defaultGroup)
const previewTag = ref(EMOJI_GROUPS[0].items[0].tag)

const currentItems = computed(() => {
  const group = EMOJI_GROUPS.find(g => g.name === activeGroup.value)
  return group ? group.items : []
})

const onShow = () => { activeGroup.value = defaultGroup }

const pick = (emoji) => {
  previewTag.value = emoji.tag
  emit('select', `[${emoji.tag}]`)
}
</script>

<style scoped>
.emoji-panel { padding: 2px; }
.emoji-btn-icon { width: 14px; height: 14px; margin-right: 4px; vertical-align: -2px; }
.emoji-tabs { display: flex; gap: 10px; margin-bottom: 8px; }
.emoji-tab { font-size: 12px; color: #909399; cursor: pointer; padding: 2px 4px; border-radius: 4px; }
.emoji-tab.active { color: #4e6ef2; background: #f2f6ff; }
.emoji-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
.emoji-item {
  font-size: 22px; line-height: 1; text-align: center; cursor: pointer;
  padding: 6px 0; border-radius: 6px; transition: background 0.15s;
}
.emoji-item:hover { background: #f2f6ff; }
.emoji-hint { margin-top: 8px; font-size: 11px; color: #bbb; }
</style>
