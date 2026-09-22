import { request } from './client.js';

export async function loginApi(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function refreshApi() {
  return request('/auth/refresh', {
    method: 'POST'
  });
}

export async function logoutApi() {
  return request('/auth/logout', {
    method: 'POST'
  });
}

export async function getMeApi() {
  return request('/auth/me');
}

export async function resetPasswordApi(userId) {
  return request(`/users/${userId}/reset-password`, {
    method: 'POST'
  });
}
