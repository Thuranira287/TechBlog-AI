import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

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

  // Auth
  login: (credentials) => api.post('/auth/login', credentials),

  getMe: () => api.get('/auth/me'),
}

export default api