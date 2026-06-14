import api from './client';

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  channel: string;
  segmentId: string;
  messageSubject?: string;
  messageBody: string;
}

export const campaignsApi = {
  list: () =>
    api.get('/campaigns'),

  create: (payload: CreateCampaignPayload) =>
    api.post('/campaigns', payload),

  preview: (id: string) =>
    api.get(`/campaigns/${id}/preview`),

  launch: (id: string) =>
    api.post(`/campaigns/${id}/launch`),

  results: (id: string) =>
    api.get(`/campaigns/${id}/results`),
};
