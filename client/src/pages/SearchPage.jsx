import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogAPI } from '../api/client'
import PostCard from '../components/PostCard'
import { Search, AlertCircle } from 'lucide-react'

const PAGE_SIZE = 20

const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Get raw query from URL
  const rawQuery = searchParams.get('q')?.trim() || ''
  
  // Clean the query
  const query = rawQuery.replace(/^#/, '').trim()

  const [searchTerm, setSearchTerm] = useState(query)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalResults, setTotalResults] = useState(0)

  // Core search logic
  const fetchSearchResults = useCallback(
    async (searchQuery, page = 1) => {
      if (!searchQuery) return

      try {
        setLoading(true)
        setError(null)
        
        // Log the search query for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Searching for: "${searchQuery}" (page ${page})`)
        }
        
        const { data } = await blogAPI.searchPosts(searchQuery, page, PAGE_SIZE)

        const newPosts = data?.posts || []

        setPosts(prev =>
          page === 1 ? newPosts : [...prev, ...newPosts]
        )

        setTotalResults(data?.total ?? newPosts.length)
        setHasMore(
          data?.hasMore ??
          newPosts.length === PAGE_SIZE
        )

        setCurrentPage(page)
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Search failed:', err)
        }
        setError('Failed to load search results.')
        setPosts([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Run search when URL query changes
  useEffect(() => {
    setSearchTerm(rawQuery)
    setPosts([])
    setCurrentPage(1)
    setHasMore(false)
    setTotalResults(0)

    if (query) {
      fetchSearchResults(query, 1)
    }
  }, [rawQuery, query, fetchSearchResults])

  // Handle search submit
  const handleSearchSubmit = e => {
    e.preventDefault()
    const trimmed = searchTerm.trim()

    if (!trimmed) return

    // Keep the original input
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchSearchResults(query, currentPage + 1)
    }
  }

  // Determine if this is a tag search
  const isTagSearch = rawQuery.startsWith('#')

  return (
    <>
      <Helmet>
        <title>
          {query
            ? `${isTagSearch ? 'Tag' : 'Search'}: ${query} | TechBlog AI`
            : 'Search | TechBlog AI'}
        </title>
        <meta
          name="description"
          content={
            query
              ? `${isTagSearch ? 'Posts tagged with' : 'Search results for'} "${query}" on TechBlog AI`
              : 'Search articles on TechBlog AI'
          }
        />
        {isTagSearch && (
          <meta name="robots" content="noindex, follow" />
        )}
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Search Box */}
        <section className="max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl font-bold text-center mb-6">
            {isTagSearch ? 'Browse by Tag' : 'Search Posts'}
          </h1>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search articles, tutorials, news..."
              className="w-full pl-12 pr-32 py-4 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </form>
        </section>

        {/* Results Header */}
        {query && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              {isTagSearch ? (
                <>Posts tagged with <span className="text-blue-600">#{query}</span></>
              ) : (
                <>Results for “{query}”</>
              )}
            </h2>
            <p className="text-gray-600 mt-1">
              {totalResults} result{totalResults !== 1 && 's'} found
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Results */}
        {loading && posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading results…</p>
          </div>
        ) : posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        ) : query && !loading ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">
              No {isTagSearch ? 'posts with this tag' : 'posts found'}
            </h3>
            <p className="text-gray-600">
              {isTagSearch 
                ? 'Try browsing other tags or search for something else.'
                : 'Try different keywords or browse categories.'}
            </p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Enter a search term to begin.
          </div>
        )}
      </div>
    </>
  )
}

export default SearchPage