import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogAPI } from '../api/client'
import { Calendar, User, Eye, Share2 } from 'lucide-react'
import PostCard from '../components/PostCard'
import { InContentAd } from '../components/AdSense'
import CommentSection from '../components/CommentSection'

const PostPage = () => {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Define constants that depend on post AFTER it's loaded
  const SITE_URL = 'https://aitechblogs.netlify.app';

  useEffect(() => {
    fetchPost()
  }, [slug])

  const fetchPost = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await blogAPI.getPost(slug)
      setPost(response.data)
    } catch (err) {
      setError('Post not found')
      console.error('Error fetching post:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const sharePost = () => {
    if (!post) return;
    
    const shareUrl = `https://aitechblogs.netlify.app/post/${post.slug}/`;
    const shareText = post.twitter_title || post.title;
    const shareDescription = post.twitter_description || post.og_description || post.excerpt;
    
    if (navigator.share) {
      navigator.share({
        title: shareText,
        text: shareDescription,
        url: shareUrl,
      });
    } else {
      // Twitter-specific sharing
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600">The post you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  // Calculate URLs AFTER post is loaded
  const postUrl = `${SITE_URL}/post/${post.slug}/`;
  const imageUrl = post.featured_image 
    ? (post.featured_image.startsWith('http') ? post.featured_image : `${SITE_URL}${post.featured_image}`)
    : `${SITE_URL}/og-image.png`;

  return (
    <>
      <Helmet>
        <title>{post.meta_title || post.title} | TechBlog AI</title>
        <meta name="description" content={post.meta_description || post.excerpt} />
        
        {/* Keywords */}
        <meta name="keywords" content={post.keywords || (post.tags && post.tags.join(', ')) || post.category_name} />
        <meta name="author" content={post.author_name || "Admin"} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={postUrl} />
        <meta property="og:title" content={post.og_title || post.meta_title || post.title} />
        <meta property="og:description" content={post.og_description || post.meta_description || post.excerpt} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={post.title} />
        <meta property="og:site_name" content="TechBlog AI" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={postUrl} />
        <meta name="twitter:title" content={post.twitter_title || post.og_title || post.meta_title || post.title} />
        <meta name="twitter:description" content={post.twitter_description || post.og_description || post.meta_description || post.excerpt} />
        <meta name="twitter:image" content={imageUrl} />
        <meta name="twitter:image:alt" content={post.title} />
        <meta name="twitter:site" content="@techblogai" />
        <meta name="twitter:creator" content="@techblogai" />
        
        {/* Article Specific */}
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:modified_time" content={post.updated_at} />
        <meta property="article:author" content={post.author_name} />
        <meta property="article:section" content={post.category_name} />
        
        {/* Article Tags */}
        {post.tags && post.tags.map((tag, index) => (
          <meta key={index} property="article:tag" content={tag} />
        ))}
        
        {/* Canonical URL */}
        <link rel="canonical" href={postUrl} />
        
        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.meta_title || post.title,
            description: post.meta_description || post.excerpt,
            image: imageUrl,
            datePublished: post.published_at,
            dateModified: post.updated_at,
            author: { 
              "@type": "Person", 
              name: post.author_name,
              url: post.author_id ? `${SITE_URL}/author/${post.author_id}` : SITE_URL
            },
            publisher: {
              "@type": "Organization",
              name: "TechBlog AI",
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/blog-icon.svg`,
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": postUrl
            },
            keywords: post.keywords || (post.tags && post.tags.join(', ')),
            articleSection: post.category_name
          })}
        </script>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <article className="max-w-4xl mx-auto">
          {/* Post Header */}
          <header className="mb-8">
            {post.category_name && (
              <a
                href={`/category/${post.category_slug}`}
                className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-4 hover:bg-blue-200 transition-colors"
              >
                {post.category_name}
              </a>
            )}

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{post.author_name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              </div>
              {post.view_count > 0 && (
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>{post.view_count.toLocaleString()} views</span>
                </div>
              )}
              <button
                onClick={sharePost}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            {post.featured_image && (
              <>
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-64 md:h-96 object-cover rounded-lg shadow-sm"
                  loading="eager"
                />
                {/* Ad just below image */}
                <div className="mt-6">
                  <InContentAd />
                </div>
              </>
            )}
          </header>

          {/* Post Body */}
          <div className="prose prose-lg max-w-none mb-8">
            {post.excerpt && (
              <div className="bg-blue-50 border-l-4 border-blue-500 pl-4 py-2 mb-6 italic">
                {post.excerpt}
              </div>
            )}

            <div dangerouslySetInnerHTML={{ __html: post.content }} />

            {/* Mid-content Ad */}
            <InContentAd />
          </div>

          {/* Comments Section */}
          <CommentSection postId={post.id} />

          {/* Ad after comments */}
          <div className="mt-10">
            <InContentAd />
          </div>

          {/* Related Posts */}
          {post.related_posts && post.related_posts.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {post.related_posts.map((relatedPost) => (
                  <PostCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </>
  )
}

export default PostPage