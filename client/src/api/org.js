import client from './client.js';

export const orgApi = {
  getDepartments: () => client('/org/departments'),
  getUsers: (params = {}) => client(`/org/users?${new URLSearchParams(params)}`)
};
