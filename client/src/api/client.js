import axios from 'axios'

// Use environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL
if (!API_BASE_URL) console.warn("VITE_API_URL not set, using localhost fallback");

export const api = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Axios timeout
    if (
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout')
    ) {
      console.warn('⏱️ Request timed out');
    }

    return Promise.reject(error);
  }
);


// API methods
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
  // Method for reactions
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
  createAdminPost: (postData) => api.post('/admin/posts', postData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateAdminPost: (id, postData) => api.put(`/admin/posts/${id}`, postData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAdminPost: (id) => api.delete(`/admin/posts/${id}`),
  deletePost: (id) => api.delete(`/admin/posts/${id}`),
  getAdminCategories: () => api.get('/admin/categories'),
  getAdminComments: () => api.get('/admin/comments'),
  updateAdminComment: (id, data) => api.put(`/admin/comments/${id}`, data),
  deleteAdminComment: (id) => api.delete(`/admin/comments/${id}`),
  createAdminCategory: (categoryData) => api.post('/admin/categories', categoryData),
}

export default api