<template>
  <div class="page-container">
    <div class="navbar">
      <div class="brand" @click="router.push('/home')">
        <div class="brand-logo">闲</div>
        <span>部落闲聊</span>
      </div>
      <div class="nav-links">
        <span class="nav-link active" @click="router.push('/home')">首页</span>
        <span class="nav-link" @click="goCreate">发帖</span>
        <span class="nav-link" @click="goMyPosts">我的帖子</span>
        <span class="nav-link" @click="router.push('/chat')">好友</span>
        <TribeMenu />
        <span v-if="role === 'ADMIN'" class="nav-link" @click="router.push('/admin')">管理后台</span>
      </div>
      <template v-if="loggedIn">
        <span class="nav-link" @click="openChangePasswordDialog">修改密码</span>
        <span class="nav-link" @click="logout">退出</span>
        <span class="user-info" @click="router.push('/profile')" style="cursor:pointer">
          <img v-if="currentAvatar" :src="currentAvatar" class="nav-avatar" @error="currentAvatar = ''" />
          <span v-else class="nav-avatar-placeholder">{{ currentUsername ? currentUsername[0].toUpperCase() : 'U' }}</span>
          {{ currentUsername }}
        </span>
        <NotificationBell />
      </template>
      <template v-else>
        <span class="nav-link login-btn" @click="openLogin">登录</span>
        <span class="nav-link" @click="router.push('/register')">注册</span>
      </template>
    </div>

    <div class="container">
      <div class="hero card">
        <div class="hero-text">
          <div class="hero-title">部落闲聊</div>
          <div class="hero-sub">来这里，聊聊你感兴趣的一切</div>
        </div>
        <div class="search-bar">
          <el-input v-model="keyword" placeholder="搜索帖子标题或正文" clearable @keyup.enter="doSearch">
            <template #append>
              <el-button @click="doSearch" :icon="Search" type="primary">搜索</el-button>
            </template>
          </el-input>
        </div>
      </div>

      <div class="tribe-layout" :class="{ detail: !!selectedId }">
        <!-- 最左侧：每日签到日历（打卡攒等级经验） -->
        <CheckinCalendar class="checkin-side" />
        <aside class="tribe-side card">
          <el-input v-model="tribeKeyword" placeholder="搜索部落名称" size="small" clearable @keyup.enter="searchTribe" />

          <template v-if="!selectedId">
            <div class="side-block">
              <div class="side-title">我的部落</div>
              <div v-if="myTribes.length === 0" class="side-empty">还没有加入部落</div>
              <div v-for="t in myTribes" :key="'my' + t.id" class="tribe-item" @click="selectTribe(t.id)">
                <img v-if="t.avatar" :src="t.avatar" class="tribe-avatar" @error="t.avatar = ''" />
                <span v-else class="tribe-avatar tribe-avatar-ph">{{ (t.name || '?')[0] }}</span>
                <span class="tribe-name">{{ t.name }}</span>
                <RoleTag :role="t.myRole" />
                <span class="tribe-count">{{ t.memberCount || 0 }} 人</span>
              </div>
            </div>

            <div class="side-block">
              <div class="side-title">全部部落</div>
              <div v-if="tribes.length === 0" class="side-empty">暂无部落</div>
              <div v-for="t in tribes" :key="t.id" class="tribe-item" @click="selectTribe(t.id)">
                <img v-if="t.avatar" :src="t.avatar" class="tribe-avatar" @error="t.avatar = ''" />
                <span v-else class="tribe-avatar tribe-avatar-ph">{{ (t.name || '?')[0] }}</span>
                <span class="tribe-name">{{ t.name }}</span>
                <RoleTag :role="t.myRole" />
                <span class="tribe-count">{{ t.memberCount || 0 }} 人</span>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="side-block">
              <div class="side-title">当前部落</div>
              <div v-if="current" class="current-tribe">
                <img v-if="current.avatar" :src="current.avatar" class="current-avatar" @error="current.avatar = ''" />
                <span v-else class="current-avatar tribe-avatar-ph">{{ (current.name || '?')[0] }}</span>
                <div class="current-info">
                  <div class="current-name">{{ current.name }}</div>
                  <div class="current-meta">
                    <RoleTag :role="current.myRole" />
                    <span class="heat-badge" :class="'hl' + currentHeat.level" :title="`热度 ${current.heat || 0}`">
                      Lv{{ currentHeat.level }} {{ currentHeat.name }}
                    </span>
                    <span>{{ current.memberCount || 0 }} 位成员</span>
                    <span v-if="current.pendingStatus === 1" class="pending-tag">修改审核中</span>
                  </div>
                  <!-- 部落等级：热度 = 成员 × 3 + 帖子 × 2 -->
                  <div class="current-heat">
                    <div class="heat-track">
                      <div class="heat-fill" :class="'hl' + currentHeat.level" :style="{ width: currentHeat.progress + '%' }"></div>
                    </div>
                    <div class="heat-text">
                      热度 {{ currentHeat.heat }}
                      <span v-if="currentHeat.max"> · 已达最高等级</span>
                      <span v-else> · 距 Lv{{ currentHeat.level + 1 }} 还需 {{ currentHeat.toNext }}</span>
                    </div>
                  </div>
                  <div class="current-desc">{{ current.description || '这个人很懒，还没有写简介' }}</div>
                </div>
              </div>
              <div class="side-actions">
                <el-button size="small" @click="backToAll">返回全部</el-button>
                <el-button v-if="isLeaderNow" size="small" @click="goEditTribe">编辑部落</el-button>
                <el-button v-if="current && current.myRole" size="small" type="danger" plain @click="leaveTribe">退出部落</el-button>
                <el-button v-else-if="current" size="small" type="primary" @click="joinTribe">加入部落</el-button>
                <el-button v-if="current" size="small" @click="shareVisible = true">分享给好友</el-button>
                <el-button
                  v-if="current && !isMyTribe"
                  size="small"
                  :disabled="reportedTribe"
                  @click="reportVisible = true"
                >{{ reportedTribe ? '已举报' : '举报' }}</el-button>
                <span v-if="!current && !loggedIn" class="side-empty">登录后可进入该部落</span>
              </div>
            </div>
          </template>

          <el-button class="create-tribe-btn" size="small" type="primary" plain @click="goCreateTribe">+ 建设部落</el-button>
        </aside>

        <main class="post-main">
          <div class="toolbar card">
            <div class="sort-tabs">
              <span :class="{ active: sort === 'latest' }" @click="changeSort('latest')">最新</span>
              <span :class="{ active: sort === 'hot' }" @click="changeSort('hot')">最热</span>
              <span v-if="keyword" class="search-tip">搜索：{{ keyword }} <span class="clear-search" @click="clearSearch">×</span></span>
              <span v-if="current" class="current-tip">当前部落：{{ current.name }}</span>
            </div>
            <el-button type="primary" size="small" @click="goCreate">
              {{ current ? '在该部落发帖' : '发新帖' }}
            </el-button>
          </div>

          <div v-loading="loading" class="post-list">
            <div v-if="!loading && posts.length === 0" class="card empty">没有找到相关帖子</div>
            <div v-for="post in posts" :key="post.id" class="post-item card" @click="openPost(post)">
              <div class="post-title-row">
                <span class="board-tag tribe-tag" @click.stop="selectTribe(post.tribeId)">
                  <img v-if="post.tribeAvatar" :src="post.tribeAvatar" class="tag-avatar" @error="post.tribeAvatar = ''" />
                  {{ post.tribeName || '未分类' }}
                </span>
                <span class="post-title">{{ post.title }}</span>
              </div>
              <p class="post-excerpt">{{ excerpt(post.content) }}</p>
              <div v-if="postImages(post.content).length" class="post-images">
                <img
                  v-for="(src, i) in postImages(post.content)"
                  :key="i"
                  :src="src"
                  class="post-thumb"
                  loading="lazy"
                  @error="onThumbError"
                />
              </div>
              <div class="post-meta">
                <img v-if="post.avatar" :src="post.avatar" class="list-avatar clickable" @click.stop="openUser(post.userId)" @error="post.avatar = ''" />
                <span v-else class="list-avatar-placeholder clickable" @click.stop="openUser(post.userId)">{{ (post.username || '?')[0].toUpperCase() }}</span>
                <span class="author-name" @click.stop="openUser(post.userId)">{{ post.username || '未知用户' }}</span>
                <span class="author-level" :class="'lv' + authorLevel(post).level">Lv{{ authorLevel(post).level }}</span>
                <RoleTag :role="post.authorTribeRole" />
                <span>{{ formatTime(post.createdAt) }}</span>
                <span>{{ post.commentCount || 0 }} 条回复</span>
              </div>

              <div v-if="post.hotComments && post.hotComments.length" class="hot-comments">
                <div v-for="c in post.hotComments" :key="c.id" class="hot-comment">
                  <img v-if="c.avatar" :src="c.avatar" class="hc-avatar" @click.stop="openUser(c.userId)" @error="c.avatar = ''" />
                  <span v-else class="hc-avatar hc-avatar-ph" @click.stop="openUser(c.userId)">{{ (c.username || '?')[0].toUpperCase() }}</span>
                  <span class="hc-name" @click.stop="openUser(c.userId)">{{ c.username || '匿名' }}</span>
                  <span class="author-level" :class="'lv' + commentLevel(c).level">Lv{{ commentLevel(c).level }}</span>
                  <RoleTag :role="c.role" />
                  <span class="hc-content">{{ plain(c.content) }}</span>
                  <span class="hc-likes">👍 {{ c.likeCount || 0 }}</span>
                </div>
                <div v-if="(post.commentCount || 0) > 3" class="hc-more">查看全部 {{ post.commentCount }} 条回复 ›</div>
              </div>
            </div>
          </div>

          <el-pagination
            v-if="total > PAGE_SIZE"
            v-model:current-page="page"
            :total="total"
            :page-size="PAGE_SIZE"
            :pager-count="7"
            layout="prev, pager, next, jumper"
            style="margin-top:16px;"
            @current-change="loadPosts"
          />
        </main>

        <aside v-if="selectedId && loggedIn" class="member-side card">
          <div class="side-title">部落成员（{{ members.length }}）</div>
          <div v-if="members.length === 0" class="side-empty">还没有成员</div>
          <div v-for="m in members" :key="m.id" class="member-item">
            <img v-if="m.avatar" :src="m.avatar" class="member-avatar" @click="openUser(m.userId)" @error="m.avatar = ''" />
            <span v-else class="member-avatar tribe-avatar-ph" @click="openUser(m.userId)">{{ (m.username || '?')[0].toUpperCase() }}</span>
            <div class="member-info">
              <div class="member-name">
                <span class="author-name" @click="openUser(m.userId)">{{ m.username }}</span>
                <RoleTag :role="m.role" />
                <span v-if="m.muted === 1" class="muted-tag">已禁言</span>
              </div>
              <div class="member-level">
                <span class="author-level" :class="'lv' + memberLevel(m).level">Lv{{ memberLevel(m).level }}</span>
              </div>
            </div>
            <div v-if="isLeaderNow && m.role !== 'LEADER'" class="member-actions">
              <el-button size="small" link @click="toggleRole(m)">{{ m.role === 'DEPUTY' ? '撤销副首领' : '任命副首领' }}</el-button>
              <el-button size="small" link @click="toggleMute(m)">{{ m.muted === 1 ? '解除禁言' : '禁言' }}</el-button>
              <el-button size="small" link type="danger" @click="kickMember(m)">踢出</el-button>
            </div>
          </div>
        </aside>

        <!-- 最右侧：热门部落榜（点击直接进入该部落） -->
        <HotTribes class="hot-side" @select="selectTribe" />
      </div>
    </div>

    <div class="footer">积极交流，友善发言，违规评论与投票一经发现直接删除！</div>

    <!-- 右下角回到顶部 -->
    <BackToTop />

    <ShareDialog
      v-model="shareVisible"
      target-type="tribe"
      :target-id="current ? current.id : null"
      :target-title="current ? current.name : ''"
    />
    <ReportDialog
      v-model="reportVisible"
      target-type="TRIBE"
      :target-id="current ? current.id : null"
      :target-title="current ? current.name : ''"
      @reported="reportedTribe = true"
    />

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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import http from '../utils/http'
import NotificationBell from '../components/NotificationBell.vue'
import TribeMenu from '../components/TribeMenu.vue'
import RoleTag from '../components/RoleTag.vue'
import ShareDialog from '../components/ShareDialog.vue'
import ReportDialog from '../components/ReportDialog.vue'
import CheckinCalendar from '../components/CheckinCalendar.vue'
import HotTribes from '../components/HotTribes.vue'
import BackToTop from '../components/BackToTop.vue'
import { requireAuth, loginVisible, isLoggedIn, currentUsername, currentRole, currentAvatar, currentUserId, clearAuth } from '../composables/auth'
import { calcLevel } from '../utils/level'
import { calcHeatLevel } from '../utils/tribeHeat'
import { ROLE_DEPUTY, ROLE_MEMBER, isLeader } from '../utils/tribe'
import { findEmoji } from '../utils/emoji'

