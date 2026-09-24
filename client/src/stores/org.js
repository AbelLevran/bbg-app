import { defineStore } from 'pinia';
import { ref } from 'vue';
import { orgApi } from '@/api/org';

export const useOrgStore = defineStore('org', () => {
  const departments = ref([]);
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function fetchDepartments() {
    loading.value = true;
    try {
      const res = await orgApi.getDepartments();
      departments.value = res.departments || [];
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUsers(deptId) {
    loading.value = true;
    try {
      const res = await orgApi.getUsers(deptId ? { departmentId: deptId } : {});
      users.value = res.users || [];
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  return {
    departments,
    users,
    loading,
    error,
    fetchDepartments,
    fetchUsers
  };
});
