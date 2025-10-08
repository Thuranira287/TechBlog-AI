import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, User, Eye } from 'lucide-react'

const PostCard = ({ post }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {post.featured_image && (
        <Link to={`/post/${post.slug}`} className="block">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </Link>
      )}
      
      <div className="p-6">
        {post.category_name && (
          <Link 
            to={`/category/${post.category_slug}`}
            className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3 hover:bg-blue-200 transition-colors"
          >
            {post.category_name}
          </Link>
        )}
        
        <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
          <Link to={`/post/${post.slug}`} className="hover:text-blue-600 transition-colors">
            {post.title}
          </Link>
        </h2>
        
        {post.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {post.excerpt}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>{post.author_name}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <time dateTime={post.published_at}>
                {formatDate(post.published_at)}
              </time>
            </div>
          </div>
          
          {post.view_count > 0 && (
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{post.view_count.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default PostCard