const route = useRoute()
const router = useRouter()
const role = currentRole
const loggedIn = isLoggedIn

const tribes = ref([])
const myTribes = ref([])
const posts = ref([])
const members = ref([])
const current = ref(null)
// 当前部落的热度等级（部落详情里展示）
const currentHeat = computed(() => calcHeatLevel(current.value ? current.value.heat : 0))
const selectedId = ref(route.query.tribe ? Number(route.query.tribe) : null)
const tribeKeyword = ref('')
const page = ref(1)
const total = ref(0)
const sort = ref('latest')
const keyword = ref('')
const searchKeyword = ref('')
const loading = ref(false)
const dialogVisible = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdFormRef = ref()
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码' }],
  newPassword: [{ required: true, min: 6, message: '新密码至少6位' }],
  confirmPassword: [{ required: true, validator: (r, v, cb) => v === pwdForm.value.newPassword ? cb() : cb(new Error('不一致')) }]
}

const isLeaderNow = computed(() => isLeader(current.value?.myRole))

const openLogin = () => { loginVisible.value = true }

const goCreate = async () => {
  if (!await requireAuth()) return
  router.push(selectedId.value ? `/create?tribe=${selectedId.value}` : '/create')
}

const goMyPosts = async () => {
  if (!await requireAuth()) return
  router.push('/my-posts')
}

