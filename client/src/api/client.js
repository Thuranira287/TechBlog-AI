import axios from 'axios';

// Use environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

if (!import.meta.env.VITE_API_URL && import.meta.env.DEV) {
  console.warn("VITE_API_URL not set, using default:", API_BASE_URL);
}

// ========== CSRF Token Management ==========
let csrfToken = null;
let csrfTokenPromise = null;

// Function to fetch CSRF token
const fetchCsrfToken = async (force = false) => {
  if (csrfToken && !force) return csrfToken;
  
  if (csrfTokenPromise) return csrfTokenPromise;
  
  const hasAdminCookie = document.cookie.includes('admin_token=');
  if (!hasAdminCookie) {
    return null;
  }
  
  csrfTokenPromise = (async () => {
    try {
      const response = await api.get('/auth/csrf-token');
      csrfToken = response.data.csrfToken;
      return csrfToken;
    } catch (err) {
      // Ignore 401s - user not logged in
      if (err.response?.status !== 401) {
        console.warn('Could not fetch CSRF token:', err.message);
      }
      return null;
    } finally {
      csrfTokenPromise = null;
    }
  })();
  
  return csrfTokenPromise;
};

// ========== Axios Instances Configuration ==========

// Main API instance
export const api = axios.create({
  baseURL: `${API_BASE_URL}`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Admin API instance with longer timeout for uploads
export const adminApi = axios.create({
  baseURL: `${API_BASE_URL}`,
  timeout: 120000, 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// SSR/Meta API instance
export const ssrApi = axios.create({
  baseURL: `${API_BASE_URL}`,
  timeout: 5000, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========== Request Interceptors ==========

// Cache busting for development
api.interceptors.request.use((config) => {
  if (config.method === 'get' && import.meta.env.DEV) {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }
  return config;
});

adminApi.interceptors.request.use((config) => {
  if (config.method === 'get' && import.meta.env.DEV) {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }
  return config;
});

// ========== CSRF Token Interceptor ==========
// Add CSRF token to state-changing requests

// For main api
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
    try {
      const token = await fetchCsrfToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    } catch (err) {
    }
  }
  return config;
});

// For adminApi
adminApi.interceptors.request.use(async (config) => {
  // Only add CSRF token for state-changing methods
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
    try {
      const token = await fetchCsrfToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    } catch (err) {
    }
  }
  return config;
});

// ========== Response Interceptors ==========

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

const retryInterceptor = (error, instance) => {
  const config = error.config;
  
  if (!config || config.__retryCount >= MAX_RETRIES) {
    return Promise.reject(error);
  }
  
  // retry on timeout or network errors
  const shouldRetry = error.code === 'ECONNABORTED' || !error.response;
  
  if (!shouldRetry) {
    return Promise.reject(error);
  }

  config.__retryCount = config.__retryCount || 0;
  config.__retryCount += 1;
  
  if (import.meta.env.DEV) {
    console.log(`Retry attempt ${config.__retryCount} for ${config.url}`);
  }

  const backoffDelay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);
  
  return new Promise(resolve => {
    setTimeout(() => resolve(instance(config)), backoffDelay);
  });
};

// Apply retry interceptor
api.interceptors.response.use(null, (error) => retryInterceptor(error, api));
adminApi.interceptors.response.use(null, (error) => retryInterceptor(error, adminApi));

// Response error handler
const responseErrorHandler = (error) => {
  const { response, config } = error;
  
  // Network error
  if (!response) {
    console.log('🌐 Network error:', error.message);
    return Promise.reject({
      ...error,
      isNetworkError: true,
      message: 'Network error. Please check your connection.'
    });
  }
  
  // Handle 401 Unauthorized
  if (response.status === 401) {
    const url = config?.url || '';
    
    // For auth verify endpoint
    if (url.includes('/auth/verify') || url.includes('/auth/me')) {
      const authError = new Error('Not authenticated');
      authError.isAuthError = true;
      authError.status = 401;
      return Promise.reject(authError);
    }

    // For admin routes
    if (url.includes('/admin') && typeof window !== 'undefined') {
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
  }
  
  // Handle 403 Forbidden
  if (response.status === 403) {
    const url = config?.url || '';
    
    // Check if it's a CSRF error
    if (response.data?.error?.toLowerCase().includes('csrf')) {
      // CSRF token invalid
      if (typeof window !== 'undefined') {
        csrfToken = null;
        if (!config._csrfRetry) {
          config._csrfRetry = true;
          return fetchCsrfToken(true).then(() => {
            return instance(config);
          });
        }
      }
    }
    
    // Admin routes
    if (url.includes('/admin') && typeof window !== 'undefined') {
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
  }
  
  return Promise.reject(error);
};

api.interceptors.response.use(null, responseErrorHandler);
adminApi.interceptors.response.use(null, responseErrorHandler);

// ========== Auth Helper Functions ==========

//clear CSRF token on logout
export const clearCsrfToken = () => {
  csrfToken = null;
  csrfTokenPromise = null;
};

// Manually refresh CSRF token
export const refreshCsrfToken = async () => {
  return fetchCsrfToken(true);
};

// ========== API Methods ==========

export const blogAPI = {
  // Public endpoints
  getPosts: (page = 1, limit = 20, category = '') =>
    api.get('/posts', { params: { page, limit, category } }),

  searchPosts: (query, page = 1, limit = 20) =>
    api.get('/posts/search', { params: { q: query, page, limit } }),
    
  getPost: (slug) => api.get(`/posts/${slug}`),

  getCategoryPosts: (categorySlug, page = 1) => 
    api.get(`/posts/category/${categorySlug}`, { params: { page } }),

  getCategories: () => api.get('/categories'),

  // Comments
  getComments: (postId) => api.get(`/comments/post/${postId}`),
  createComment: (commentData) => api.post('/comments', commentData),

  // Reactions
  reactToComment: (commentId, type) => 
    api.post(`/comments/${commentId}/reactions`, { 
      type,
      user_email: localStorage.getItem('comment_email') || 'anonymous' 
    }),

  checkUserReaction: (commentId, userEmail) =>
    api.get(`/comments/${commentId}/reactions/${userEmail}`),

  // Auth
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    // After successful login, fetch CSRF token
    await refreshCsrfToken();
    return response;
  },
  
  getMe: () => api.get('/auth/verify'),
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    clearCsrfToken();
    return response;
  },
  // ====== JOBS ENDPOINTS ======
  // Public job endpoints
  getJobs: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    
    return api.get(`/jobs/public${params.toString() ? `?${params.toString()}` : ''}`);
  },

  getJob: (id) => api.get(`/jobs/public/${id}`),

  trackJobView: (id) => api.post(`/jobs/${id}/view`),
  trackJobClick: (id) => api.post(`/jobs/${id}/click`),

  // Admin job endpoints (protected)
  getAdminJobs: () => adminApi.get('/jobs'),
  getAdminJob: (id) => adminApi.get(`/jobs/${id}`),
  
  createAdminJob: (jobData) => {
    const formData = jobData instanceof FormData ? jobData : new FormData();
    
    if (!(jobData instanceof FormData)) {
      Object.entries(jobData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'company_logo' && value instanceof File) {
            formData.append('company_logo', value);
          } else {
            formData.append(key, value);
          }
        }
      });
    }
    
    return adminApi.post('/jobs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  updateAdminJob: (id, jobData) => {
    const formData = jobData instanceof FormData ? jobData : new FormData();
    
    if (!(jobData instanceof FormData)) {
      Object.entries(jobData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'company_logo' && value instanceof File) {
            formData.append('company_logo', value);
          } else {
            formData.append(key, value);
          }
        }
      });
    }
    
    return adminApi.put(`/jobs/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    });
  },

  deleteAdminJob: (id) => adminApi.delete(`/jobs/${id}`),
  
  updateJobStatus: (id, is_active) => adminApi.patch(`/jobs/${id}/status`, { is_active }),

  // Admin endpoints
  getAdminDashboard: (params = {}) => adminApi.get('/admin/dashboard', { params }),
  
  getAdminPosts: (page = 1, limit = 50) => 
    adminApi.get('/admin/posts', { params: { page, limit } }),
  
  getAdminPost: (id) => adminApi.get(`/admin/posts/${id}`),
  
  createAdminPost: (postData) => {
    const formData = postData instanceof FormData ? postData : new FormData();
    
    if (!(postData instanceof FormData)) {
      Object.entries(postData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'image' && value instanceof File) {
            formData.append(key, value);
          } else if (Array.isArray(value)) {
            value.forEach(item => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, value);
          }
        }
      });
    }
    
    return adminApi.post('/admin/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  updateAdminPost: (id, postData) => {
    const formData = postData instanceof FormData ? postData : new FormData();
    
    if (!(postData instanceof FormData)) {
      Object.entries(postData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'image' && value instanceof File) {
            formData.append(key, value);
          } else if (Array.isArray(value)) {
            value.forEach(item => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, value);
          }
        }
      });
    }
    
    return adminApi.put(`/admin/posts/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    });
  },
  
  deleteAdminPost: (id) => adminApi.delete(`/admin/posts/${id}`),

  getAdminCategories: () => adminApi.get('/admin/categories'),
  createAdminCategory: (categoryData) => adminApi.post('/admin/categories', categoryData),
  
  getAdminComments: (page = 1, limit = 20) => 
    adminApi.get('/admin/comments', { params: { page, limit } }),
  
  updateAdminComment: (id, data) => adminApi.put(`/admin/comments/${id}`, data),
  deleteAdminComment: (id) => adminApi.delete(`/admin/comments/${id}`),

  // Health check
  checkHealth: () => api.get('/health'),
};

export default api;