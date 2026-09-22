import { useAuthStore } from '@/stores/auth';

const BASE_URL = '/api/v1';

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.map(cb => cb(token));
  refreshSubscribers = [];
}

export async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const authStore = useAuthStore();

  if (authStore.accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authStore.accessToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include' // Always include cookies for refresh cookie
  };

  try {
    let response = await fetch(url, config);

    // Handle 401 Unauthorized with token refresh (except when already calling /auth/login or /auth/refresh)
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!refreshRes.ok) {
            throw new Error('Refresh failed');
          }

          const refreshData = await refreshRes.json();
          authStore.setAuth(refreshData.accessToken, refreshData.user);
          isRefreshing = false;
          onRefreshed(refreshData.accessToken);

          // Retry initial request with new token
          headers.Authorization = `Bearer ${refreshData.accessToken}`;
          return request(endpoint, { ...options, headers });
        } catch (refreshErr) {
          isRefreshing = false;
          refreshSubscribers = [];
          authStore.clearAuth();
          throw refreshErr;
        }
      } else {
        // Wait for active refresh to resolve
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            try {
              headers.Authorization = `Bearer ${newToken}`;
              const res = await request(endpoint, { ...options, headers });
              resolve(res);
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || `HTTP Error ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}
