import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogAPI } from '../api/client'
import { Calendar, User, Eye, Share2, X } from 'lucide-react'
import PostCard from '../components/PostCard'
import { InContentAd } from '../components/AdSense'
import CommentSection from '../components/CommentSection'

const PostPage = () => {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showCopyToast, setShowCopyToast] = useState(false)
  const shareMenuRef = useRef(null)
  
  const SITE_URL = 'https://aitechblogs.netlify.app';

  useEffect(() => {
    fetchPost()
  }, [slug])

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
  const buildPostUrl = (slug) =>
  `https://aitechblogs.netlify.app/post/${slug}`;

  const sharePost = (platform) => {
    if (!post) return;
    const shareUrl = buildPostUrl(post.slug);
  
  // Platform-specific text selection
  let shareText, shareDescription;
  
  if (platform === 'twitter') {
    // Twitter
    shareText = post.twitter_title || post.og_title || post.meta_title || post.title;
    shareDescription = post.twitter_description || post.og_description || post.meta_description || post.excerpt;
  } else {
    shareText = post.og_title || post.meta_title || post.title;
    shareDescription = post.og_description || post.meta_description || post.excerpt;
  }
  
  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}\n\n${shareDescription}`)}&url=${encodeURIComponent(shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' - ' + shareUrl)}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`,
    email: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareDescription + '\n\n' + shareUrl)}`,
  };
  
  if (platform === 'copy') {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowCopyToast(true);
      setShowShareMenu(false);
      setTimeout(() => setShowCopyToast(false), 2000);
    });
  } else if (platform === 'native' && navigator.share) {
    navigator.share({
      title: shareText,
      text: shareDescription,
      url: shareUrl,
    }).catch(() => {});
    setShowShareMenu(false);
  } else {
    const url = shareUrls[platform];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
      setShowShareMenu(false);
    }
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
        <meta name="twitter:site" content="@AiTechBlogs" />
        <meta name="twitter:creator" content="@TechBlog AI" />
        
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
            "@type": "TechArticle",
            headline: post.meta_title || post.title,
            description: post.meta_description || post.excerpt,
            image: imageUrl,
            datePublished: post.published_at,
            dateModified: post.updated_at,
            author: {
              "@id": `${SITE_URL}/about#alexander-zachary`
            },
            publisher: {
              "@type": "Organization",
              name: "TechBlog AI",
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/TechBlogAI.jpg`,
                width: 512,
                height: 512
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
              
               <a href={`/category/${post.category_slug}`}
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
              
              {/* Share Button Dropdown */}
              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>

                {/* Share Menu Dropdown */}
                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn">
                    <button
                      onClick={() => sharePost('twitter')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span>Twitter</span>
                    </button>

                    <button
                      onClick={() => sharePost('linkedin')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <span>LinkedIn</span>
                    </button>

                    <button
                      onClick={() => sharePost('facebook')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Facebook</span>
                    </button>

                    <button
                      onClick={() => sharePost('whatsapp')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => sharePost('reddit')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                      </svg>
                      <span>Reddit</span>
                    </button>

                    <button
                      onClick={() => sharePost('email')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                      <span>Email</span>
                    </button>

                    <div className="border-t border-gray-200 my-1"></div>

                    <button
                      onClick={() => sharePost('copy')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                      <span>Copy Link</span>
                    </button>
                  </div>
                )}
              </div>
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

      {/* Copy Toast Notification */}
      {showCopyToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slideUp">
          ✓ Link copied to clipboard!
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </>
  )
}

export default PostPage