import axios from 'axios';

// Use environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

if (!import.meta.env.VITE_API_URL && import.meta.env.DEV) {
  console.warn("VITE_API_URL not set, using default:", API_BASE_URL);
}

// ========== Axios Instances Configuration ==========

// Main API instance
export const api = axios.create({
  baseURL: `${API_BASE_URL}`,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
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

// SSR/Meta API instance for fast responses
export const ssrApi = axios.create({
  baseURL: `${API_BASE_URL}`,
  timeout: 5000, 
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
});

// ========== Request Interceptors ==========

// request ID for tracking
api.interceptors.request.use((config) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  config.headers['X-Request-ID'] = requestId;
  
  // Cache busting for GET requests in development
  if (config.method === 'get' && import.meta.env.DEV) {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }
  
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// interceptors to adminApi
adminApi.interceptors.request.use((config) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  config.headers['X-Request-ID'] = requestId;
  
  return config;
});

// ========== Response Interceptors ==========

// Retry 
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const setupRetryInterceptor = (instance) => {
  instance.interceptors.response.use(null, async (error) => {
    const config = error.config;
    
    if (!config || config.__retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }
    
    const shouldRetry = 
      error.code === 'ECONNABORTED' || 
      !error.response || 
      RETRY_STATUS_CODES.includes(error.response?.status);
    
    if (!shouldRetry) {
      return Promise.reject(error);
    }
    
    // Set retry count
    config.__retryCount = config.__retryCount || 0;
    config.__retryCount += 1;
    
    if (import.meta.env.DEV) {
      console.log(`Retry attempt ${config.__retryCount} for ${config.url}`);
    }
    
    // Exponential backoff with jitter
    const backoffDelay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);
    const jitter = Math.random() * 500; 
    const delay = backoffDelay + jitter;
    
    return new Promise(resolve => {
      setTimeout(() => resolve(instance(config)), delay);
    });
  });
};

// Apply retry interceptor
setupRetryInterceptor(api);
setupRetryInterceptor(adminApi);

// Response interceptor 
const responseErrorHandler = (error) => {
  const { response, code, message, config } = error;
  
  // Enhanced error object
  const enhancedError = {
    ...error,
    timestamp: new Date().toISOString(),
    requestId: config?.headers?.['X-Request-ID'] || 'unknown',
    url: config?.url || 'unknown',
  };
  
  // Timeout handling
  if (code === 'ECONNABORTED' || message?.includes('timeout')) {
    return Promise.reject({
      ...enhancedError,
      isTimeout: true,
      message: 'Request timed out. Please try again.',
      userMessage: 'The request took too long. Please check your connection and try again.',
    });
  }
  
  // Network error
  if (!response) {
    console.error('Network error:', error.message);
    return Promise.reject({
      ...enhancedError,
      isNetworkError: true,
      message: 'Network error. Please check your connection.',
      userMessage: 'Unable to connect to the server. Please check your internet connection.',
    });
  }
  
  // Handle specific status codes
  switch (response.status) {
    case 400:
      enhancedError.message = 'Bad Request';
      enhancedError.userMessage = 'The request was invalid. Please check your input.';
      break;
    
    case 401: {
  const url = config?.url || '';
  
  //public endpoint
  const isPublicEndpoint = 
    url.includes('/posts/') || 
    url.includes('/categories') || 
    url.includes('/comments/get') ||
    url.includes('/jobs') ||
    url.includes('/ai') ||
    url.includes('/feed') ||
    url.includes('/health') ||
    url.includes('/stats') ||
    url.includes('/logos');
  
  if (isPublicEndpoint) {
    // PUBLIC ENDPOINT RETURNING 401
    console.error('SERVER CONFIG ERROR: Public endpoint returned 401:', url);
    enhancedError.message = 'Server configuration error';
    enhancedError.userMessage = 'Website is temporarily unavailable. Please try again later.';
    return Promise.reject(enhancedError);
  }
  
  // Auth endpoints
  if (url.includes('/auth/verify') || url.includes('/auth/me')) {
    // Normal for guests - just reject
    return Promise.reject(enhancedError);
  }
  
  // Admin routes
  if (url.includes('/admin')) {
    if (typeof window !== 'undefined' && window.showAdminLogin) {
      window.showAdminLogin();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
  }
  
  return Promise.reject(enhancedError);
}
    
    case 403:
      enhancedError.message = 'Forbidden';
      enhancedError.userMessage = 'You do not have permission to access this resource.';
      break;
    
    case 404:
      enhancedError.message = 'Not Found';
      enhancedError.userMessage = 'The requested resource was not found.';
      break;
    
    case 429:
      enhancedError.message = 'Too Many Requests';
      enhancedError.userMessage = 'Too many requests. Please wait a moment and try again.';
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          alert('⚠️ Too many requests. Please wait a moment before trying again.');
        }, 100);
      }
      break;
    
    case 500:
      enhancedError.message = 'Internal Server Error';
      enhancedError.userMessage = 'Something went wrong on our end. Please try again later.';
      break;
    
    default:
      enhancedError.message = `Error ${response.status}`;
      enhancedError.userMessage = 'An error occurred. Please try again.';
  }
  
  // Log error in development
  if (import.meta.env.DEV) {
    console.error('API Error:', {
      status: response.status,
      message: enhancedError.message,
      url: config?.url,
      requestId: enhancedError.requestId,
    });
  }
  
  return Promise.reject(enhancedError);
};

