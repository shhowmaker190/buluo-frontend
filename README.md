# 部落闲聊 · 兴趣部落社区系统（前端）

按**兴趣部落**组织内容的社区网页端：浏览首页与热门部落、发帖评论点赞、私聊与分享、好友申请、
每日签到升级，管理员在后台审核帖子和部落、处理举报。

后端仓库：[buluo-backend](https://github.com/shhowmaker190/buluo-backend)

- Vue 3（Composition API）+ Vite，无 TypeScript
- 12 个页面、11 个可复用组件
- 请求层统一注入 token / 处理 401，SSE 接收私聊推送

---

## 页面

| 路由 | 页面 | 能做什么 | 权限 |
|---|---|---|---|
| `/home` | 首页 | 部落筛选、帖子列表分页、热门部落榜、搜索 | 游客可浏览 |
| `/post/:id` | 帖子详情 | 正文、楼中楼评论、评论点赞、分享、举报 | 需登录 |
| `/create` | 发帖 | 选部落、写标题正文、插入图片与表情 | 需登录 |
| `/my-posts` | 我的帖子 | 我的帖子列表，可删、可切换是否公开 | 需登录 |
| `/tribe/create` | 建部落 | 名称、简介、头像，提交后等审核 | 需登录 |
| `/tribe/edit/:id` | 改部落 | 首领/副首领修改资料，改动进待审 | 需登录 |
| `/chat` | 私聊 | 会话列表、历史消息、未读数、分享卡片 | 需登录 |
| `/profile` | 我的主页 | 自己的资料、等级、签到日历、帖子 | 需登录 |
| `/user/:id` | 他人主页 | 看别人的公开帖子并发起私聊 | 需登录 |
| `/admin` | 后台管理 | 审核帖子/部落/改名、处理举报、禁言、删内容 | 需 `role=ADMIN` |
| `/login` `/register` | 登录 / 注册 | — | 公开 |

除首页和登录注册页，其余页面未登录时会弹出登录框（不跳空白页）。

---

## 技术栈

| 关注点 | 选型 |
|---|---|
| 框架 | Vue 3，全部使用 `<script setup>` + Composition API |
| 构建 | Vite |
| 路由 | Vue Router 4（`meta.requiresAuth` / `meta.role` 守卫） |
| UI | Element Plus（弹窗、表单、分页、上传、消息提示） |
| 请求 | axios 实例（`src/utils/http.js`），统一 baseURL / 超时 / token / 401 |
| 实时 | 原生 `EventSource` 订阅 `/api/chat/stream` |
| 状态 | 无 Vuex / Pinia，登录态用模块级 `ref` 导出（`composables/auth.js`） |

---

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:5173 。

> **必须先启动后端 8080**，否则页面能打开但列表是空的、登录报错。
> 演示账号：`demo` / `Demo@123456`，管理员 `admin_demo` / `Admin@123456`（需先导入后端的 `sql/seed.sql`）。

打包生产版本：

```bash
npm run build      # 产物在 dist/
npm run preview    # 本地预览打包结果
```

---

## 与后端联调

所有请求走相对路径 `/api`，开发时由 Vite 代理转发，浏览器里看不到跨域：

```js
// vite.config.js
server: {
  proxy: {
    '/api':     { target: 'http://localhost:8080', changeOrigin: true },
    '/uploads': { target: 'http://localhost:8080', changeOrigin: true }
  }
}
```

因为 URL 是相对的，**部署到任何域名下都不用改代码**，只要把 `/api` 和 `/uploads` 反代到后端即可。

---

## 目录结构

```
src/
├── main.js                 入口：createApp、挂 router、注册 Element Plus 与图标
├── App.vue                 根组件：<router-view> + 登录弹窗 + 通知铃铛 + AI 助手 + 全局样式
├── router/index.js         13 条路由 + 全局守卫
├── utils/
│   ├── http.js             axios 实例（baseURL /api、10s 超时、注入 token、401 清理）
│   ├── level.js            用户等级唯一口径：Lv1~Lv6
│   ├── tribeHeat.js        部落热度等级：Lv1~Lv5
│   └── emoji.js            表情数据
├── composables/
│   ├── auth.js             登录态（token / role / userId）+ 登录弹窗开关 + requireAuth()
│   └── chat.js             SSE 连接、未读数、断线重连
├── views/                  12 个页面（一个页面 = 一个路由）
└── components/             11 个可复用组件
```

### 组件职责

| 组件 | 作用 | 用在哪 |
|---|---|---|
| `LoginDialog` | 登录弹窗，含「立即注册」入口 | 全局（App.vue） |
| `NotificationBell` | 通知铃铛、未读数角标、已读/清空 | 全局顶栏 |
| `AiAssistant` | 右下角 AI 助手面板 | 全局 |
| `CheckinCalendar` | 签到日历，显示本月已签日期与今日状态 | 个人主页 |
| `HotTribes` | 热门部落榜，带热度等级 | 首页侧栏 |
| `TribeMenu` | 「我的部落」下拉菜单 | 首页顶栏 |
| `RoleTag` | 部落身份标签（首领/副首领/成员） | 成员列表、帖子 |
| `ShareDialog` | 分享帖子/部落给好友（选人 → 生成卡片消息） | 帖子详情、部落详情 |
| `ReportDialog` | 举报弹窗（选类型 → 填理由） | 帖子、部落 |
| `EmojiPicker` | 表情选择面板 | 发帖、评论、私聊 |
| `BackToTop` | 回到顶部 | 长列表页 |

---

## 关键实现

### 1. 请求层：一个 axios 实例收口

```js
// src/utils/http.js
const http = axios.create({ baseURL: '/api', timeout: 10000 })

http.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  res => res.data,                       // 直接拿到 { code, message, data }
  err => {
    if (err.response?.status === 401) {  // 过期或被清空
      sessionStorage.clear()
      window.dispatchEvent(new Event('auth-expired'))
    }
    return Promise.reject(err)
  }
)
```

**所有**请求都经过这里，所以新增页面不用自己拼 token、不用自己判 401。

### 2. 登录态：模块级 `ref`，不需要状态库

```js
// src/composables/auth.js
const token = ref(sessionStorage.getItem('token'))
const isLoggedIn = computed(() => !!token.value)

let resolver = null
export function requireAuth() {
  if (isLoggedIn.value) return Promise.resolve(true)
  loginVisible.value = true              // 弹登录框
  return new Promise(resolve => { resolver = resolve })   // 挂起，等登录结果
}
```

`requireAuth()` 的价值在于**把动作挂起**，而不是直接跳走：

```js
// Home.vue
const goCreate = async () => {
  if (!await requireAuth()) return    // 没登录就停在这里，登录成功后自动继续
  router.push('/create')
}
```

游客点「发帖」→ 弹登录框 → 登录成功 → 直接进发帖页，不用自己再找回来。

### 3. 路由守卫

```js
// src/router/index.js
router.beforeEach((to, from, next) => {
  const token = sessionStorage.getItem('token')
  const role = sessionStorage.getItem('role')
  if (to.meta.requiresAuth && !token) {
    loginVisible.value = true        // 弹登录框，而不是跳空白登录页
    next('/home')
  } else if (to.meta.role && to.meta.role !== role) {
    next('/home')                    // 已登录但不是管理员
  } else {
    next()
  }
})
```

`/admin` 同时带 `requiresAuth` 与 `role: 'ADMIN'`，所以「已登录但不是管理员」也进不去。

### 4. 等级口径只算一次

用户等级由三个数决定：已发布帖子数、评论数、签到累计经验。如果每个页面各写一遍，很容易显示不一致，
所以统一收在 `utils/level.js`：

```js
// 活跃值 = 已发布帖子 × 3 + 评论 × 1 + user.exp（签到等额外经验）
export const LEVELS = [
  { level: 1, name: '萌新', minExp: 0 },
  { level: 2, name: '见习', minExp: 10 },
  { level: 3, name: '常客', minExp: 30 },
  { level: 4, name: '活跃', minExp: 70 },
  { level: 5, name: '核心', minExp: 150 },
  { level: 6, name: '元老', minExp: 300 }   // 满级
]
```

任何要显示等级的地方都调 `calcLevel(postCount, commentCount, exp)`，并传后端返回的 `exp` / `authorExp`。
部落热度同理，收在 `utils/tribeHeat.js`（新芽 0 / 微热 5 / 升温 12 / 火爆 25 / 顶流 50）。

### 5. 实时消息：SSE

`EventSource` 不支持自定义请求头，所以 token 走 URL 参数：

```js
// src/composables/chat.js
const es = new EventSource(`/api/chat/stream?token=${encodeURIComponent(token)}`)
es.addEventListener('message', e => { /* 更新未读数、追加消息 */ })
es.onerror = () => { /* 关闭后按退避重连 */ }
```

后端对应接口在 `SecurityConfig` 里放行，由代码内部校验 token。
私聊页面在 `onUnmounted` 时关闭连接，避免切页面后仍占着一个长连接。

### 6. 首页列表的分页状态

`Home.vue` 用三个状态描述列表：`list`（数据）、`loading`（加载中）、`finished`（没有更多）。
翻页时先判断 `finished` 是否已经为真，再决定要不要发请求，避免到底后反复请求同一页。
切换部落筛选时把 `page` 重置为 1 并清空 `finished`。

### 7. 样式约定

- 组件样式一律 `<style scoped>`；
- **不要复用 `App.vue` 里的全局类名**（`.user-info`、`.section-title`、`.empty` 这类）。
  scoped 只覆盖自己声明过的属性，没声明的 `display` / `white-space` 会被全局样式套上，导致布局错乱。

---

## 部署

打包后是纯静态文件，Nginx 需要同时做两件事：前端路由回退 + 接口反代。

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/buluo;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }   # 刷新 /post/12 不 404

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;                            # SSE 必须关闭缓冲
        proxy_read_timeout 3600s;                       # 长连接不要被 60s 掐断
    }
    location /uploads/ { proxy_pass http://127.0.0.1:8080; }
}
```

少了 `try_files` 会出现「首页正常、刷新详情页 404」；少了 `proxy_buffering off` 会出现「私聊消息要等很久才到」。

---

## 已知限制

1. 没有 TypeScript，也没有单元测试；
2. 状态管理用模块级 `ref` 而非 Pinia，页面数量继续增长时应该换掉；
3. 无国际化、无移动端专门适配（窄屏可用，但没有做专门的移动端布局）；
4. 打包后是单个 chunk（约 1.3 MB），首屏加载可优化为路由级 `import()` 分包。

---

## 截图

<!-- 截图放 docs/screenshots/ 下，然后把下面注释里的表格取消注释 -->

<!--
| 首页 | 帖子详情 | 后台 |
|---|---|---|
| ![首页](docs/screenshots/home.png) | ![详情](docs/screenshots/detail.png) | ![后台](docs/screenshots/admin.png) |
-->
