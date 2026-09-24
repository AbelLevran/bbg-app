import client from './client.js';

export const ticketsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return client(`/tickets?${query.toString()}`);
  },
  get: (id) => client(`/tickets/${id}`),
  create: (data) => client('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => client(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => client(`/tickets/${id}`, { method: 'DELETE' }),
  changeStatus: (id, status, stuckReason) =>
    client(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, stuckReason })
    }),
  createRecurringSeries: (data) =>
    client('/tickets/recurring-series', { method: 'POST', body: JSON.stringify(data) }),
  addNextOccurrence: (ticketId) =>
    client(`/tickets/${ticketId}/recurrence/next-occurrence`, { method: 'POST' }),
  getSiblings: (ticketId) => client(`/tickets/${ticketId}/recurrence/siblings`)
};
