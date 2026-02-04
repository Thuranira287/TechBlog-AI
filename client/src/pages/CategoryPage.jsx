import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogAPI } from '../api/client'
import PostCard from '../components/PostCard'
import { HeaderAd } from '../components/AdSense'

const CategoryPage = () => {
  const { category } = useParams()
  const [searchParams] = useSearchParams()
  const currentPage = parseInt(searchParams.get('page') || '1')
  const navigate = useNavigate()
  
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryInfo, setCategoryInfo] = useState(null)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1
  })

  useEffect(() => {
    fetchCategoryPosts()
  }, [category, currentPage])

  const fetchCategoryPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await blogAPI.getCategoryPosts(category, currentPage)
      console.log('📄 Category API Response:', response.data)
      
      setPosts(response.data.posts || [])

      if (response.data.total !== undefined) {
        setPagination({
          total: response.data.total,
          currentPage: response.data.currentPage || currentPage,
          totalPages: response.data.totalPages || 1
        })
      }
      
      if (response.data.posts && response.data.posts.length > 0) {
        setCategoryInfo({
          name: response.data.posts[0].category_name,
          description: `Latest ${response.data.posts[0].category_name} articles and news`
        })
      } else if (response.data.category) {
        setCategoryInfo({
          name: response.data.category.name,
          description: response.data.category.description || `Browse all articles in ${response.data.category.name}`
        })
      } else {
        setCategoryInfo({
          name: category?.replace(/-/g, ' '),
          description: `Browse all articles in ${category?.replace(/-/g, ' ')}`
        })
      }
    } catch (error) {
      console.error('Error fetching category posts:', error)
      setError(error.response?.data?.error || 'Failed to load category posts')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  // Pagination Component
  const Pagination = () => {
    if (pagination.totalPages <= 1) return null
    
    const handlePageChange = (page) => {
      navigate(`/category/${category}?page=${page}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    
    return (
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-12 pt-8 border-t border-gray-200">
        <div className="flex items-center gap-4">
          {pagination.currentPage > 1 && (
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
            const pageNum = i + 1
            return pageNum === pagination.currentPage ? (
              <button
                key={pageNum}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                aria-current="page"
              >
                {pageNum}
              </button>
            ) : (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {pageNum}
              </button>
            )
          })}
          
          {pagination.totalPages > 5 && (
            <span className="px-2 text-gray-500">...</span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {pagination.currentPage < pagination.totalPages && (
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          <div className="text-sm text-gray-500 hidden md:block">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>
          {categoryInfo?.name || category?.replace(/-/g, ' ')}
          {pagination.currentPage > 1 ? ` (Page ${pagination.currentPage})` : ''} | TechBlog AI
        </title>
        <meta 
          name="description" 
          content={`${categoryInfo?.description || ''}${
            pagination.currentPage > 1 ? ` - Page ${pagination.currentPage}` : ''
          }`} 
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <HeaderAd />

        {/* Category Header */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 capitalize">
            {categoryInfo?.name || category?.replace(/-/g, ' ')}
            {pagination.currentPage > 1 && (
              <span className="text-blue-600 ml-2">(Page {pagination.currentPage})</span>
            )}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {categoryInfo?.description || `Browse all articles in ${category?.replace(/-/g, ' ')}`}
            {pagination.currentPage > 1 && (
              <span className="text-gray-500 ml-2">- Page {pagination.currentPage}</span>
            )}
          </p>
          
          {pagination.total > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
              <span className="font-medium">{pagination.total}</span> articles
              <span className="mx-1">•</span>
              Page <span className="font-medium mx-1">{pagination.currentPage}</span> of{" "}
              <span className="font-medium">{pagination.totalPages}</span>
            </div>
          )}
        </section>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Posts Grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
              {pagination.totalPages > 1 && <Pagination />}
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {pagination.currentPage > pagination.totalPages 
                  ? `Page ${pagination.currentPage} Not Found` 
                  : 'No Posts Found in This Category'
                }
              </h2>
              <p className="text-gray-600 mb-6">
                {pagination.currentPage > pagination.totalPages
                  ? `There are only ${pagination.totalPages} page${pagination.totalPages !== 1 ? 's' : ''} in this category.`
                  : 'There are no published posts in this category yet. Browse All Categories'
                }
              </p>
              <div className="flex gap-4 justify-center">
                <a 
                  href={`/category/${category}`} 
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ← Return to Page 1
                </a>
                <a 
                  href="/" 
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Browse All Categories
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

export default CategoryPage