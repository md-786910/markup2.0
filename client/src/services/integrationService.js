import api from './api';
import { track } from '../monitoring/analytics';

export const getIntegrationsApi = () =>
  api.get('/integrations');

export const createIntegrationApi = (data) =>
  api.post('/integrations', data)
    .then((res) => { track('integration_connected', { type: data?.type, scope: data?.project ? 'project' : 'organization' }); return res; });

export const updateIntegrationApi = (id, data) =>
  api.patch(`/integrations/${id}`, data);

export const deleteIntegrationApi = (id) =>
  api.delete(`/integrations/${id}`);

export const testIntegrationApi = (id) =>
  api.post(`/integrations/${id}/test`);
