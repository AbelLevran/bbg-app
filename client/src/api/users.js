import { request } from './client.js';

export async function getUserDetailApi(userId, week) {
  return request(`/users/${userId}${week ? `?week=${week}` : ''}`);
}

export async function resetPasswordApi(userId) {
  return request(`/users/${userId}/reset-password`, {
    method: 'POST'
  });
}

export const usersApi = {
  getUserDetail: getUserDetailApi,
  resetPassword: resetPasswordApi
};

export default usersApi;
