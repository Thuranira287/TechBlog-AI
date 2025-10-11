import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogAPI } from '../api/client'
import PostCard from '../components/PostCard'
import { HeaderAd } from '../components/AdSense'

const CategoryPage = () => {
  const { category } = useParams()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryInfo, setCategoryInfo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCategoryPosts()
  }, [category])

  const fetchCategoryPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await blogAPI.getCategoryPosts(category)
      console.log('📄 Category API Response:', response.data)
      
      setPosts(response.data.posts || [])
      
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

  return (
    <>
      <Helmet>
        <title>{categoryInfo?.name || 'Category'} | TechBlog AI</title>
        <meta name="description" content={categoryInfo?.description} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <HeaderAd />

        {/* Category Header */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 capitalize">
            {categoryInfo?.name || category?.replace(/-/g, ' ')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {categoryInfo?.description || `Browse all articles in ${category?.replace(/-/g, ' ')}`}
          </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Posts Found</h2>
              <p className="text-gray-600">
                {error 
                  ? `Error: ${error}`
                  : `There are no published posts in this category yet.`
                }
              </p>
              {!error && (
                <p className="text-gray-500 mt-2">
                  Check back soon or explore other categories.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

export default CategoryPage