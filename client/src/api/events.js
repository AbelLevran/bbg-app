import client from './client.js';

export const eventsApi = {
  getEvents: () => client('/events'),
  getEventTickets: (name) => client(`/events/${encodeURIComponent(name)}/tickets`)
};
