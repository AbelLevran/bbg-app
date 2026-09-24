<script setup>
import { ref, watch } from 'vue';
import { Search, RotateCcw, AlertTriangle } from 'lucide-vue-next';

const props = defineProps({
  filters: { type: Object, required: true },
  departments: { type: Array, default: () => [] },
  showDeptFilter: { type: Boolean, default: false }
});

const emit = defineEmits(['update:filters', 'refresh']);

const localSearch = ref(props.filters.search);
let searchTimer = null;

watch(localSearch, val => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => emit('update:filters', { ...props.filters, search: val }), 350);
});

function updateFilter(key, value) {
  emit('update:filters', { ...props.filters, [key]: value });
}

function reset() {
  localSearch.value = '';
  emit('update:filters', {
    ...props.filters,
    search: '',
    status: '',
    priority: '',
    overdueOnly: false,
    departmentId: '',
    assignedTo: ''
  });
}
</script>

<template>
  <div class="filters-bar">
    <!-- Search -->
    <div class="search-wrap">
      <Search :size="14" class="search-icon" />
      <input
        id="filter-search"
        v-model="localSearch"
        type="text"
        class="filter-input search-input"
        placeholder="Search tickets..."
      />
    </div>

    <!-- Status -->
    <select
      id="filter-status"
      class="filter-select"
      :value="filters.status"
      @change="updateFilter('status', $event.target.value)"
    >
      <option value="">All Status</option>
      <option value="TODO">To Do</option>
      <option value="IN_PROGRESS">In Progress</option>
      <option value="IN_REVIEW">In Review</option>
      <option value="STUCK">Stuck</option>
      <option value="DONE">Done</option>
      <option value="CANCELLED">Cancelled</option>
    </select>

    <!-- Priority -->
    <select
      id="filter-priority"
      class="filter-select"
      :value="filters.priority"
      @change="updateFilter('priority', $event.target.value)"
    >
      <option value="">All Priority</option>
      <option value="HIGH">High</option>
      <option value="MEDIUM">Medium</option>
      <option value="LOW">Low</option>
    </select>

    <!-- Department (HEAD_GROUP only) -->
    <select
      v-if="showDeptFilter"
      id="filter-department"
      class="filter-select"
      :value="filters.departmentId"
      @change="updateFilter('departmentId', $event.target.value)"
    >
      <option value="">All Departments</option>
      <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
    </select>

    <!-- Overdue toggle -->
    <label class="overdue-toggle" for="filter-overdue">
      <input
        id="filter-overdue"
        type="checkbox"
        :checked="filters.overdueOnly"
        @change="updateFilter('overdueOnly', $event.target.checked)"
      />
      <AlertTriangle :size="13" />
      Overdue only
    </label>

    <button class="btn-reset" title="Reset all filters" @click="reset">
      <RotateCcw :size="14" />
    </button>
  </div>
</template>

<style scoped>
.filters-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.85rem 1rem;
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 0.6rem;
  color: var(--text-muted);
  pointer-events: none;
}
.search-input { padding-left: 2rem !important; min-width: 200px; }

.filter-input, .filter-select {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.8rem;
  padding: 0.4rem 0.7rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.filter-input:focus, .filter-select:focus {
  border-color: var(--bsi-teal);
  box-shadow: 0 0 0 3px rgba(0, 160, 160, 0.12);
}
.filter-select { cursor: pointer; }
.filter-select option { background: #ffffff; color: var(--text-primary); }

.overdue-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: #ffffff;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.overdue-toggle:hover { border-color: rgba(239, 68, 68, 0.4); color: #dc2626; }
.overdue-toggle input { width: 13px; height: 13px; accent-color: #dc2626; cursor: pointer; }

.btn-reset {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  padding: 0.4rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.15s ease;
}
.btn-reset:hover { border-color: var(--bsi-teal); color: var(--bsi-teal-dark); background: var(--bsi-teal-light); }

@media (max-width: 640px) {
  .filters-bar {
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .search-wrap {
    width: 100%;
  }

  .search-input {
    width: 100%;
    min-width: 0;
  }

  .filter-select {
    flex: 1 1 calc(50% - 0.35rem);
    min-width: 120px;
  }

  .overdue-toggle {
    flex: 1;
    justify-content: center;
  }
}
</style>
