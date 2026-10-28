<template>
  <div class="checkin-card card">
    <div class="ck-head">
      <div class="ck-head-left">
        <span class="ck-icon">📅</span>
        <span class="ck-title">每日打卡</span>
      </div>
      <span v-if="loggedIn && data.streak > 0" class="ck-streak">连续 {{ data.streak }} 天</span>
    </div>

    <div class="ck-month">
      <span class="ck-nav" @click="shiftMonth(-1)">‹</span>
      <span class="ck-month-text">{{ viewYear }} 年 {{ viewMonth }} 月</span>
      <span class="ck-nav" @click="shiftMonth(1)">›</span>
    </div>

    <div class="ck-week">
      <span v-for="w in ['日', '一', '二', '三', '四', '五', '六']" :key="w">{{ w }}</span>
    </div>

    <div v-loading="loading" class="ck-grid">
      <span
        v-for="c in cells"
        :key="c.key"
        :class="['ck-day', {
          blank: c.blank,
          checked: c.checked,
          today: c.today,
          future: c.future
        }]"
      >{{ c.blank ? '' : c.day }}</span>
    </div>

    <div class="ck-stat">
      <div class="ck-stat-item">
        <span class="ck-num">{{ data.monthCount || 0 }}</span>
        <span class="ck-label">本月签到</span>
      </div>
      <div class="ck-stat-item">
        <span class="ck-num">+{{ data.monthExp || 0 }}</span>
        <span class="ck-label">本月经验</span>
      </div>
      <div class="ck-stat-item">
        <span class="ck-num">{{ data.totalExp || 0 }}</span>
        <span class="ck-label">累计经验</span>
      </div>
    </div>

    <el-button
      class="ck-btn"
      type="primary"
      :loading="checking"
      :disabled="loggedIn && data.todayChecked"
      @click="handleCheckin"
    >
      {{ buttonText }}
    </el-button>

    <div class="ck-tip">
      <template v-if="!loggedIn">登录后即可签到攒经验</template>
      <template v-else>每天 +{{ data.dailyExp || 5 }} 经验，连续 7 天额外 +{{ data.streakBonus || 10 }}</template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../utils/http'
import { isLoggedIn, loginVisible } from '../composables/auth'

const loggedIn = isLoggedIn

const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth() + 1)
const data = ref({
  today: '',
  checkedDates: [],
  todayChecked: false,
  streak: 0,
  monthCount: 0,
  monthExp: 0,
  totalExp: 0,
  dailyExp: 5,
  streakBonus: 10
})
const loading = ref(false)
const checking = ref(false)

const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

const cells = computed(() => {
  const startPad = new Date(viewYear.value, viewMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const todayStr = data.value.today || ymd(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const checked = new Set(data.value.checkedDates || [])
  const list = []
  for (let i = 0; i < startPad; i++) list.push({ key: `blank${i}`, blank: true })
  for (let d = 1; d <= daysInMonth; d++) {
    const key = ymd(viewYear.value, viewMonth.value, d)
    list.push({
      key,
      day: d,
      checked: checked.has(key),
      today: key === todayStr,
      future: key > todayStr
    })
  }
  return list
})

const buttonText = computed(() => {
  if (!loggedIn.value) return '登录后签到'
  if (data.value.todayChecked) return '今日已签到 ✓'
  return `今日签到 +${data.value.dailyExp || 5}`
})

const loadStatus = async () => {
  if (!loggedIn.value) return
  loading.value = true
  try {
    const res = await http.get('/checkin/status', {
      params: { year: viewYear.value, month: viewMonth.value }
    })
    if (res.data.code === 200) data.value = { ...data.value, ...res.data.data }
  } catch (e) {
    // 签到是附加功能，失败不打扰用户
  } finally {
    loading.value = false
  }
}

const shiftMonth = (delta) => {
  let y = viewYear.value
  let m = viewMonth.value + delta
  if (m < 1) { m = 12; y -= 1 }
  if (m > 12) { m = 1; y += 1 }
  viewYear.value = y
  viewMonth.value = m
  loadStatus()
}

const handleCheckin = async () => {
  if (!loggedIn.value) {
    loginVisible.value = true
    return
  }
  if (data.value.todayChecked) return
  checking.value = true
  try {
    const res = await http.post('/checkin')
    if (res.data.code === 200) {
      data.value = { ...data.value, ...res.data.data }
      ElMessage.success(`签到成功，经验 +${res.data.data.expAdded}`)
    } else {
      ElMessage.warning(res.data.message || '签到失败')
      // 已签到时后端会拒绝，同步一下状态
      loadStatus()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '签到失败，请稍后再试')
  } finally {
    checking.value = false
  }
}

// 登录 / 退出后重新拉取状态
watch(loggedIn, () => loadStatus())
onMounted(loadStatus)
</script>

<style scoped>
/* 宽度交给外层容器控制（首页最左侧那一列），卡片本身铺满 */
.checkin-card {
  width: 100%;
  padding: 16px 14px 14px;
}
.ck-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.ck-head-left { display: flex; align-items: center; gap: 6px; }
.ck-icon { font-size: 15px; }
.ck-title { font-size: 15px; font-weight: 600; color: #333; }
.ck-streak {
  font-size: 12px; color: #e6a23c; background: #fdf6ec;
  border-radius: 10px; padding: 2px 8px; white-space: nowrap;
}
.ck-month {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; color: #666; margin-bottom: 8px;
  padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;
}
.ck-nav {
  width: 22px; height: 22px; line-height: 20px; text-align: center;
  border-radius: 4px; cursor: pointer; color: #999; font-size: 16px;
  user-select: none;
}
.ck-nav:hover { background: #f2f6ff; color: #4e6ef2; }
.ck-week, .ck-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.ck-week span {
  text-align: center; font-size: 11px; color: #bbb; padding-bottom: 4px;
}
.ck-day {
  display: flex; align-items: center; justify-content: center;
  aspect-ratio: 1 / 1;
  font-size: 13px; color: #555; border-radius: 50%;
  transition: background 0.15s;
}
.ck-day.blank { visibility: hidden; }
.ck-day.future { color: #ccc; }
.ck-day.checked {
  background: #4e6ef2; color: #fff; font-weight: 600;
}
/* 今天：未签到时用描边提示，签到后是实心 + 外圈 */
.ck-day.today:not(.checked) {
  color: #4e6ef2; font-weight: 700; box-shadow: inset 0 0 0 1.5px #4e6ef2;
}
.ck-day.today.checked {
  box-shadow: 0 0 0 2px #d6e0ff;
}
.ck-stat {
  display: flex;
  justify-content: space-between;
  margin: 14px 0 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
.ck-stat-item {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.ck-num { font-size: 16px; font-weight: 700; color: #4e6ef2; }
.ck-label { font-size: 11px; color: #999; }
.ck-btn { width: 100%; font-size: 13px; height: 34px; }
.ck-tip {
  font-size: 11px; color: #bbb; text-align: center; margin-top: 8px;
  line-height: 1.5;
}
</style>
