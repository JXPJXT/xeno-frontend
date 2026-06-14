import api from './client';

export const analyticsApi = {
  overview: () =>
    api.get('/analytics/overview'),

  campaign: (id: string) =>
    api.get(`/analytics/campaigns/${id}`),
};
