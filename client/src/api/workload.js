import client from './client.js';

export const workloadApi = {
  getUserWorkload: (userId, week) =>
    client(`/workload/user/${userId}${week ? `?week=${week}` : ''}`),
  getUserTrend: (userId, week, weeks = 4) =>
    client(`/workload/user/${userId}/trend?weeks=${weeks}${week ? `&week=${week}` : ''}`),
  getUserDaily: (userId, week) =>
    client(`/workload/user/${userId}/daily${week ? `?week=${week}` : ''}`),
  getDeptWorkload: (deptId, week) =>
    client(`/workload/department/${deptId}${week ? `?week=${week}` : ''}`),
  getGroupWorkload: (week) =>
    client(`/workload/group${week ? `?week=${week}` : ''}`),
  getAlerts: (week) =>
    client(`/workload/alerts${week ? `?week=${week}` : ''}`),
  setCapacity: (userId, week, text) =>
    client(`/users/${userId}/capacity${week ? `?week=${week}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify({ text })
    })
};
