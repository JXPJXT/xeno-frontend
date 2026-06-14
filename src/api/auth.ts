import api from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
}

export const authApi = {
  /** Public — no auth or tenant header needed */
  getTenants: () =>
    api.get<Tenant[]>('/auth/tenants'),

  login: (payload: LoginPayload) =>
    api.post<AuthTokens>('/auth/login', payload),

  me: () => api.get('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};
