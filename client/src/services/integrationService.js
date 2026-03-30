import api from './api';

export const getIntegrationsApi = () =>
  api.get('/integrations');

export const createIntegrationApi = (data) =>
  api.post('/integrations', data);

export const updateIntegrationApi = (id, data) =>
  api.patch(`/integrations/${id}`, data);

export const deleteIntegrationApi = (id) =>
  api.delete(`/integrations/${id}`);

export const testIntegrationApi = (id) =>
  api.post(`/integrations/${id}/test`);
