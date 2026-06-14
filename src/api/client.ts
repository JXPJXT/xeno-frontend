import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — inject auth token and tenant ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('xeno_token');
  const tenantId = localStorage.getItem('xeno_tenant_id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

// Response interceptor — unwrap envelope { data, meta, statusCode }
api.interceptors.response.use(
  (response) => {
    // The NestJS backend wraps responses in { data, meta, statusCode }
    // Unwrap to make it easier for frontend consumers
    if (response.data && response.data.data !== undefined) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    // If 401, clear tokens and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('xeno_token');
      localStorage.removeItem('xeno_tenant_id');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
