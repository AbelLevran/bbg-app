import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loginApi, logoutApi, refreshApi, getMeApi } from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const accessToken = ref(null);
  const isLoading = ref(false);
  const isInitialized = ref(false);

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);
  const role = computed(() => user.value?.role || null);
  const isHeadGroup = computed(() => user.value?.role === 'HEAD_GROUP');
  const isDepartmentHead = computed(() => user.value?.role === 'DEPARTMENT_HEAD');
  const isMember = computed(() => user.value?.role === 'MEMBER');
  const departmentName = computed(() => user.value?.departmentName || (isHeadGroup.value ? 'BBG Group' : '—'));

  function setAuth(token, userData) {
    accessToken.value = token;
    user.value = userData;
  }

  function updateUser(userData) {
    user.value = { ...user.value, ...userData };
  }

  function clearAuth() {
    accessToken.value = null;
    user.value = null;
  }

  async function login(username, password) {
    isLoading.value = true;
    try {
      const data = await loginApi(username, password);
      setAuth(data.accessToken, data.user);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    isLoading.value = true;
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      clearAuth();
      isLoading.value = false;
    }
  }

  async function initAuth() {
    if (isInitialized.value) return;
    isLoading.value = true;
    try {
      // Attempt silent refresh via httpOnly cookie
      const data = await refreshApi();
      setAuth(data.accessToken, data.user);
    } catch (err) {
      clearAuth();
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
  }

  return {
    user,
    accessToken,
    isLoading,
    isInitialized,
    isAuthenticated,
    role,
    isHeadGroup,
    isDepartmentHead,
    isMember,
    departmentName,
    setAuth,
    updateUser,
    clearAuth,
    login,
    logout,
    initAuth
  };
});
