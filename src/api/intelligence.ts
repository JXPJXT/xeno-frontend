import api from './client';

export const intelligenceApi = {
  customer360: (id: string) =>
    api.get(`/intelligence/customers/${id}`),

  explain: (id: string) =>
    api.get(`/intelligence/customers/${id}/explain`),
};