const goCreateTribe = async () => {
  if (!await requireAuth()) return
  router.push('/tribe/create')
}

const openPost = async (post) => {
  if (!await requireAuth()) return
  router.push(`/post/${post.id}`)
}

// 查看他人主页需要登录，游客点击头像/用户名时弹登录框
const openUser = async (userId) => {
  if (!await requireAuth()) return
  if (!userId) return
  if (Number(userId) === Number(currentUserId.value)) router.push('/profile')
  else router.push(`/user/${userId}`)
}

const loadTribes = async () => {
  try {
    const res = await http.get('/tribe/list', { params: { keyword: tribeKeyword.value.trim() } })
    tribes.value = res.data.data || []
  } catch (e) {
    console.error('加载部落失败:', e)
  }
}

const loadMyTribes = async () => {
  if (!loggedIn.value) return
  try {
    const res = await http.get('/tribe/my/list')
    myTribes.value = res.data.data || []
  } catch (e) {
    console.error('加载我的部落失败:', e)
  }
}

const loadCurrent = async (id) => {
  try {
    const res = await http.get(`/tribe/${id}`)
    current.value = res.data.data || null
  } catch (e) {
    current.value = null
  }
  checkReportStatus()
}

// ===== 部落分享 / 举报 =====
const shareVisible = ref(false)
const reportVisible = ref(false)
const reportedTribe = ref(false)
const isMyTribe = computed(() =>
  !!current.value && Number(current.value.creatorId) === Number(currentUserId.value)
)

