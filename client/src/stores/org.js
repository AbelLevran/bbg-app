import { defineStore } from 'pinia';
import { ref } from 'vue';
import { orgApi } from '@/api/org';

export const useOrgStore = defineStore('org', () => {
  const departments = ref([]);
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);

  let deptFetched = false;
  let usersFetched = false;
  const usersByDept = new Map();

  function invalidateCache() {
    deptFetched = false;
    usersFetched = false;
    usersByDept.clear();
  }

  async function fetchDepartments(force = false) {
    if (!force && deptFetched && departments.value.length > 0) {
      return departments.value;
    }
    loading.value = true;
    try {
      const res = await orgApi.getDepartments();
      departments.value = res.departments || [];
      deptFetched = true;
      return departments.value;
    } catch (err) {
      error.value = err.message;
      return departments.value;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUsers(deptId = '', force = false) {
    const key = deptId || 'ALL';
    if (!force) {
      if (!deptId && usersFetched && users.value.length > 0) {
        return users.value;
      }
      if (deptId && usersByDept.has(key)) {
        return usersByDept.get(key);
      }
    }

    loading.value = true;
    try {
      const res = await orgApi.getUsers(deptId ? { departmentId: deptId } : {});
      const list = res.users || [];
      if (!deptId) {
        users.value = list;
        usersFetched = true;
      } else {
        usersByDept.set(key, list);
      }
      return list;
    } catch (err) {
      error.value = err.message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  return {
    departments,
    users,
    loading,
    error,
    invalidateCache,
    fetchDepartments,
    fetchUsers
  };
});
