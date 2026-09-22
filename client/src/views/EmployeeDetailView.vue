<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { resetPasswordApi } from '@/api/auth';
import RoleBadge from '@/components/common/RoleBadge.vue';
import { User, KeyRound, Building2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const employeeId = computed(() => route.params.id);
const isResetting = ref(false);
const resetResult = ref(null);
const resetError = ref('');

// Admin reset permission: Head Group for anyone, Dept Head for own department member
const canResetPassword = computed(() => {
  if (authStore.isHeadGroup) return true;
  if (authStore.isDepartmentHead) return true;
  return false;
});

async function triggerResetPassword() {
  if (!confirm('Are you sure you want to reset this user\'s password? A temporary password will be generated.')) {
    return;
  }

  isResetting.value = true;
  resetResult.value = null;
  resetError.value = '';

  try {
    const res = await resetPasswordApi(employeeId.value);
    resetResult.value = res;
  } catch (err) {
    resetError.value = err.message || 'Failed to reset password.';
  } finally {
    isResetting.value = false;
  }
}
</script>

<template>
  <div class="employee-detail-view">
    <div class="view-header">
      <div>
        <h1 class="page-title">Employee Profile</h1>
        <p class="page-desc">Detailed workload history, capacity telemetry, and administrative controls</p>
      </div>
      <div v-if="canResetPassword" class="header-actions">
        <button
          class="btn btn-secondary"
          :disabled="isResetting"
          @click="triggerResetPassword"
          title="Admin-driven password reset (prd.md §4.1)"
        >
          <KeyRound :size="16" />
          <span>{{ isResetting ? 'Resetting...' : 'Reset Password' }}</span>
        </button>
      </div>
    </div>

    <!-- Password Reset Notification Banner -->
    <div v-if="resetResult" class="reset-success-card glass-card">
      <div class="reset-icon-wrap">
        <CheckCircle2 :size="22" class="text-emerald" />
      </div>
      <div class="reset-content">
        <h4 class="reset-title">Temporary Password Generated</h4>
        <p class="reset-desc">
          User <strong>{{ resetResult.user?.name }}</strong> (@{{ resetResult.user?.username }}) must change this password on next login.
        </p>
        <div class="temp-pass-box">
          <span class="temp-label">Temporary Password:</span>
          <code class="temp-code">{{ resetResult.temporaryPassword }}</code>
        </div>
      </div>
    </div>

    <div v-if="resetError" class="error-alert">
      <AlertCircle :size="16" />
      <span>{{ resetError }}</span>
    </div>

    <!-- Profile Overview Placeholder -->
    <div class="content-box glass-card">
      <div class="empty-state">
        <div class="icon-wrap">
          <User :size="28" />
        </div>
        <h3 class="title">Employee Workload History (Phase 4 Scope)</h3>
        <p class="desc">
          Full 4-week trend charts, ticket status distributions, and week-by-week audit trails will be fully populated in Phase 4.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.employee-detail-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}

.page-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.reset-success-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border-left: 4px solid var(--accent-emerald);
  background: rgba(16, 185, 129, 0.08);
}

.reset-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.reset-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.temp-pass-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  background: var(--bg-surface);
  padding: 0.5rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  width: fit-content;
}

.temp-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.temp-code {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 700;
  color: #34d399;
}

.content-box {
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
  max-width: 480px;
  padding: 2rem 1rem;
}

.icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(2, 132, 199, 0.1);
  color: var(--accent-cyan);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
