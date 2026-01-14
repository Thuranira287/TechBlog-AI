import axios from 'axios'

// Use environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL
if (!API_BASE_URL) console.warn("VITE_API_URL not set, using localhost fallback");

// Create main axios instance
export const api = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor for auth tokens
const addAuthToken = (config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

api.interceptors.request.use(addAuthToken);

// Response interceptor with error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    // Handle specific status codes
    if (response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/admin/login';
    }
    
    if (response?.status === 429) {
      window.alert('⚠️ Too many requests');
    }
    
    return Promise.reject(error);
  }
);

// API methods - no custom timeouts
export const blogAPI = {
  // Posts
  getPosts: (page = 1, limit = 10, category = null, search = null) => {
    const params = { page, limit }
    if (category) params.category = category
    if (search) params.search = search
    return api.get('/posts', { params })
  },

  getPost: (slug) => api.get(`/posts/${slug}`),

  getCategoryPosts: (categorySlug, page = 1) => 
    api.get(`/posts/category/${categorySlug}?page=${page}`),

  // Categories
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

  deleteComment: (commentId) => api.delete(`/admin/comments/${commentId}`),

  // Auth
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),

  // Admin methods
  getAdminDashboard: (params = {}) => api.get('/admin/dashboard', { params }),
  
  getAdminPosts: (page = 1) => api.get(`/admin/posts?page=${page}`),
  
  getAdminPost: (id) => api.get(`/admin/posts/${id}`),
  
  createAdminPost: (postData) => {
    const formData = new FormData();
    Object.keys(postData).forEach(key => {
      if (postData[key] !== null && postData[key] !== undefined) {
        formData.append(key, postData[key]);
      }
    });
    
    return api.post('/admin/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  updateAdminPost: (id, postData) => {
    const formData = new FormData();
    Object.keys(postData).forEach(key => {
      if (postData[key] !== null && postData[key] !== undefined) {
        formData.append(key, postData[key]);
      }
    });
    
    return api.put(`/admin/posts/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  deleteAdminPost: (id) => api.delete(`/admin/posts/${id}`),
  deletePost: (id) => api.delete(`/admin/posts/${id}`),

  getAdminCategories: () => api.get(`/admin/categories`),

  getAdminComments: () => api.get(`/admin/comments`),
  
  updateAdminComment: (id, data) => api.put(`/admin/comments/${id}`, data),
  
  deleteAdminComment: (id) => api.delete(`/admin/comments/${id}`),
  
  createAdminCategory: (categoryData) => api.post('/admin/categories', categoryData),
}

export default api;