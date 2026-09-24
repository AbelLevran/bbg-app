<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useWorkloadStore } from '@/stores/workload';
import { Edit2, Check, X, Loader2 } from 'lucide-vue-next';

const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  userDepartmentId: {
    type: String,
    default: null
  },
  initialText: {
    type: String,
    default: '40'
  },
  week: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['saved']);

const authStore = useAuthStore();
const workloadStore = useWorkloadStore();

const isEditing = ref(false);
const inputValue = ref(props.initialText || '40');
const isSaving = ref(false);
const saveError = ref('');

watch(() => props.initialText, (newVal) => {
  if (!isEditing.value) {
    inputValue.value = newVal || '40';
  }
});

// Permission check per prd.md §3.6
// self / own dept head / head group
const canEdit = computed(() => {
  if (!authStore.user) return false;
  if (authStore.isHeadGroup) return true;
  if (authStore.user.id === props.userId) return true;
  if (authStore.isDepartmentHead && props.userDepartmentId === authStore.user.departmentId) return true;
  return false;
});

function startEdit() {
  if (!canEdit.value) return;
  isEditing.value = true;
  saveError.value = '';
}

function cancelEdit() {
  isEditing.value = false;
  inputValue.value = props.initialText || '40';
  saveError.value = '';
}

async function handleSave() {
  if (!canEdit.value || isSaving.value) return;
  const trimmed = inputValue.value.trim();
  if (!trimmed) {
    cancelEdit();
    return;
  }

  isSaving.value = true;
  saveError.value = '';
  try {
    const res = await workloadStore.setCapacity(props.userId, trimmed, props.week);
    isEditing.value = false;
    emit('saved', res.override);
  } catch (err) {
    saveError.value = err.message || 'Failed to save';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="capacity-input-wrap">
    <!-- Read-only view when not editing -->
    <div
      v-if="!isEditing"
      class="display-badge"
      :class="{ 'clickable': canEdit }"
      :title="canEdit ? 'Click to edit weekly hours' : 'Weekly capacity'"
      @click="startEdit"
    >
      <span class="value-text">{{ inputValue.endsWith('h') || inputValue.endsWith('m') ? inputValue : `${inputValue}h` }}</span>
      <Edit2 v-if="canEdit" :size="12" class="edit-icon" />
    </div>

    <!-- Inline input form when editing -->
    <div v-else class="edit-box">
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="inline-input"
        placeholder="e.g. 38, 38h, 2280m"
        :disabled="isSaving"
        @keydown.enter="handleSave"
        @keydown.esc="cancelEdit"
      />
      <div class="action-buttons">
        <button
          class="btn-icon save-btn"
          title="Save"
          :disabled="isSaving"
          @click="handleSave"
        >
          <Loader2 v-if="isSaving" :size="13" class="spinning" />
          <Check v-else :size="13" />
        </button>
        <button
          class="btn-icon cancel-btn"
          title="Cancel"
          :disabled="isSaving"
          @click="cancelEdit"
        >
          <X :size="13" />
        </button>
      </div>
    </div>

    <div v-if="saveError" class="error-tip">
      {{ saveError }}
    </div>
  </div>
</template>

<style scoped>
.capacity-input-wrap {
  display: inline-flex;
  flex-direction: column;
  position: relative;
}

.display-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.55rem;
  background: #f8fafc;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 0.825rem;
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.display-badge.clickable {
  cursor: pointer;
}

.display-badge.clickable:hover {
  background: var(--bsi-teal-light);
  border-color: rgba(0, 160, 160, 0.4);
  color: var(--bsi-teal-dark);
}

.edit-icon {
  opacity: 0.6;
}

.display-badge.clickable:hover .edit-icon {
  opacity: 1;
}

.edit-box {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #ffffff;
  border: 1px solid var(--bsi-teal);
  border-radius: var(--radius-md);
  padding: 0.15rem 0.25rem;
  box-shadow: 0 0 0 3px rgba(0, 160, 160, 0.15);
}

.inline-input {
  width: 65px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.825rem;
  font-weight: 600;
  padding: 0.15rem 0.3rem;
  outline: none;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: transparent;
  transition: all 0.15s ease;
}

.save-btn {
  color: #16a34a;
}
.save-btn:hover {
  background: #f0fdf4;
}

.cancel-btn {
  color: #dc2626;
}
.cancel-btn:hover {
  background: #fef2f2;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-tip {
  font-size: 0.7rem;
  color: #f87171;
  position: absolute;
  top: 100%;
  left: 0;
  white-space: nowrap;
  margin-top: 0.2rem;
  z-index: 10;
}
</style>
