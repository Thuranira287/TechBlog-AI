import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { blogAPI } from '../api/client'
import PostCard from '../components/PostCard'
import { HeaderAd, InContentAd } from '../components/AdSense'
import { useBlog } from '../context/BlogContext'

const HomePage = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})
  const { categories } = useBlog()

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async (page = 1) => {
    try {
      setLoading(true)
      const response = await blogAPI.getPosts(page)
      setPosts(response.data.posts)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (pagination.hasNext) {
      fetchPosts(pagination.current + 1)
    }
  }

  return (
    <>
      <Helmet>
        <title>TechBlog AI - Latest Technology News & Insights</title>
        <meta 
          name="description" 
          content="Stay updated with the latest technology news, AI advancements, web development tutorials, and tech insights from industry experts." 
        />
        <meta property="og:title" content="TechBlog AI - Latest Technology News & Insights" />
        <meta property="og:description" content="Stay updated with the latest technology news, AI advancements, and web development tutorials." />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Header Ad */}
        <HeaderAd />

        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-blue-600">TechBlog AI</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your trusted source for the latest technology news, AI insights, web development tutorials, and industry trends.
          </p>
        </section>

        {/* Featured Categories */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.slice(0, 4).map((category) => (
              <a
                key={category.id}
                href={`/category/${category.slug}`}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.post_count} posts</p>
              </a>
            ))}
          </div>
        </section>

        {/* Recent Posts */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Latest Articles</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {posts.map((post, index) => (
                  <React.Fragment key={post.id}>
                    <PostCard post={post} />
                    {/* Insert ad after every 3rd post */}
                    {(index + 1) % 3 === 0 && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <InContentAd />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Load More Button */}
              {pagination.hasNext && (
                <div className="text-center">
                  <button
                    onClick={loadMore}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Load More Posts
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}

export default HomePage