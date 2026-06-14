import api from './client';

export const decisionsApi = {
  create: (goal: string) =>
    api.post('/decisions', { goal }),
};
