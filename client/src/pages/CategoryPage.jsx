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

  useEffect(() => {
    fetchCategoryPosts()
  }, [category])

  const fetchCategoryPosts = async () => {
    try {
      setLoading(true)
      const response = await blogAPI.getCategoryPosts(category)
      setPosts(response.data.posts)
      
      // Get category info from first post or categories list
      if (response.data.posts.length > 0) {
        setCategoryInfo({
          name: response.data.posts[0].category_name,
          description: `Latest ${response.data.posts[0].category_name} articles and news`
        })
      }
    } catch (error) {
      console.error('Error fetching category posts:', error)
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
        {/* Header Ad */}
        <HeaderAd />

        {/* Category Header */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 capitalize">
            {categoryInfo?.name || category?.replace('-', ' ')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {categoryInfo?.description || `Browse all articles in ${category?.replace('-', ' ')}`}
          </p>
        </section>

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
              <p className="text-gray-600">There are no posts in this category yet.</p>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

export default CategoryPage