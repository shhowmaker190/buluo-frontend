<template>
  <div class="hot-card card">
    <div class="hot-head">
      <span class="hot-title">🔥 热门部落</span>
      <span class="hot-sub">按热度排名</span>
      <span class="hot-refresh" title="刷新" @click="load">↻</span>
    </div>

    <div v-if="loading" class="hot-empty">加载中…</div>
    <div v-else-if="tribes.length === 0" class="hot-empty">暂无部落</div>

    <div
      v-for="(t, i) in tribes"
      :key="t.id"
      class="hot-item"
      :title="`${t.name} · 热度 ${t.heat}`"
      @click="$emit('select', t.id)"
    >
      <span class="hot-rank" :class="'r' + (i + 1)">{{ i + 1 }}</span>
      <img v-if="t.avatar" :src="t.avatar" class="hot-avatar" @error="t.avatar = ''" />
      <span v-else class="hot-avatar hot-avatar-ph">{{ (t.name || '?')[0] }}</span>
      <div class="hot-info">
        <div class="hot-name-row">
          <span class="hot-name">{{ t.name }}</span>
          <span class="hot-level" :class="'hl' + heatOf(t).level">
            Lv{{ heatOf(t).level }} {{ heatOf(t).name }}
          </span>
        </div>
        <div class="hot-meta">{{ t.memberCount || 0 }} 成员 · {{ t.postCount || 0 }} 帖</div>
        <div class="hot-bar">
          <div class="hot-bar-fill" :class="'hl' + heatOf(t).level" :style="{ width: heatOf(t).progress + '%' }"></div>
        </div>
      </div>
      <div class="hot-value-box">
        <span class="hot-value">{{ t.heat }}</span>
        <span class="hot-value-label">热度</span>
      </div>
    </div>

    <div class="hot-tip">
      热度 = 成员 × 3 + 帖子 × 2<br />
      Lv1 新芽 · Lv2 微热 · Lv3 升温 · Lv4 火爆 · Lv5 顶流
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import http from '../utils/http'
import { calcHeatLevel } from '../utils/tribeHeat'

defineEmits(['select'])

const tribes = ref([])
const loading = ref(false)

const heatOf = (t) => calcHeatLevel(t.heat)

const load = async () => {
  loading.value = true
  try {
    const res = await http.get('/tribe/hot', { params: { limit: 8 } })
    if (res.data.code === 200) tribes.value = res.data.data || []
  } catch (e) {
    // 榜单属于附加信息，失败时不打扰用户
    tribes.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.hot-card {
  width: 100%;
  padding: 16px 14px 12px;
}
.hot-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 4px;
}
.hot-title { font-size: 15px; font-weight: 600; color: #333; }
.hot-sub { font-size: 11px; color: #bbb; flex: 1; }
.hot-refresh {
  font-size: 15px; color: #bbb; cursor: pointer; line-height: 1;
  padding: 2px 5px; border-radius: 4px;
}
.hot-refresh:hover { color: #4e6ef2; background: #f2f6ff; }

.hot-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.hot-item + .hot-item { border-top: 1px solid #f7f7f7; }
.hot-item:hover { background: #f7f9ff; }

.hot-rank {
  width: 20px;
  flex-shrink: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #c0c4cc;
}
/* 前三名金银铜 */
.hot-rank.r1 { color: #f0a020; }
.hot-rank.r2 { color: #9aa5b5; }
.hot-rank.r3 { color: #cd7f32; }

.hot-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}
.hot-avatar-ph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #4e6ef2;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.hot-info { flex: 1; min-width: 0; }
.hot-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.hot-name {
  font-size: 14px;
  color: #444;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hot-item:hover .hot-name { color: #4e6ef2; }

/* 热度等级徽章 */
.hot-level {
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 8px;
  white-space: nowrap;
}
.hot-level.hl1 { color: #909399; background: #f4f4f5; }
.hot-level.hl2 { color: #529b2e; background: #f0f9eb; }
.hot-level.hl3 { color: #337ecc; background: #ecf5ff; }
.hot-level.hl4 { color: #b88230; background: #fdf6ec; }
.hot-level.hl5 { color: #c45656; background: #fef0f0; }

.hot-meta { font-size: 11.5px; color: #b0b0b0; margin-top: 3px; }

.hot-bar {
  height: 4px;
  border-radius: 2px;
  background: #f2f3f5;
  margin-top: 6px;
  overflow: hidden;
}
.hot-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.hot-bar-fill.hl1 { background: #c8c9cc; }
.hot-bar-fill.hl2 { background: #85ce61; }
.hot-bar-fill.hl3 { background: #66b1ff; }
.hot-bar-fill.hl4 { background: #e6a23c; }
.hot-bar-fill.hl5 { background: #f56c6c; }

.hot-value-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  min-width: 34px;
}
.hot-value { font-size: 16px; font-weight: 700; color: #4e6ef2; line-height: 1.1; }
.hot-value-label { font-size: 10px; color: #c0c4cc; }

.hot-empty { font-size: 12px; color: #bbb; padding: 16px 4px; text-align: center; }
.hot-tip {
  font-size: 10.5px;
  color: #bdbdbd;
  text-align: center;
  line-height: 1.6;
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid #f5f5f5;
}
</style>
