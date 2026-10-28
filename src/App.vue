<template>
  <router-view />
  <LoginDialog v-model="loginVisible" />
  <!-- 左下角 AI 小助手（全局可用） -->
  <AiAssistant />
</template>

<script setup>
import { watch, onUnmounted } from 'vue'
import { loginVisible, isLoggedIn } from './composables/auth'
import LoginDialog from './components/LoginDialog.vue'
import AiAssistant from './components/AiAssistant.vue'
import { connectChat, disconnectChat } from './composables/chat'

// 私聊用 SSE 长连接：登录后建立，登出时断开；EventSource 断线会自动重连
watch(isLoggedIn, (logged) => {
  if (logged) connectChat()
  else disconnectChat()
}, { immediate: true })

onUnmounted(disconnectChat)
</script>

<style>
:root {
  --tb-blue: #4e6ef2;
  --tb-blue-hover: #3f5ce0;
  --tb-bg: #f2f2f2;
  --tb-border: #e5e5e5;
  --tb-text: #333;
  --tb-text-secondary: #666;
  --tb-muted: #999;
  --tb-light: #f7f7f7;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  min-height: 100vh;
}

body {
  background: var(--tb-bg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--tb-text);
  font-size: 14px;
  line-height: 1.6;
}

h1, h2, h3, h4 {
  font-weight: 600;
  color: var(--tb-text);
}

a {
  color: var(--tb-blue);
  text-decoration: none;
}

.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--tb-bg);
}

/* 顶部导航 */
.navbar {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid var(--tb-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 18px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--tb-blue);
  cursor: pointer;
  white-space: nowrap;
}

.brand-logo {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: var(--tb-blue);
  color: #fff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.nav-link {
  padding: 7px 12px;
  font-size: 14px;
  color: var(--tb-text-secondary);
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--tb-blue);
  background: #f2f6ff;
}

.nav-link.active {
  color: var(--tb-blue);
  font-weight: 600;
  background: #f2f6ff;
}

.user-info {
  color: var(--tb-text-secondary);
  font-size: 13px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--tb-border);
}

.nav-avatar-placeholder {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--tb-blue);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  flex: 1;
}

.card {
  background: #fff;
  border: 1px solid var(--tb-border);
  border-radius: 4px;
  padding: 18px 20px;
}

.card + .card {
  margin-top: 14px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--tb-border);
  margin-bottom: 12px;
}

.muted {
  color: var(--tb-muted);
  font-size: 12px;
}

.empty {
  text-align: center;
  color: var(--tb-muted);
  padding: 50px 0;
}

.footer {
  text-align: center;
  padding: 22px 12px;
  color: var(--tb-muted);
  font-size: 12px;
  border-top: 1px solid var(--tb-border);
  background: #fff;}

/* Element Plus 扁平化 */
.el-button {
  border-radius: 4px;
  font-weight: 400;
  box-shadow: none !important;
}

.el-button--primary {
  background: var(--tb-blue) !important;
  border-color: var(--tb-blue) !important;
  color: #fff !important;
}

.el-button--primary:hover {
  background: var(--tb-blue-hover) !important;
  border-color: var(--tb-blue-hover) !important;
}

.el-button--default {
  background: #fff;
  border-color: var(--tb-border);
  color: var(--tb-text-secondary);
}

.el-button--default:hover {
  color: var(--tb-blue);
  border-color: var(--tb-blue);
}

.el-button--danger {
  background: #fff !important;
  border-color: #f0c8c8 !important;
  color: #d9534f !important;
}

.el-button--danger:hover {
  background: #fdf2f2 !important;
}

.el-button--success {
  background: var(--tb-blue) !important;
  border-color: var(--tb-blue) !important;
  color: #fff !important;
}

.el-button--warning {
  background: #fff !important;
  border-color: #f0d8b0 !important;
  color: #d98b0f !important;
}

.el-card {
  background: #fff !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}

.el-card__header {
  border-bottom: 1px solid var(--tb-border) !important;
  padding: 14px 20px !important;
}

.el-card__body {
  padding: 18px 20px;
}

.el-input__wrapper {
  background: #fff !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}

.el-input__wrapper.is-focus {
  border-color: var(--tb-blue) !important;
  box-shadow: none !important;
}

.el-textarea__inner {
  border-radius: 4px !important;
  box-shadow: none !important;
  border: 1px solid var(--tb-border) !important;
}

.el-textarea__inner:focus {
  border-color: var(--tb-blue) !important;
}

.el-select__wrapper {
  border-radius: 4px !important;
  box-shadow: none !important;
  border: 1px solid var(--tb-border) !important;
}

.el-tabs__item {
  color: var(--tb-text-secondary);
  font-size: 14px;
}

.el-tabs__item.is-active {
  color: var(--tb-blue);
}

.el-tabs__active-bar {
  background: var(--tb-blue);
}

.el-tabs__nav-wrap::after {
  background: var(--tb-border);
  height: 1px;
}

.el-table {
  --el-table-border-color: var(--tb-border);
  --el-table-header-bg-color: var(--tb-light);
  font-size: 13px;
}

.el-table th.el-table__cell {
  background: var(--tb-light) !important;
  color: var(--tb-text-secondary);
  font-weight: 600;
}

.el-table td.el-table__cell {
  color: var(--tb-text);
}

.el-tag {
  border-radius: 2px;
}

.el-dialog {
  border-radius: 4px;
}

.el-dialog__header {
  border-bottom: 1px solid var(--tb-border);
  margin-right: 0;
  padding-bottom: 14px;
}

.el-pagination {
  justify-content: center;
}

.el-pagination .el-pager li {
  border: 1px solid var(--tb-border);
  border-radius: 4px;
  margin: 0 3px;
  background: #fff;
  color: var(--tb-text-secondary);
}

.el-pagination .el-pager li.active {
  background: var(--tb-blue);
  border-color: var(--tb-blue);
  color: #fff;
}

.el-drawer {
  background: #fff !important;
}

.el-badge__content {
  background: #e74c3c;
}

/* 通用滚动条 */
/* 部落热度等级徽章：首页侧栏、当前部落、我的部落菜单、热门榜共用一套配色 */
.heat-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}
.heat-badge.hl1 { color: #909399; background: #f4f4f5; }
.heat-badge.hl2 { color: #529b2e; background: #f0f9eb; }
.heat-badge.hl3 { color: #337ecc; background: #ecf5ff; }
.heat-badge.hl4 { color: #b88230; background: #fdf6ec; }
.heat-badge.hl5 { color: #c45656; background: #fef0f0; }

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f2f2f2;
}

::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 4px;
}
</style>
