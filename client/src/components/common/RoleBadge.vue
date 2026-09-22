<script setup>
import { computed } from 'vue';
import { ShieldCheck, Briefcase, UserCheck } from 'lucide-vue-next';

const props = defineProps({
  role: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'md' // 'sm', 'md'
  }
});

const roleConfig = computed(() => {
  switch (props.role) {
    case 'HEAD_GROUP':
      return {
        label: 'Head Group',
        class: 'badge-head-group',
        icon: ShieldCheck
      };
    case 'DEPARTMENT_HEAD':
      return {
        label: 'Dept Head',
        class: 'badge-dept-head',
        icon: Briefcase
      };
    case 'MEMBER':
    default:
      return {
        label: 'Member',
        class: 'badge-member',
        icon: UserCheck
      };
  }
});
</script>

<template>
  <span :class="['badge', roleConfig.class, size === 'sm' ? 'badge-sm' : '']">
    <component :is="roleConfig.icon" class="badge-icon" :size="size === 'sm' ? 12 : 14" />
    <span>{{ roleConfig.label }}</span>
  </span>
</template>

<style scoped>
.badge-sm {
  font-size: 0.675rem;
  padding: 0.15rem 0.45rem;
}
.badge-icon {
  flex-shrink: 0;
}
</style>
