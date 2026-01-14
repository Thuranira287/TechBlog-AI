import axios from 'axios'

// Use environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL
if (!API_BASE_URL) console.warn("VITE_API_URL not set, using localhost fallback");

// Create separate instances for different needs
export const api = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000, // Increased to 30s for general requests
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
// Special instance for admin operations (uploads take longer)
export const adminApi = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:5000/api',
  timeout: 60000, // 60 seconds for admin uploads
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Instance for SSR/meta requests (fast timeout)
export const ssrApi = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:5000/api',
  timeout: 5000, // 5 seconds for SSR
  headers: { 'Content-Type': 'application/json' },
});

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Retry interceptor
const retryInterceptor = (error, instance) => {
  const config = error.config;
  
  // Don't retry if already tried or if not a timeout/network error
  if (!config || config.__retryCount >= MAX_RETRIES) {
    return Promise.reject(error);
  }
  
  // Only retry on timeout or network errors
  const shouldRetry = error.code === 'ECONNABORTED' || 
                     !error.response || 
                     error.response.status >= 500;
  
  if (!shouldRetry) {
    return Promise.reject(error);
  }
  
  config.__retryCount = config.__retryCount || 0;
  config.__retryCount += 1;
  
  console.log(`🔄 Retry attempt ${config.__retryCount} for ${config.url}`);
  
  // Create new promise with exponential backoff
  const backoffDelay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);
  
  return new Promise(resolve => {
    setTimeout(() => resolve(instance(config)), backoffDelay);
  });
};

// Add retry interceptor to main api
api.interceptors.response.use(null, (error) => retryInterceptor(error, api));
adminApi.interceptors.response.use(null, (error) => retryInterceptor(error, adminApi));

// Request interceptor for auth tokens
const addAuthToken = (config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

api.interceptors.request.use(addAuthToken);
adminApi.interceptors.request.use(addAuthToken);

// Response interceptor with better error handling
const responseInterceptor = (error) => {
  const { response, code, message } = error;
  
  // Timeout handling
  if (code === 'ECONNABORTED' || message?.includes('timeout')) {
    window.alert('⏱️ Request timed out. Will retry if configured.');
    return Promise.reject({
      ...error,
      isTimeout: true,
      message: 'Request took too long. Please check your connection.'
    });
  }
  
  // Network error
  if (!response) {
    console.log('🌐 Network error:', error.message);
    return Promise.reject({
      ...error,
      isNetworkError: true,
      message: 'Network error. Please check your connection.'
    });
  }
  
  // Handle specific status codes
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/admin/login';
  }
  
  if (response.status === 429) {
    window.alert('⚠️ Too many requests');
  }
  
  return Promise.reject(error);
};

api.interceptors.response.use(null, responseInterceptor);
adminApi.interceptors.response.use(null, responseInterceptor);

// API methods with optimized timeouts
export const blogAPI = {
  // Posts - 30s timeout with retry
  getPosts: (page = 1, limit = 10, category = null, search = null) => {
    const params = { page, limit }
    if (category) params.category = category
    if (search) params.search = search
    return api.get('/posts', { params, timeout: 20000 })
  },

  getPost: (slug) => api.get(`/posts/${slug}`, { timeout: 20000 }),

  getCategoryPosts: (categorySlug, page = 1) => 
    api.get(`/posts/category/${categorySlug}?page=${page}`, { timeout: 20000 }),

  // Categories - faster
  getCategories: () => api.get('/categories', { timeout: 10000 }),

  // Comments - with retry
  getComments: (postId) => api.get(`/comments/post/${postId}`, { timeout: 15000 }),

  createComment: (commentData) => api.post('/comments', commentData, { timeout: 20000 }),

  // Reactions - fast
  reactToComment: (commentId, type) => 
    api.post(`/comments/${commentId}/reactions`, { 
      type,
      user_email: localStorage.getItem('comment_email') || 'anonymous' 
    }, { timeout: 10000 }),

  checkUserReaction: (commentId, userEmail) =>
    api.get(`/comments/${commentId}/reactions/${userEmail}`, { timeout: 10000 }),

  deleteComment: (commentId) => api.delete(`/admin/comments/${commentId}`, { timeout: 10000 }),

  // Auth
  login: (credentials) => api.post('/auth/login', credentials, { timeout: 15000 }),
  getMe: () => api.get('/auth/me', { timeout: 10000 }),

  // Admin methods - use adminApi with longer timeouts
  getAdminDashboard: (params = {}) => adminApi.get('/admin/dashboard', { params, timeout: 10000 }),
  
  getAdminPosts: (page = 1) => adminApi.get(`/admin/posts?page=${page}`, { timeout: 10000 }),
  
  getAdminPost: (id) => adminApi.get(`/admin/posts/${id}`, { timeout: 10000 }),
  
  createAdminPost: (postData) => {
    // Check if postData is FormData or regular object
    if (postData instanceof FormData) {
      return adminApi.post('/admin/posts', postData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
    } else {
      // Convert object to FormData
      const formData = new FormData();
      Object.keys(postData).forEach(key => {
        if (postData[key] !== null && postData[key] !== undefined) {
          formData.append(key, postData[key]);
        }
      });
      
      return adminApi.post('/admin/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
    }
  },

  updateAdminPost: (id, postData) => {
    if (postData instanceof FormData) {
      return adminApi.put(`/admin/posts/${id}`, postData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
    } else {
      const formData = new FormData();
      Object.keys(postData).forEach(key => {
        if (postData[key] !== null && postData[key] !== undefined) {
          formData.append(key, postData[key]);
        }
      });
      
      return adminApi.put(`/admin/posts/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
    }
  },
  
  deleteAdminPost: (id) => adminApi.delete(`/admin/posts/${id}`),
  deletePost: (id) => adminApi.delete(`/admin/posts/${id}`),

  getAdminCategories: () => adminApi.get(`/admin/categories`),

  getAdminComments: () => adminApi.get(`/admin/comments`),
  
  updateAdminComment: (id, data) => adminApi.put(`/admin/comments/${id}`, data, ),
  
  deleteAdminComment: (id) => adminApi.delete(`/admin/comments/${id}`),
  
  createAdminCategory: (categoryData) => adminApi.post('/admin/categories', categoryData),
}

export default api;