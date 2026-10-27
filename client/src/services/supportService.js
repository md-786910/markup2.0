import api from './api';
import { track } from '../monitoring/analytics';

// In-app support requests (see server/routes/support.routes.js)

export const getSupportTicketsApi = () => api.get('/support/tickets');

export const createSupportTicketApi = (formData) =>
  api.post('/support/tickets', formData)
    .then((res) => { track('support_ticket_created', { category: formData.get('category') }); return res; });

export const getSupportTicketApi = (ticketId) => api.get(`/support/tickets/${ticketId}`);

export const replySupportTicketApi = (ticketId, formData) => api.post(`/support/tickets/${ticketId}/messages`, formData);

export const resolveSupportTicketApi = (ticketId) => api.post(`/support/tickets/${ticketId}/resolve`);