const checkReportStatus = async () => {
  reportedTribe.value = false
  if (!current.value || !isLoggedIn.value || isMyTribe.value) return
  try {
    const res = await http.get('/report/status', {
      params: { targetType: 'TRIBE', targetId: current.value.id }
    })
    reportedTribe.value = !!res.data.data?.pending
  } catch (e) {
    // 查询失败不阻塞页面
  }
}

const loadMembers = async (id) => {
  try {
    const res = await http.get(`/tribe/${id}/members`)
    members.value = res.data.data.records || []
  } catch (e) {
    members.value = []
  }
}

// 每页条数：分页组件与请求参数共用同一个常量，避免改一处漏一处
const PAGE_SIZE = 10

// 请求序号：快速翻页时丢弃过期响应，防止第 2 页的结果盖掉第 5 页
let loadSeq = 0

const loadPosts = async (targetPage) => {
  // el-pagination 的 current-change 会把页码当参数传进来
  if (typeof targetPage === 'number' && targetPage > 0) page.value = targetPage
  const seq = ++loadSeq
  loading.value = true
  try {
    const params = { page: page.value, size: PAGE_SIZE, sort: sort.value }
    if (selectedId.value) params.tribeId = selectedId.value
    if (searchKeyword.value) params.keyword = searchKeyword.value
    const res = await http.get('/post/list', { params })
    // 期间又发起了新的请求，这次结果已经过期
    if (seq !== loadSeq) return

    const data = res.data.data || {}
    const records = data.records || []
    total.value = data.total || 0

    // 页码越界（帖子被删、被下架，或别人刚好清空了最后一页）时自动回到最后一页
    const maxPage = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
    if (records.length === 0 && page.value > maxPage) {
      page.value = maxPage
      return loadPosts()
    }
    posts.value = records
  } catch {
    if (seq === loadSeq) ElMessage.error('帖子加载失败')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

// 进入部落需要登录（查看部落详情/成员的接口也已对游客关闭）
const selectTribe = async (id) => {
  if (!id) return
  if (!await requireAuth()) return
  selectedId.value = id
  page.value = 1
  router.push(`/home?tribe=${id}`)
  loadCurrent(id)
  loadMembers(id)
  loadPosts()
}

const backToAll = () => {
  selectedId.value = null
  current.value = null
  members.value = []
  page.value = 1
  router.push('/home')
  loadTribes()
  loadMyTribes()
  loadPosts()
}

const goEditTribe = async () => {
  if (!await requireAuth()) return
  router.push(`/tribe/edit/${selectedId.value}`)
}

const joinTribe = async () => {
  if (!await requireAuth()) return
  try {
    const res = await http.post(`/tribe/${selectedId.value}/join`)
    if (res.data.code === 200) {
      ElMessage.success('已加入部落')
      loadCurrent(selectedId.value)
      loadMembers(selectedId.value)
      loadMyTribes()
      loadTribes()
    } else ElMessage.error(res.data.message)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加入失败')
  }
}

const leaveTribe = async () => {
  try {
    const res = await http.post(`/tribe/${selectedId.value}/leave`)
    if (res.data.code === 200) {
      ElMessage.success('已退出部落')
      loadCurrent(selectedId.value)
      loadMembers(selectedId.value)
      loadMyTribes()
      loadTribes()
    } else ElMessage.error(res.data.message)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '退出失败')
  }
}

const toggleRole = async (m) => {
  const next = m.role === ROLE_DEPUTY ? ROLE_MEMBER : ROLE_DEPUTY
  try {
    const res = await http.put(`/tribe/${selectedId.value}/role`, { userId: m.userId, role: next })
    if (res.data.code === 200) {
      ElMessage.success(next === ROLE_DEPUTY ? '已任命副首领' : '已恢复为普通成员')
      loadMembers(selectedId.value)
    } else ElMessage.error(res.data.message)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

const toggleMute = async (m) => {
  try {
    const res = await http.put(`/tribe/${selectedId.value}/mute`, { userId: m.userId, muted: m.muted !== 1 })
    if (res.data.code === 200) {
      ElMessage.success(m.muted === 1 ? '已解除禁言' : '已禁言该成员')
      loadMembers(selectedId.value)
    } else ElMessage.error(res.data.message)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

const kickMember = async (m) => {
  try {
    const res = await http.delete(`/tribe/${selectedId.value}/member/${m.userId}`)
    if (res.data.code === 200) {
      ElMessage.success('已踢出该成员')
      loadMembers(selectedId.value)
      loadCurrent(selectedId.value)
    } else ElMessage.error(res.data.message)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

const changeSort = (value) => { sort.value = value; page.value = 1; loadPosts() }

// 搜索只对登录用户开放（后端同样会拒绝游客的关键词请求）
const doSearch = async () => {
  const kw = keyword.value.trim()
  // 空关键词等于刷新列表，不强制登录；真正搜索才要求登录
  if (kw && !await requireAuth()) return
  searchKeyword.value = kw
  page.value = 1
  loadPosts()
}
const clearSearch = () => { keyword.value = ''; searchKeyword.value = ''; page.value = 1; loadPosts() }

// 部落搜索（回车）同样需要登录，加载列表本身仍对游客开放
const searchTribe = async () => {
  if (!await requireAuth()) return
  loadTribes()
}

const excerpt = (content) => {
  if (!content) return '暂无正文'
  const text = content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return '（图片内容）'
  return text.length > 100 ? text.slice(0, 100) + '...' : text
}

const postImages = (content) => {
  if (!content) return []
  const tags = content.match(/<img\b[^>]*>/gi) || []
  return tags.map(tag => (tag.match(/src\s*=\s*["']([^"']+)["']/i) || [])[1]).filter(Boolean).slice(0, 3)
}

const onThumbError = (e) => { e.target.style.display = 'none' }

// 等级 = 发帖/评论活跃值 + 签到等额外经验（authorExp）
const authorLevel = (post) => calcLevel(post.authorPostCount, post.authorCommentCount, post.authorExp)
const memberLevel = (m) => calcLevel(m.authorPostCount, m.authorCommentCount, m.authorExp)
const commentLevel = (c) => calcLevel(c.authorPostCount, c.authorCommentCount, c.authorExp)

// 回复内容去标签并截断：图片占位成「[图片]」，表情标签还原成字符
const plain = (text) => {
  if (!text) return ''
  let t = text.replace(/<img\b[^>]*>/gi, ' [图片] ')
  t = t.replace(/\[([^\][\n]{1,10})\]/g, (m, tag) => {
    const emoji = findEmoji(tag)
    return emoji ? emoji.char : m
  })
  t = t.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > 70 ? t.slice(0, 70) + '...' : t
}

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  return date.toLocaleDateString()
}

const logout = () => { clearAuth(); router.push('/home') }
const openChangePasswordDialog = () => { pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }; dialogVisible.value = true }
const submitChangePassword = async () => {
  try { await pwdFormRef.value.validate() } catch { return }
  const res = await http.post('/user/changePassword', { oldPassword: pwdForm.value.oldPassword, newPassword: pwdForm.value.newPassword })
  if (res.data.code === 200) { ElMessage.success('修改成功，请重新登录'); clearAuth(); router.push('/home') }
  else ElMessage.error(res.data.message)
}

watch(() => route.query.tribe, (val) => {
  const id = val ? Number(val) : null
  if (id !== selectedId.value) {
    selectedId.value = id
    page.value = 1
    // 部落详情/成员接口需要登录，游客带 ?tribe= 进来时跳过，避免 401 被拦截器整页跳走
    if (id && loggedIn.value) { loadCurrent(id); loadMembers(id) } else { current.value = null; members.value = [] }
    loadPosts()
  }
})

onMounted(async () => {
  await loadTribes()
  await loadMyTribes()
  if (selectedId.value && loggedIn.value) {
    await loadCurrent(selectedId.value)
    await loadMembers(selectedId.value)
  } else {
    current.value = null
    members.value = []
  }
  await loadPosts()
})
</script>

<style scoped>
/* 首页多了一列签到日历，容器放宽，避免正文被挤窄 */
.container { max-width: 1200px; }
.hero { display: flex; flex-direction: column; gap: 14px; padding: 24px 28px; margin-bottom: 14px; }
.hero-text { text-align: center; }
.hero-title { font-size: 26px; font-weight: 700; color: #333; }
.hero-sub { color: #999; font-size: 13px; margin-top: 4px; }
.search-bar { max-width: 560px; width: 100%; margin: 0 auto; }

.tribe-layout { display: flex; gap: 14px; align-items: flex-start; }
/* 签到日历列：常规宽度下作为首页最左列 */
.checkin-side { width: 252px; flex-shrink: 0; position: sticky; top: 70px; }
/* 部落多了以后侧栏会无限变长：固定最大高度、内部滚动，避免整页被撑爆 */
.tribe-side {
  width: 230px; flex-shrink: 0; padding: 12px; position: sticky; top: 70px;
  max-height: calc(100vh - 90px); overflow-y: auto;
}
/* 热门部落列：常规宽度下作为首页最右列 */
.hot-side {
  width: 232px; flex-shrink: 0; position: sticky; top: 70px;
  max-height: calc(100vh - 90px); overflow-y: auto;
}
.post-main { flex: 1; min-width: 0; }
/* 部落成员同理，上百人时侧栏内部滚动 */
.member-side {
  width: 240px; flex-shrink: 0; padding: 12px; position: sticky; top: 70px;
  max-height: calc(100vh - 90px); overflow-y: auto;
}

.side-block { margin-top: 14px; }
.side-title { font-size: 13px; color: #999; padding: 6px 4px; border-bottom: 1px solid #e5e5e5; margin-bottom: 6px; }
.side-empty { font-size: 12px; color: #bbb; padding: 8px 4px; }
.tribe-item {
  display: flex; align-items: center; gap: 6px; padding: 7px 6px;
  border-radius: 4px; cursor: pointer; font-size: 13px; color: #555;
}
.tribe-item:hover { background: #f7f7f7; color: #4e6ef2; }
.tribe-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tribe-count { font-size: 11px; color: #bbb; flex-shrink: 0; }
.tribe-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.tribe-avatar-ph {
  background: #4e6ef2; color: #fff; font-size: 11px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
.create-tribe-btn { width: 100%; margin-top: 14px; }

.current-tribe { display: flex; gap: 10px; padding: 8px 4px; }
.current-avatar { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; flex-shrink: 0; font-size: 18px; }
.current-info { min-width: 0; }
.current-name { font-size: 15px; font-weight: 600; color: #333; }
.current-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #999; margin: 2px 0; flex-wrap: wrap; }
/* 当前部落的热度等级进度 */
.current-heat { margin-top: 8px; }
.heat-track { height: 4px; background: #f2f3f5; border-radius: 2px; overflow: hidden; }
.heat-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.heat-fill.hl1 { background: #c8c9cc; }
.heat-fill.hl2 { background: #85ce61; }
.heat-fill.hl3 { background: #66b1ff; }
.heat-fill.hl4 { background: #e6a23c; }
.heat-fill.hl5 { background: #f56c6c; }
.heat-text { font-size: 11px; color: #b0b0b0; margin-top: 4px; }
.current-desc { font-size: 12px; color: #666; line-height: 1.5; }
.side-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.pending-tag { font-size: 11px; color: #e6a23c; background: #fdf6ec; border-radius: 8px; padding: 0 6px; }

.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; margin-bottom: 14px; }
.sort-tabs { display: flex; gap: 16px; font-size: 14px; color: #666; align-items: center; flex-wrap: wrap; }
.sort-tabs span { cursor: pointer; }
.sort-tabs span.active { color: #4e6ef2; font-weight: 600; }
.search-tip { color: #999; font-size: 12px; font-weight: normal; }
.clear-search { margin-left: 6px; cursor: pointer; }
.current-tip { color: #4e6ef2; font-size: 12px; font-weight: normal; }

.post-item { cursor: pointer; padding: 16px 18px; transition: border-color 0.15s; }
.post-item:hover { border-color: #c9d4f5; }
.post-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.board-tag { background: #ecf5ff; color: #409eff; padding: 1px 8px; border-radius: 4px; font-size: 12px; }
.tribe-tag { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; cursor: pointer; }
.tag-avatar { width: 14px; height: 14px; border-radius: 50%; object-fit: cover; }
.post-title { font-size: 16px; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.post-item:hover .post-title { color: #4e6ef2; }
.post-excerpt { color: #666; font-size: 13px; line-height: 1.7; margin-bottom: 8px; }

.post-images { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
/* 按原图比例缩放：宽高都不写死，只限制上限，完整显示不裁剪；
   小图保持原始尺寸不被放大，避免模糊。不要用 object-fit: cover —— 它会裁掉长边。 */
.post-thumb {
  width: auto;
  height: auto;
  flex-shrink: 0;
  max-width: 170px;
  max-height: 92px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid #eee;
  background: #f7f7f7;
}

.post-meta { display: flex; gap: 12px; color: #999; font-size: 12px; align-items: center; flex-wrap: wrap; }
.clickable { cursor: pointer; }
.author-name { cursor: pointer; }
.author-name:hover { color: #4e6ef2; }
.author-level { padding: 0 6px; border-radius: 8px; font-size: 11px; font-weight: 600; color: #fff; line-height: 16px; }
.author-level.lv1 { background: #b6b6b6; }
.author-level.lv2 { background: #67c23a; }
.author-level.lv3 { background: #409eff; }
.author-level.lv4 { background: #17b3a3; }
.author-level.lv5 { background: #e6a23c; }
.author-level.lv6 { background: #7c5cff; }
.list-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
.list-avatar-placeholder {
  width: 22px; height: 22px; border-radius: 50%; background: #4e6ef2; color: #fff;
  font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center;
}

.hot-comments { margin-top: 10px; background: #fafafa; border-radius: 6px; padding: 8px 12px; }
.hot-comment {
  display: flex; align-items: center; gap: 6px; padding: 4px 0;
  font-size: 12px; color: #666; line-height: 1.5;
}
.hot-comment + .hot-comment { border-top: 1px dashed #eee; }
.hc-avatar { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; flex-shrink: 0; cursor: pointer; }
.hc-avatar-ph {
  background: #4e6ef2; color: #fff; font-size: 10px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
.hc-name { color: #333; font-weight: 600; cursor: pointer; flex-shrink: 0; }
.hc-name:hover { color: #4e6ef2; }
.hc-content { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hc-likes { flex-shrink: 0; color: #e6a23c; font-size: 11px; }
.hc-more { margin-top: 4px; font-size: 11px; color: #4e6ef2; }

.member-item { display: flex; gap: 8px; align-items: flex-start; padding: 8px 4px; border-bottom: 1px solid #f5f5f5; }
.member-item:last-child { border-bottom: none; }
.member-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0; cursor: pointer; font-size: 13px; }
.member-info { flex: 1; min-width: 0; }
.member-name { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #333; flex-wrap: wrap; }
.member-level { margin-top: 2px; }
.muted-tag { font-size: 11px; color: #f56c6c; background: #fef0f0; border-radius: 8px; padding: 0 6px; }
.member-actions { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }

.login-btn { color: #4e6ef2; font-weight: 600; }

/* 宽屏下正文居中会留出很宽的边距：把签到日历钉到视口最左侧并按边距自动放大，
   既贴住左边空白，也不会压到正文 */
@media (min-width: 1700px) {
  .checkin-side {
    position: fixed;
    left: 16px;
    top: 84px;
    width: clamp(220px, calc((100vw - 1200px) / 2 - 40px), 380px);
    /* 底部留出 ~100px，避免盖住左下角的 AI 助手按钮 */
    max-height: calc(100vh - 180px);
    overflow-y: auto;
    z-index: 5;
  }
  /* 右侧同样留白很宽，热门部落榜也钉到视口最右侧。
     底部预留 ~100px，避免盖住右下角的「回到顶部」按钮 */
  .hot-side {
    position: fixed;
    right: 16px;
    top: 84px;
    width: clamp(220px, calc((100vw - 1200px) / 2 - 28px), 440px);
    max-height: calc(100vh - 180px);
    overflow-y: auto;
    z-index: 5;
  }
}
@media (max-width: 1699px) {
  /* 中等宽度看部落详情时右侧还有成员列表，先收起热门榜 */
  .tribe-layout.detail .hot-side { display: none; }
}
@media (max-width: 1200px) {
  .hot-side { display: none; }
}
@media (max-width: 1080px) {
  /* 窄屏先收起签到日历，正文优先 */
  .checkin-side { display: none; }
}
@media (max-width: 1100px) {
  .member-side { display: none; }
}
@media (max-width: 820px) {
  .tribe-side { display: none; }
}
</style>
