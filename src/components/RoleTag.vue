<template>
  <span v-if="role" class="role-tag" :class="'role-' + String(role).toLowerCase()">{{ roleLabel(role) }}</span>
</template>

<script setup>
import { roleLabel } from '../utils/tribe'

defineProps({ role: String })
</script>

<style scoped>
.role-tag {
  display: inline-block;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  line-height: 16px;
  flex-shrink: 0;
}
.role-tag.role-leader { background: #e6a23c; }
.role-tag.role-deputy { background: #7c5cff; }
.role-tag.role-member { background: #b6b6b6; }
</style>