// Apply response error handlers
api.interceptors.response.use(null, responseErrorHandler);
adminApi.interceptors.response.use(null, responseErrorHandler);

// ========== API Methods ==========

export const blogAPI = {
  // Posts
  getPosts: (page = 1, limit = 20, category = '') =>
    api.get('/posts', {
      params: { page, limit, category },
      headers: { 'Cache-Control': 'public, max-age=300' } // Cache for 5 minutes
    }),

  searchPosts: (query, page = 1, limit = 20) =>
    api.get('/posts/search', {
      params: { q: query, page, limit }
    }),
    
  getPost: (slug) => 
    api.get(`/posts/${slug}`, {
      headers: { 'Cache-Control': 'public, max-age=600' } // Cache for 10 minutes
    }),

  getCategoryPosts: (categorySlug, page = 1) => 
    api.get(`/posts/category/${categorySlug}`, {
      params: { page },
      headers: { 'Cache-Control': 'public, max-age=300' }
    }),

  // Categories
  getCategories: () => 
    api.get('/categories', {
      headers: { 'Cache-Control': 'public, max-age=3600' } // Cache for 1 hour
    }),

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

  deleteComment: (commentId) => adminApi.delete(`/admin/comments/${commentId}`),

  // Auth
  login: (credentials) => api.post('/auth/login', credentials),
  
  getMe: () => api.get('/auth/verify', {
    headers: { 'Cache-Control': 'no-cache' }
  }),

  logout: () => api.post('/auth/logout'),

  // Admin methods
  getAdminDashboard: (params = {}) => 
    adminApi.get('/admin/dashboard', { params }),
  
  getAdminPosts: (page = 1, limit = 20) => 
    adminApi.get(`/admin/posts`, { params: { page, limit } }),
  
  getAdminPost: (id) => adminApi.get(`/admin/posts/${id}`),
  
  createAdminPost: (postData) => {
    const formData = new FormData();
    
    // Convert object to FormData
    if (!(postData instanceof FormData)) {
      Object.keys(postData).forEach(key => {
        if (postData[key] !== null && postData[key] !== undefined) {
          if (key === 'image' && postData[key] instanceof File) {
            formData.append(key, postData[key]);
          } else if (Array.isArray(postData[key])) {
            postData[key].forEach(item => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, postData[key]);
          }
        }
      });
    } else {
      formData = postData;
    }
    
    return adminApi.post('/admin/posts', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'X-Request-Type': 'post-upload'
      },
      timeout: 120000,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload Progress: ${percentCompleted}%`);
      }
    });
  },

  updateAdminPost: (id, postData) => {
    const formData = new FormData();
    
    if (!(postData instanceof FormData)) {
      Object.keys(postData).forEach(key => {
        if (postData[key] !== null && postData[key] !== undefined) {
          if (key === 'image' && postData[key] instanceof File) {
            formData.append(key, postData[key]);
          } else if (Array.isArray(postData[key])) {
            postData[key].forEach(item => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, postData[key]);
          }
        }
      });
    } else {
      formData = postData;
    }
    
    return adminApi.put(`/admin/posts/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    });
  },
  
  deleteAdminPost: (id) => adminApi.delete(`/admin/posts/${id}`),

  getAdminCategories: () => adminApi.get(`/admin/categories`),
  
  createAdminCategory: (categoryData) => adminApi.post('/admin/categories', categoryData),
  
  getAdminComments: (page = 1, limit = 20) => 
    adminApi.get(`/admin/comments`, { params: { page, limit } }),
  
  updateAdminComment: (id, data) => adminApi.put(`/admin/comments/${id}`, data),
  
  deleteAdminComment: (id) => adminApi.delete(`/admin/comments/${id}`),

  // Health check
  checkHealth: () => ssrApi.get('/health'),
};

// Utility function for API calls
export const safeApiCall = async (apiCall, fallback = null) => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error('API call failed:', error);
    
    // Return fallback 
    if (fallback !== undefined) {
      return fallback;
    }
        throw error;
  }
};

export default api;