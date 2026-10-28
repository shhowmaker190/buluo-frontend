<template>
  <div class="page-container">
    <div class="navbar">
      <div class="brand" @click="router.push('/home')">
        <div class="brand-logo">闲</div>
        <span>部落闲聊</span>
      </div>
      <div class="nav-links">
        <span class="nav-link" @click="router.push('/home')">首页</span>
        <span class="nav-link" @click="router.push('/create')">发帖</span>
        <span class="nav-link" @click="router.push('/my-posts')">我的帖子</span>
        <span class="nav-link" @click="router.push('/chat')">好友</span>
        <TribeMenu />
        <span class="nav-link active" @click="router.push('/admin')">管理后台</span>
      </div>
      <span class="nav-link" @click="openChangePasswordDialog">修改密码</span>
      <span class="nav-link" @click="logout">退出</span>
      <span class="user-info" @click="router.push('/profile')" style="cursor:pointer">
          <img v-if="currentAvatar" :src="currentAvatar" class="nav-avatar" @error="currentAvatar = ''" />
          <span v-else class="nav-avatar-placeholder">{{ currentUsername ? currentUsername[0].toUpperCase() : 'U' }}</span>
          {{ currentUsername }}
        </span>
      <NotificationBell />
    </div>

    <div class="container">
      <div class="card">
        <el-tabs v-model="activeTab" class="group-tabs" @tab-change="onTabChange">
          <!-- ========== 帖子管理 ========== -->
          <el-tab-pane label="帖子管理" name="posts">
            <el-tabs v-model="postSub" class="inner-tabs" @tab-change="onPostSubChange">
              <el-tab-pane :label="`待审核${pendingPosts.length ? ' (' + pendingPosts.length + ')' : ''}`" name="pending">
                <el-table :data="pendingPosts" v-loading="loadingPending">
                  <el-table-column prop="id" label="帖子ID" width="90" />
                  <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
                  <el-table-column label="部落" width="130">
                    <template #default="{row}">{{ row.tribeName || '—' }}</template>
                  </el-table-column>
                  <el-table-column label="作者" width="120">
                    <template #default="{row}">{{ row.username || '—' }}</template>
                  </el-table-column>
                  <el-table-column label="发布时间" width="160">
                    <template #default="{row}">{{ formatTime(row.createdAt) }}</template>
                  </el-table-column>
                  <el-table-column label="操作" width="230">
                    <template #default="{row}">
                      <el-button type="success" size="small" @click="approvePost(row.id)">通过</el-button>
                      <el-button type="danger" size="small" @click="openRejectDialog(row)">拒绝</el-button>
                      <el-button size="small" @click="goPost(row.id)">查看</el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <div v-if="!loadingPending && pendingPosts.length === 0" class="empty">暂无待审核帖子</div>
              </el-tab-pane>

              <el-tab-pane label="全部帖子" name="all">
                <div class="tab-toolbar">
                  <span class="muted">共 {{ allPosts.length }} 条（最多展示 300 条，按 ID 倒序）</span>
                  <el-button size="small" @click="loadAllPosts">刷新</el-button>
                </div>
                <el-table :data="allPosts" v-loading="loadingAllPosts">
                  <el-table-column prop="id" label="帖子ID" width="90" />
                  <el-table-column prop="title" label="标题" min-width="170" show-overflow-tooltip />
                  <el-table-column label="部落" width="130">
                    <template #default="{row}">{{ row.tribeName || '—' }}</template>
                  </el-table-column>
                  <el-table-column label="作者" width="120">
                    <template #default="{row}">{{ row.username || '—' }}</template>
                  </el-table-column>
                  <el-table-column label="状态" width="90">
                    <template #default="{row}">
                      <span class="st" :class="row.status === 0 ? 'st0' : row.status === 1 ? 'st1' : 'st2'">
                        {{ row.status === 0 ? '待审核' : row.status === 1 ? '已发布' : row.status === 2 ? '已拒绝' : '—' }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="发布时间" width="160">
                    <template #default="{row}">{{ formatTime(row.createdAt) }}</template>
                  </el-table-column>
                  <el-table-column label="操作" width="150">
                    <template #default="{row}">
                      <el-button size="small" @click="goPost(row.id)">查看</el-button>
                      <el-button size="small" type="danger" plain @click="removePost(row)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>
            </el-tabs>
          </el-tab-pane>

          <!-- ========== 部落管理 ========== -->
          <el-tab-pane label="部落管理" name="tribes">
            <el-tabs v-model="tribeSub" class="inner-tabs" @tab-change="onTribeSubChange">
              <el-tab-pane :label="`待审核${pendingTribes.length ? ' (' + pendingTribes.length + ')' : ''}`" name="pending">
                <el-table :data="pendingTribes" v-loading="loadingTribes">
                  <el-table-column prop="id" label="部落ID" width="90" />
                  <el-table-column prop="name" label="部落名称" width="160" show-overflow-tooltip />
                  <el-table-column prop="description" label="简介" min-width="160" show-overflow-tooltip />
                  <el-table-column prop="creatorName" label="创建者" width="110" />
                  <el-table-column label="申请时间" width="160">
                    <template #default="{row}">{{ formatTime(row.createdAt) }}</template>
                  </el-table-column>
                  <el-table-column label="操作" width="210">
                    <template #default="{row}">
                      <el-button type="success" size="small" @click="approveTribe(row.id)">通过</el-button>
                      <el-button type="danger" size="small" @click="rejectTribe(row)">拒绝</el-button>
                      <el-button size="small" @click="goTribe(row.id)">查看</el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <div v-if="!loadingTribes && pendingTribes.length === 0" class="empty">暂无待审核部落</div>
              </el-tab-pane>

              <el-tab-pane :label="`修改审核${pendingEdits.length ? ' (' + pendingEdits.length + ')' : ''}`" name="edit">
                <el-table :data="pendingEdits" v-loading="loadingTribes">
                  <el-table-column prop="id" label="部落ID" width="90" />
                  <el-table-column label="名称" min-width="200">
                    <template #default="{row}">
                      <span class="old-val">{{ row.name }}</span>
                      <span class="diff-arrow">→</span>
                      <span class="new-val">{{ row.pendingName }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="头像" width="130">
                    <template #default="{row}">
                      <div class="avatar-diff">
                        <img v-if="row.avatar" :src="row.avatar" class="table-avatar" />
                        <span v-else class="table-avatar-ph">旧</span>
                        <span class="diff-arrow">→</span>
                        <img v-if="row.pendingAvatar" :src="row.pendingAvatar" class="table-avatar" />
                        <span v-else class="table-avatar-ph">无</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="简介" min-width="150" show-overflow-tooltip>
                    <template #default="{row}">{{ row.pendingDescription || row.description || '-' }}</template>
                  </el-table-column>
                  <el-table-column label="操作" width="150">
                    <template #default="{row}">
                      <el-button type="success" size="small" @click="approveEdit(row.id)">通过</el-button>
                      <el-button type="danger" size="small" @click="rejectEdit(row.id)">拒绝</el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <div v-if="!loadingTribes && pendingEdits.length === 0" class="empty">暂无待审修改</div>
              </el-tab-pane>

              <el-tab-pane label="部落列表" name="list">
                <div class="tab-toolbar">
                  <span class="muted">共 {{ tribes.length }} 个已上线部落</span>
                  <el-button size="small" @click="loadTribes">刷新</el-button>
                </div>
                <el-table :data="tribes">
                  <el-table-column prop="id" label="部落ID" width="90" />
                  <el-table-column prop="name" label="部落名称" width="160" show-overflow-tooltip />
                  <el-table-column prop="creatorName" label="首领" width="110" />
                  <el-table-column prop="memberCount" label="成员数" width="90" />
                  <el-table-column prop="description" label="简介" show-overflow-tooltip />
                  <el-table-column label="操作" width="100">
                    <template #default="{row}">
                      <el-button size="small" @click="goTribe(row.id)">查看</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>
            </el-tabs>
          </el-tab-pane>

          <!-- ========== 用户管理 ========== -->
          <el-tab-pane label="用户管理" name="users">
            <el-tabs v-model="userSub" class="inner-tabs" @tab-change="onUserSubChange">
              <el-tab-pane label="用户列表" name="list">
                <div class="tab-toolbar">
                  <span class="muted">共 {{ users.length }} 位用户</span>
                  <el-button size="small" @click="loadUsers">刷新</el-button>
                </div>
                <el-table :data="users">
                  <el-table-column label="用户ID" width="110">
                    <template #default="{row}">
                      <span class="user-no">{{ row.userNo || '—' }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="id" label="内部ID" width="80" />
                  <el-table-column label="头像" width="70">
                    <template #default="{row}">
                      <img
                        v-if="row.avatar"
                        :src="row.avatar"
                        class="table-avatar clickable"
                        title="查看主页"
                        @click="goUser(row.id)"
                        @error="row.avatar = ''"
                      />
                      <span
                        v-else
                        class="table-avatar-ph clickable"
                        title="查看主页"
                        @click="goUser(row.id)"
                      >{{ (row.username || '?')[0].toUpperCase() }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="username" label="用户名" width="160" show-overflow-tooltip />
                  <el-table-column label="角色" width="100">
                    <template #default="{row}">
                      <span class="role-pill" :class="row.role === 'ADMIN' ? 'admin' : 'user'">
                        {{ row.role === 'ADMIN' ? '管理员' : '用户' }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
                  <el-table-column label="注册时间" width="160">
                    <template #default="{row}">{{ formatTime(row.createdAt) }}</template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>

              <el-tab-pane :label="`改名审核${pendingRenameCount ? ' (' + pendingRenameCount + ')' : ''}`" name="rename">
                <div class="tab-toolbar">
                  <span class="muted">共 {{ renameRequests.length }} 条申请（待审核 {{ pendingRenameCount }} 条）</span>
                  <el-button size="small" @click="loadRenameRequests">刷新</el-button>
                </div>
                <el-table :data="renameRequests" v-loading="loadingRename">
                  <el-table-column label="用户" width="190">
                    <template #default="{row}">
                      <div class="cell-main">{{ row.username }}</div>
                      <div class="cell-sub">ID {{ row.userNo || '—' }}</div>
                    </template>
                  </el-table-column>
                  <el-table-column label="改名" min-width="200">
                    <template #default="{row}">
                      <span class="old-val">{{ row.oldName }}</span>
                      <span class="diff-arrow">→</span>
                      <span class="new-val">{{ row.newName }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="申请时间" width="160">
                    <template #default="{row}">{{ formatTime(row.createdAt) }}</template>
                  </el-table-column>
                  <el-table-column label="状态" width="90">
                    <template #default="{row}">
                      <span class="st" :class="row.status === 0 ? 'st0' : row.status === 1 ? 'st1' : 'st2'">
                        {{ row.status === 0 ? '待审核' : row.status === 1 ? '已通过' : '已拒绝' }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="170">
                    <template #default="{row}">
                      <template v-if="row.status === 0">
                        <el-button size="small" type="primary" @click="handleRename(row, true)">通过</el-button>
                        <el-button size="small" @click="handleRename(row, false)">拒绝</el-button>
                      </template>
                      <span v-else class="muted ellipsis">{{ row.rejectReason || '—' }}</span>
                    </template>
                  </el-table-column>
                </el-table>
              </el-tab-pane>

              <el-tab-pane label="限制评论" name="restrict">
                <div class="tab-content">
                  <el-input v-model="restrict.userId" placeholder="内部用户ID（数字，可在用户列表查）" style="max-width:260px;" />
                  <el-input v-model="restrict.postId" placeholder="帖子ID" style="max-width:180px;" />
                  <el-button type="warning" @click="restrictComment">限制</el-button>
                  <el-button type="success" @click="unrestrictComment">解除</el-button>
                </div>
                <div class="muted" style="padding: 0 2px;">限制后该用户将无法在这篇帖子下评论；填 0 表示对该用户全站限制。</div>
              </el-tab-pane>
            </el-tabs>
          </el-tab-pane>

          <!-- ========== 举报处理 ========== -->
          <el-tab-pane :label="`举报处理${pendingReportCount ? ' (' + pendingReportCount + ')' : ''}`" name="reports">
            <div class="tab-toolbar">
              <el-radio-group v-model="reportFilter" size="small" @change="loadReports">
                <el-radio-button value="pending">待处理</el-radio-button>
                <el-radio-button value="all">全部</el-radio-button>
              </el-radio-group>
              <span class="muted">共 {{ reports.length }} 条</span>
            </div>
            <el-table :data="reports" v-loading="loadingReports">
              <el-table-column label="类型" width="80">
                <template #default="{row}">
                  <span class="type-tag" :class="row.targetType === 'POST' ? 'is-post' : 'is-tribe'">
                    {{ row.targetType === 'POST' ? '帖子' : '部落' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="对象ID" width="90">
                <template #default="{row}">{{ row.targetId }}</template>
              </el-table-column>
              <el-table-column label="被举报内容" min-width="170">
                <template #default="{row}">
                  <div class="cell-main">{{ row.targetTitle }}</div>
                  <div class="cell-sub">作者：{{ row.targetAuthor || '—' }}</div>
                </template>
              </el-table-column>
              <el-table-column label="举报原因" width="160">
                <template #default="{row}">
                  <div class="cell-main">{{ row.reason }}</div>
                  <div class="cell-sub ellipsis">{{ row.detail || '无补充说明' }}</div>
                </template>
              </el-table-column>
              <el-table-column prop="reporterName" label="举报人" width="110" />
              <el-table-column label="举报时间" width="160">
                <template #default="{row}">{{ formatTime(row.createdAt) }}</template>
              </el-table-column>
              <el-table-column label="状态" width="90">
                <template #default="{row}">
                  <span class="st" :class="'st' + row.status">
                    {{ row.status === 0 ? '待处理' : row.status === 1 ? '已下架' : '已驳回' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180">
                <template #default="{row}">
                  <template v-if="row.status === 0">
                    <el-button size="small" type="danger" plain @click="handleReport(row, true)">下架内容</el-button>
                    <el-button size="small" @click="handleReport(row, false)">驳回</el-button>
                  </template>
                  <span v-else class="muted ellipsis">{{ row.handleNote || '—' }}</span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <div class="footer">积极交流，友善发言，违规评论与投票一经发现直接删除！</div>

    <el-dialog title="拒绝原因" v-model="rejectDialogVisible" width="400px">
      <p>确定要拒绝该帖子吗？请输入拒绝原因：</p>
      <el-input v-model="rejectReason" type="textarea" rows="3" placeholder="请输入拒绝原因" style="margin-top:10px;" />
      <template #footer>
        <el-button @click="rejectDialogVisible=false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>

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
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '../utils/http'
import NotificationBell from '../components/NotificationBell.vue'
import TribeMenu from '../components/TribeMenu.vue'
import { currentUsername, currentRole, currentAvatar, clearAuth } from '../composables/auth'

const router = useRouter()
const route = useRoute()

// 一级面板：帖子 / 部落 / 用户 / 举报；每个面板内部的子页记在 xxxSub
// 兼容旧链接和通知里的 bizType：post / tribe / edit / rename / restrict / report
const RESOLVE = {
  post: ['posts', 'pending'],
  posts: ['posts', 'pending'],
  delete: ['posts', 'all'],
  tribe: ['tribes', 'pending'],
  tribes: ['tribes', 'pending'],
  edit: ['tribes', 'edit'],
  rename: ['users', 'rename'],
  restrict: ['users', 'restrict'],
  users: ['users', 'list'],
  report: ['reports', null],
  reports: ['reports', null]
}
const resolveTab = (tab) => RESOLVE[tab] || ['posts', 'pending']

const [initGroup, initSub] = resolveTab(route.query.tab)
const activeTab = ref(initGroup)
const postSub = ref(initGroup === 'posts' && initSub ? initSub : 'pending')
const tribeSub = ref(initGroup === 'tribes' && initSub ? initSub : 'pending')
const userSub = ref(initGroup === 'users' && initSub ? initSub : 'list')

// 地址栏同步当前面板，刷新后还停在这一页
const syncUrl = () => {
  const query = { tab: activeTab.value }
  const sub = { posts: postSub.value, tribes: tribeSub.value, users: userSub.value }[activeTab.value]
  if (sub) query.sub = sub
  router.replace({ path: '/admin', query })
}

// 只刷新当前可见面板的数据
const refreshSub = () => {
  if (activeTab.value === 'posts') return postSub.value === 'all' ? loadAllPosts() : loadPendingPosts()
  if (activeTab.value === 'tribes') return loadTribes()
  if (activeTab.value === 'users') return userSub.value === 'rename' ? loadRenameRequests() : loadUsers()
  if (activeTab.value === 'reports') return loadReports()
}

const onTabChange = () => { syncUrl(); refreshSub() }
const onPostSubChange = () => { syncUrl(); refreshSub() }
const onTribeSubChange = () => { syncUrl(); refreshSub() }
const onUserSubChange = () => { syncUrl(); refreshSub() }

const applyRoute = () => {
  const [group, sub] = resolveTab(route.query.tab)
  const wanted = route.query.sub || sub
  activeTab.value = group
  if (group === 'posts') postSub.value = wanted === 'all' ? 'all' : 'pending'
  if (group === 'tribes') tribeSub.value = ['pending', 'edit', 'list'].includes(wanted) ? wanted : 'pending'
  if (group === 'users') userSub.value = ['list', 'rename', 'restrict'].includes(wanted) ? wanted : 'list'
  refreshSub()
}

// 通知点击（/admin?tab=report 等）在已停留页面时也要生效
watch(() => route.query.tab, applyRoute)

const users = ref([])
const pendingTribes = ref([])
const pendingEdits = ref([])
const tribes = ref([])
const loadingTribes = ref(false)
const restrict = ref({ userId: '', postId: '' })
const dialogVisible = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdFormRef = ref()
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码' }],
  newPassword: [{ required: true, min: 6, message: '新密码至少6位' }],
  confirmPassword: [{ required: true, validator: (r, v, cb) => v === pwdForm.value.newPassword ? cb() : cb(new Error('不一致')) }]
}

const pendingPosts = ref([])
const loadingPending = ref(false)
const allPosts = ref([])
const loadingAllPosts = ref(false)
const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const selectedPost = ref(null)

const formatTime = (time) => time ? new Date(time).toLocaleString() : ''

// ===== 查看：直接跳到前台页面，不在后台弹窗预览 =====
const goPost = (postId) => router.push(`/post/${postId}`)
// 部落没有独立详情路由，首页用 ?tribe= 选中该部落
const goTribe = (tribeId) => router.push({ path: '/home', query: { tribe: tribeId } })
const goUser = (userId) => router.push(`/user/${userId}`)

const loadUsers = async () => {
  const res = await http.get('/admin/users')
  users.value = res.data.data || []
}

// ===== 举报处理 =====
const reports = ref([])
const loadingReports = ref(false)
const reportFilter = ref('pending') // pending=待处理，all=全部
// 待处理举报数：顶部「举报处理」标签上的角标
const pendingReportCount = computed(() => reports.value.filter(r => r.status === 0).length)

const loadReports = async () => {
  loadingReports.value = true
  try {
    const params = reportFilter.value === 'all' ? {} : { status: 0 }
    const res = await http.get('/admin/reports', { params })
    reports.value = res.data.data || []
  } catch (e) {
    ElMessage.error('加载举报失败')
  } finally {
    loadingReports.value = false
  }
}

const handleReport = async (row, takeDown) => {
  let note = ''
  if (takeDown) {
    const { value } = await ElMessageBox.prompt(
      `下架后「${row.targetTitle}」将不再对外展示，并通知作者。可填写说明：`,
      '下架内容',
      { inputPlaceholder: '例如：含违规广告内容（可留空）', inputValue: '' }
    ).catch(() => ({ value: undefined }))
    if (value === undefined) return
    note = value
  } else {
    const ok = await ElMessageBox.confirm(
      `确认驳回这条举报？「${row.targetTitle}」将继续保留。`,
      '驳回举报',
      { type: 'info', confirmButtonText: '驳回', cancelButtonText: '取消' }
    ).then(() => true).catch(() => false)
    if (!ok) return
  }
  const res = await http.post(`/admin/report/handle/${row.id}`, { takeDown, note })
  if (res.data.code === 200) {
    ElMessage.success(res.data.message || '处理完成')
    loadReports()
  } else {
    ElMessage.error(res.data.message || '处理失败')
  }
}

// ===== 改名审核 =====
const renameRequests = ref([])
const loadingRename = ref(false)
const pendingRenameCount = computed(() => renameRequests.value.filter(r => r.status === 0).length)

const loadRenameRequests = async () => {
  loadingRename.value = true
  try {
    const res = await http.get('/admin/rename-requests')
    renameRequests.value = res.data.data || []
  } catch (e) {
    ElMessage.error('加载改名申请失败')
  } finally {
    loadingRename.value = false
  }
}

const handleRename = async (row, accept) => {
  let reason = ''
  if (accept) {
    const ok = await ElMessageBox.confirm(
      `确认将「${row.oldName}」改为「${row.newName}」？通过后立即生效。`,
      '通过改名',
      { type: 'warning', confirmButtonText: '通过', cancelButtonText: '取消' }
    ).then(() => true).catch(() => false)
    if (!ok) return
  } else {
    const { value } = await ElMessageBox.prompt('拒绝原因会通知用户，请填写：', '拒绝改名', {
      inputPlaceholder: '例如：名称含违规词',
      inputValue: ''
    }).catch(() => ({ value: undefined }))
    if (value === undefined) return
    if (!value.trim()) return ElMessage.warning('请填写拒绝原因')
    reason = value
  }
  const res = await http.post(`/admin/rename/handle/${row.id}`, { accept, reason })
  if (res.data.code === 200) {
    ElMessage.success(res.data.message || '处理完成')
    loadRenameRequests()
    loadUsers()
  } else {
    ElMessage.error(res.data.message || '处理失败')
  }
}

const loadTribes = async () => {
  loadingTribes.value = true
  try {
    const [a, b, c] = await Promise.all([
      http.get('/admin/tribes/pending'),
      http.get('/admin/tribes'),
      http.get('/admin/tribes/pending-edits')
    ])
    pendingTribes.value = a.data.data || []
    tribes.value = b.data.data || []
    pendingEdits.value = c.data.data || []
  } catch (e) {
    console.error('加载部落失败:', e)
  } finally {
    loadingTribes.value = false
  }
}

const loadPendingPosts = async () => {
  loadingPending.value = true
  try {
    const res = await http.get('/admin/posts/pending')
    pendingPosts.value = res.data.data || []
  } finally {
    loadingPending.value = false
  }
}

const approvePost = async (postId) => {
  await http.post(`/admin/post/approve/${postId}`)
  ElMessage.success('审核通过')
  loadPendingPosts()
}

const openRejectDialog = (post) => {
  selectedPost.value = post
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value.trim()) return ElMessage.warning('请输入拒绝原因')
  await http.post(`/admin/post/reject/${selectedPost.value.id}?reason=${encodeURIComponent(rejectReason.value)}`)
  ElMessage.success('已拒绝')
  rejectDialogVisible.value = false
  loadPendingPosts()
}

// 全部帖子列表（管理用，带部落 / 作者）
const loadAllPosts = async () => {
  loadingAllPosts.value = true
  try {
    const res = await http.get('/admin/posts', { params: { limit: 300 } })
    allPosts.value = res.data.data || []
  } catch (e) {
    ElMessage.error('加载帖子列表失败')
  } finally {
    loadingAllPosts.value = false
  }
}

// 列表行内直接删除，替代原来「输入帖子ID」的交互
const removePost = async (row) => {
  const ok = await ElMessageBox.confirm(
    `确定删除帖子 #${row.id}「${row.title}」？删除后不可恢复。`,
    '删除帖子',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  ).then(() => true).catch(() => false)
  if (!ok) return
  try {
    const res = await http.delete(`/admin/post/${row.id}`)
    if (res.data.code === 200) {
      ElMessage.success('已删除')
      loadAllPosts()
      loadPendingPosts()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  }
}
const approveTribe = async (id) => {
  const res = await http.post(`/admin/tribe/approve/${id}`)
  if (res.data.code === 200) { ElMessage.success('已通过'); loadTribes() }
  else ElMessage.error(res.data.message || '操作失败')
}

const approveEdit = async (id) => {
  const res = await http.post(`/admin/tribe/approve-edit/${id}`)
  if (res.data.code === 200) { ElMessage.success('修改已生效'); loadTribes() }
  else ElMessage.error(res.data.message || '操作失败')
}

const rejectEdit = async (id) => {
  const { value } = await ElMessageBox.prompt('拒绝原因会通知首领，可留空：', '拒绝部落修改', {
    inputPlaceholder: '例如：简介含联系方式', inputValue: ''
  }).catch(() => ({ value: undefined }))
  if (value === undefined) return
  const res = await http.post(`/admin/tribe/reject-edit/${id}`, { reason: value || '' })
  if (res.data.code === 200) { ElMessage.success('已拒绝该修改'); loadTribes() }
  else ElMessage.error(res.data.message || '操作失败')
}

const rejectTribe = async (tribe) => {
  try {
    const { value } = await ElMessageBox.prompt(`拒绝部落「${tribe.name}」`, '拒绝原因', {
      inputPlaceholder: '可留空', inputValue: ''
    })
    const res = await http.post(`/admin/tribe/reject/${tribe.id}`, { reason: value || '' })
    if (res.data.code === 200) { ElMessage.success('已拒绝'); loadTribes() }
    else ElMessage.error(res.data.message || '操作失败')
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const restrictComment = async () => {
  if (!restrict.value.userId || !restrict.value.postId) return ElMessage.warning('请输入用户ID和帖子ID')
  await http.post('/admin/restrict-comment', restrict.value)
  ElMessage.success('已限制')
}

const unrestrictComment = async () => {
  if (!restrict.value.userId || !restrict.value.postId) return ElMessage.warning('请输入用户ID和帖子ID')
  await http.delete('/admin/unrestrict-comment', { data: restrict.value })
  ElMessage.success('已解除')
}

const logout = () => {
  clearAuth()
  router.push('/login')
}

const openChangePasswordDialog = () => { pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }; dialogVisible.value = true }

const submitChangePassword = async () => {
  try { await pwdFormRef.value.validate() } catch { return }
  const res = await http.post('/user/changePassword', { oldPassword: pwdForm.value.oldPassword, newPassword: pwdForm.value.newPassword })
  if (res.data.code === 200) { ElMessage.success('修改成功，请重新登录'); clearAuth(); router.push('/home') }
  else ElMessage.error(res.data.message)
}

onMounted(() => {
  loadUsers()
  loadTribes()
  loadPendingPosts()
  loadAllPosts()
  loadReports()
  loadRenameRequests()
})
</script>

<style scoped>
.table-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; display: block; }
.avatar-diff { display: flex; align-items: center; gap: 6px; }
.old-val { color: #999; }
.new-val { color: #67c23a; font-weight: 600; }
.diff-arrow { color: #bbb; margin: 0 4px; }
.table-avatar-ph {
  width: 30px; height: 30px; border-radius: 50%; background: #4e6ef2; color: #fff;
  font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center;
}
/* 头像可点进用户主页 */
.table-avatar.clickable, .table-avatar-ph.clickable {
  cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
}
.table-avatar.clickable:hover, .table-avatar-ph.clickable:hover {
  transform: scale(1.08); box-shadow: 0 0 0 2px #c8d6ff;
}
/* 6 位用户ID：等宽字体，避免和内部自增 ID 混淆 */
.user-no { font-family: Consolas, Monaco, monospace; font-size: 13px; color: #4e6ef2; letter-spacing: 0.5px; }

/* 举报 / 改名审核 */
.tab-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 6px 0 12px; flex-wrap: wrap;
}
.muted { font-size: 12px; color: #999; }
.ellipsis { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-main { font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-sub { font-size: 11px; color: #999; margin-top: 2px; }
.type-tag { font-size: 11px; padding: 1px 7px; border-radius: 4px; }
.type-tag.is-post { color: #409eff; background: #ecf5ff; }
.type-tag.is-tribe { color: #67c23a; background: #f0f9eb; }
.st { font-size: 12px; }
.st0 { color: #e6a23c; }
.st1 { color: #67c23a; }
.st2 { color: #909399; }

/* 一级面板（帖子/部落/用户/举报）与二级子页 */
.group-tabs :deep(> .el-tabs__header .el-tabs__item) { font-size: 15px; font-weight: 600; }
.inner-tabs :deep(.el-tabs__header) { margin-bottom: 10px; }
.inner-tabs :deep(.el-tabs__item) { font-size: 13px; height: 34px; line-height: 34px; }
.role-pill { font-size: 11px; padding: 1px 8px; border-radius: 10px; }
.role-pill.admin { background: #fef0f0; color: #f56c6c; }
.role-pill.user { background: #ecf5ff; color: #409eff; }

.tab-content {
  padding: 6px 0 18px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-title {
  font-size: 18px;
  margin-bottom: 6px;
}

.detail-content {
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  border-top: 1px solid #e5e5e5;
  padding-top: 12px;
}
</style>
