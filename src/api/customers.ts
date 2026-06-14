import api from './client';

export const customersApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/customers', { params }),

  getById: (id: string) =>
    api.get(`/customers/${id}`),

  getTimeline: (id: string) =>
    api.get(`/customers/${id}/timeline`),
};
