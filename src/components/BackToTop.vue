<template>
  <transition name="btt-fade">
    <button v-if="visible" class="back-to-top" title="回到顶部" @click="toTop">
      <span class="arrow">↑</span>
    </button>
  </transition>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

/** 滚动超过这个距离才显示按钮，避免一进页面就挡视线 */
const SHOW_AFTER = 400

const visible = ref(false)

const onScroll = () => {
  visible.value = window.scrollY > SHOW_AFTER
}

const toTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  right: 28px;
  bottom: 28px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px solid #e5e5e5;
  background: #fff;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  transition: color 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s;
  z-index: 20;
  padding: 0;
}
.back-to-top:hover {
  color: #4e6ef2;
  border-color: #c6d4ff;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(78, 110, 242, 0.2);
}
.back-to-top:active { transform: translateY(-1px); }
.arrow { font-size: 18px; font-weight: 700; line-height: 1; }

.btt-fade-enter-active,
.btt-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.btt-fade-enter-from,
.btt-fade-leave-to { opacity: 0; transform: translateY(8px); }

@media (max-width: 768px) {
  .back-to-top { right: 16px; bottom: 16px; width: 40px; height: 40px; }
}
</style>
