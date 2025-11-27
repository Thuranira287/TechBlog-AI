import axios from 'axios';

// Use environment variable with local fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Your API methods here...
export const blogAPI = {
  getPosts: (page = 1, limit = 10, category = null, search = null) => {
    const params = { page, limit };
    if (category) params.category = category;
    if (search) params.search = search;
    return api.get('/posts', { params });
  },
  // ... other methods
};