import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogAPI } from '../api/client'
import PostCard from '../components/PostCard'
import { Search } from 'lucide-react'

const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(query)

  useEffect(() => {
    if (query) {
      performSearch(query)
    }
  }, [query])

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return
    
    try {
      setLoading(true)
      const response = await blogAPI.getPosts(1, 20, null, searchQuery)
      setPosts(response.data.posts)
    } catch (error) {
      console.error('Error searching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      window.history.replaceState(null, '', `/search?q=${encodeURIComponent(searchTerm)}`)
      performSearch(searchTerm)
    }
  }

  return (
    <>
      <Helmet>
        <title>Search Results for "{query}" | TechBlog AI</title>
        <meta name="description" content={`Search results for "${query}" on TechBlog AI`} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <section className="max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Search Posts</h1>
          
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search for articles, tutorials, news..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </section>

        {/* Search Results */}
        <section>
          {query && (
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Search Results for "{query}" ({posts.length} found)
            </h2>
          )}

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
          ) : query ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-bold text-gray-900 mb-4">No posts found</h3>
              <p className="text-gray-600">Try different search terms or browse our categories.</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Enter a search term to find posts.</p>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

export default SearchPage