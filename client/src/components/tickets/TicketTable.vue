<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import StatusBadge from '@/components/common/StatusBadge.vue';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import { Edit3, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from 'lucide-vue-next';

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  sortBy:  { type: String, default: 'created_at' },
  sortDir: { type: String, default: 'desc' }
});

const emit = defineEmits(['sort', 'delete', 'edit', 'open']);
const router = useRouter();
const authStore = useAuthStore();

function fmtMins(m) {
  if (!m && m !== 0) return '—';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOwner(ticket) {
  return ticket.createdBy?.id === authStore.user?.id;
}

function handleSort(field) {
  if (props.sortBy === field) {
    emit('sort', field, props.sortDir === 'asc' ? 'desc' : 'asc');
  } else {
    emit('sort', field, 'asc');
  }
}

function SortIcon(field) {
  if (props.sortBy !== field) return ChevronsUpDown;
  return props.sortDir === 'asc' ? ChevronUp : ChevronDown;
}
</script>

<template>
  <div class="table-wrapper">
    <table class="ticket-table">
      <thead>
        <tr>
          <th class="col-num">Ticket #</th>
          <th class="col-title">Title</th>
          <th class="col-person">Requested By</th>
          <th class="col-person">Assigned To</th>
          <th class="col-dept">Dept</th>
          <th class="col-priority sortable" @click="handleSort('priority')">
            Priority
            <component :is="SortIcon('priority')" :size="12" class="sort-icon" />
          </th>
          <th class="col-status">Status</th>
          <th class="col-mins sortable" @click="handleSort('estimated_minutes')">
            Est.
            <component :is="SortIcon('estimated_minutes')" :size="12" class="sort-icon" />
          </th>
          <th class="col-mins">Actual</th>
          <th class="col-date sortable" @click="handleSort('due_date')">
            Due Date
            <component :is="SortIcon('due_date')" :size="12" class="sort-icon" />
          </th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="ticket in tickets"
          :key="ticket.id"
          class="ticket-row"
          :class="{ 'row-overdue': ticket.isOverdue, 'row-done': ticket.status === 'DONE' || ticket.status === 'CANCELLED' }"
          @click="$emit('open', ticket.id)"
        >
          <td class="col-num">
            <span class="ticket-num">{{ ticket.ticketNumber }}</span>
          </td>
          <td class="col-title">
            <div class="title-cell">
              <span class="ticket-title">{{ ticket.title }}</span>
              <span v-if="ticket.recurrenceGroupId" class="recurring-badge" title="Recurring ticket">↺</span>
            </div>
          </td>
          <td class="col-person">
            <span class="person-name">{{ ticket.requestedBy?.name || '—' }}</span>
          </td>
          <td class="col-person">
            <span class="person-name">{{ ticket.assignedTo?.name || '—' }}</span>
          </td>
          <td class="col-dept">
            <span class="dept-tag">{{ ticket.departmentName || '—' }}</span>
          </td>
          <td class="col-priority" @click.stop>
            <PriorityBadge :priority="ticket.priority" />
          </td>
          <td class="col-status" @click.stop>
            <div class="status-cell">
              <StatusBadge :status="ticket.status" />
              <span v-if="ticket.isOverdue" class="overdue-chip">Overdue</span>
            </div>
          </td>
          <td class="col-mins">{{ fmtMins(ticket.estimatedMinutes) }}</td>
          <td class="col-mins" :class="{ 'actual-over': ticket.actualMinutes > ticket.estimatedMinutes }">
            {{ fmtMins(ticket.actualMinutes) }}
          </td>
          <td class="col-date" :class="{ 'date-overdue': ticket.isOverdue }">
            {{ fmtDate(ticket.dueDate) }}
          </td>
          <td class="col-actions" @click.stop>
            <div class="action-btns">
              <button class="btn-icon" title="Open ticket" @click="$emit('open', ticket.id)">
                <ExternalLink :size="14" />
              </button>
              <template v-if="isOwner(ticket)">
                <button class="btn-icon btn-edit" title="Edit ticket" @click="$emit('edit', ticket)">
                  <Edit3 :size="14" />
                </button>
                <button class="btn-icon btn-delete" title="Delete ticket" @click="$emit('delete', ticket)">
                  <Trash2 :size="14" />
                </button>
              </template>
            </div>
          </td>
        </tr>
        <tr v-if="tickets.length === 0">
          <td colspan="11" class="empty-row">
            <div class="empty-state">
              <span>No tickets found</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  width: 100%;
}

.ticket-table {
  width: 100%;
  min-width: 780px;
  border-collapse: collapse;
  font-size: 0.825rem;
}

thead {
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 1;
}

th {
  padding: 0.75rem 0.9rem;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle);
  white-space: nowrap;
}

th.sortable {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
th.sortable:hover { color: var(--text-primary); }

.sort-icon { opacity: 0.6; }

.ticket-row {
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 0.15s ease;
}
.ticket-row:hover { background: var(--bg-surface-hover); }
.ticket-row:last-child { border-bottom: none; }
.row-overdue { background: rgba(239, 68, 68, 0.04); }
.row-done { opacity: 0.65; }

td {
  padding: 0.7rem 0.9rem;
  color: var(--text-secondary);
  vertical-align: middle;
}

.ticket-num {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--bsi-teal-dark);
  font-weight: 700;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 220px;
}
.ticket-title {
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recurring-badge {
  font-size: 0.75rem;
  color: var(--bsi-teal-dark);
  background: var(--bsi-teal-light);
  border: 1px solid rgba(0, 160, 160, 0.3);
  border-radius: 4px;
  padding: 0.1rem 0.3rem;
  flex-shrink: 0;
}

.person-name {
  white-space: nowrap;
  color: var(--text-secondary);
}

.dept-tag {
  font-size: 0.72rem;
  background: #f1f5f9;
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.15rem 0.45rem;
  white-space: nowrap;
}

.status-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.overdue-chip {
  font-size: 0.65rem;
  font-weight: 700;
  color: #f87171;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: var(--radius-full);
  padding: 0.1rem 0.35rem;
  letter-spacing: 0.03em;
}

.actual-over { color: #f87171; }
.date-overdue { color: #f87171; font-weight: 600; }

.action-btns {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.btn-icon {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  padding: 0.3rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.15s ease;
}
.btn-icon:hover { background: rgba(99,102,241,0.1); color: var(--text-primary); border-color: var(--border-medium); }
.btn-edit:hover  { background: rgba(59,130,246,0.12); color: #60a5fa; border-color: rgba(59,130,246,0.3); }
.btn-delete:hover { background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.3); }

.empty-row { text-align: center; padding: 3rem !important; }
.empty-state { color: var(--text-muted); font-size: 0.875rem; }
</style>
