import client from './client.js';

export const timerApi = {
  getActive: () => client('/timer/active'),
  stopActive: () => client('/timer/stop-active', { method: 'POST' }),
  start: (ticketId) => client(`/tickets/${ticketId}/timer/start`, { method: 'POST' }),
  pause: (ticketId) => client(`/tickets/${ticketId}/timer/pause`, { method: 'POST' }),
  resume: (ticketId) => client(`/tickets/${ticketId}/timer/resume`, { method: 'POST' }),
  stop: (ticketId) => client(`/tickets/${ticketId}/timer/stop`, { method: 'POST' }),
  addManualTime: (ticketId, minutes, reason) =>
    client(`/tickets/${ticketId}/manual-time`, {
      method: 'POST',
      body: JSON.stringify({ minutes, reason })
    })
};
