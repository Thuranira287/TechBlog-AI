import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogAPI } from '../api/client'
import { Calendar, User, Eye, Share2, Clock, Tag, ArrowLeft } from 'lucide-react'
import PostCard from '../components/PostCard'
import { InContentAd } from '../components/AdSense'
import CommentSection from '../components/CommentSection'
import DOMPurify from 'dompurify';

// Constants
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://aitechblogs.netlify.app';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://techblogai-backend.onrender.com';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const PostPage = () => {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)
  const shareMenuRef = useRef(null)
  const articleRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Calculate reading time
  const readingTime = useMemo(() => {
    if (!post?.content) return 1;
    const wordsPerMinute = 200;
    const wordCount = post.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }, [post?.content]);

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      if (!articleRef.current) return;
      
      const article = articleRef.current;
      const totalHeight = article.clientHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false)
      }
    }
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowShareMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Fetch post with caching and abort controller
  const fetchPost = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true)
      setError(null)
      
      // Check cache first
      const cached = sessionStorage.getItem(`post_${slug}`);
      const cachedData = cached ? JSON.parse(cached) : null;
      
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        setPost(cachedData.data);
        setLoading(false);
        return;
      }

      const response = await blogAPI.getPost(slug, {
        signal: abortControllerRef.current.signal
      })
      
      const postData = response.data;
      setPost(postData)
      
      // Cache the result
      sessionStorage.setItem(`post_${slug}`, JSON.stringify({
        data: postData,
        timestamp: Date.now()
      }));

      // Track view (optional - can be done via API)
      if (postData.id) {
        // Fire and forget - don't await
        blogAPI.trackView?.(postData.id).catch(() => {});
      }
      
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        setError(err.response?.status === 404 ? 'Post not found' : 'Failed to load post')
        console.error('Error fetching post:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchPost()
    
    // Prefetch related posts
    const prefetchRelated = async () => {
      if (post?.category_slug) {
        try {
          await blogAPI.getCategoryPosts(post.category_slug, 1, 3);
        } catch (e) {
          // Silent fail for prefetch
        }
      }
    };
    
    if (post) {
      prefetchRelated();
    }
  }, [fetchPost, post?.category_slug])

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [])

  // Memoize share URLs
    const shareUrls = useMemo(() => {
      if (!post) return {};
      const shareUrl = `${SITE_URL}/post/${post.slug}`;
  
      const twitterTitle = post.twitter_title || post.og_title || post.meta_title || post.title;
      const ogTitle     = post.og_title || post.meta_title || post.title;
      const ogDesc      = post.og_description || post.meta_description || post.excerpt || '';
  
      // Build hashtag string
      const hashtagString = post.tags?.length
        ? post.tags.slice(0, 3).map(t => t.replace(/\s+/g, '')).join(',')
        : '';
      const twitterText = hashtagString
        ? `${twitterTitle}${post.twitter_description ? `\n\n${post.twitter_description}` : ''} #${hashtagString.split(',').join(' #')}\n\n${shareUrl}`
        : `${twitterTitle}${post.twitter_description ? `\n\n${post.twitter_description}` : ''}\n\n${shareUrl}`;
      const whatsappText = `${ogTitle}\n${shareUrl}`;
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  
      return {
        twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`,
        facebook: facebookUrl,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
        reddit:   `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(ogTitle)}`,
        email:    `mailto:?subject=${encodeURIComponent(ogTitle)}&body=${encodeURIComponent(`${ogDesc}\n\n${shareUrl}`)}`,
        copy:     shareUrl,
      };
    }, [post]);
  
    const sharePost = useCallback((platform) => {
      if (!post || !shareUrls[platform]) return;
  
      if (platform === 'copy') {
        navigator.clipboard.writeText(shareUrls.copy).then(() => {
          setShowCopyToast(true);
          setShowShareMenu(false);
          setTimeout(() => setShowCopyToast(false), 2000);
        }).catch(() => {
          const textarea = document.createElement('textarea');
          textarea.value = shareUrls.copy;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setShowCopyToast(true);
          setTimeout(() => setShowCopyToast(false), 2000);
        });
        return;
      }
  
      if (platform === 'native' && navigator.share) {
        navigator.share({
          title: post.og_title || post.meta_title || post.title,
          text:  post.og_description || post.meta_description || post.excerpt,
          url:   shareUrls.copy,
        }).catch(() => {});
        setShowShareMenu(false);
        return;
      }
  
      const url = shareUrls[platform];
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
        setShowShareMenu(false);
      }
    }, [post, shareUrls]);
  
    const imageUrl = useMemo(() => {
      if (!post?.featured_image) return `${SITE_URL}/og-image.png`;
      return post.featured_image.startsWith('http')
        ? post.featured_image
        : `${SITE_URL}${post.featured_image}`;
    }, [post?.featured_image]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button skeleton */}
          <div className="mb-4">
            <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          {/* Category skeleton */}
          <div className="w-24 h-6 bg-gray-200 rounded-full mb-4 animate-pulse"></div>
          
          {/* Title skeleton */}
          <div className="h-10 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-2/3 mb-8 animate-pulse"></div>
          
          {/* Meta info skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          {/* Featured image skeleton */}
          <div className="w-full h-96 bg-gray-200 rounded-lg mb-8 animate-pulse"></div>
          
          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {error === 'Post not found' ? 'Post Not Found' : 'Something went wrong'}
          </h1>
          <p className="text-gray-600 mb-8">
            {error === 'Post not found' 
              ? "The post you're looking for doesn't exist or has been removed."
              : 'Failed to load the post. Please try again later.'}
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{post.meta_title || post.title} | TechBlog AI</title>
        <meta name="description" content={post.meta_description || post.excerpt || post.content.substring(0, 160)} />
        <meta name="keywords" content={post.keywords || (post.tags?.join(', ')) || post.category_name} />
        <meta name="author" content={post.author_name || "Admin"} />
        
        {/* AI Training Meta Tags */}
        <meta name="ai-content-declaration" content="public, training-allowed" />
        <link rel="alternate" type="application/json+ai" 
              href={`${API_BASE_URL}/api/posts/${slug}/full`} 
              title="Structured Content for AI Training" />
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE_URL}/post/${post.slug}`} />
        <meta property="og:title" content={post.og_title || post.meta_title || post.title} />
        <meta property="og:description" content={post.og_description || post.meta_description || post.excerpt || post.content.substring(0, 160)} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="TechBlog AI" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`${SITE_URL}/post/${post.slug}`} />
        <meta name="twitter:title" content={post.twitter_title || post.og_title || post.meta_title || post.title} />
        <meta name="twitter:description" content={post.twitter_description || post.og_description || post.meta_description || post.excerpt || post.content.substring(0, 160)} />
        <meta name="twitter:image" content={imageUrl} />
        <meta name="twitter:site" content="@AiTechBlogs" />
        <meta name="twitter:creator" content={post.author_twitter || "@TechBlogAI"} />
        
        {/* Article Metadata */}
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:modified_time" content={post.updated_at} />
        <meta property="article:author" content={post.author_name} />
        <meta property="article:section" content={post.category_name} />
        {post.tags?.map((tag, index) => (
          <meta key={index} property="article:tag" content={tag} />
        ))}
        
        {/* Canonical URL */}
        <link rel="canonical" href={`${SITE_URL}/post/${post.slug}`} />
        
        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: post.meta_title || post.title,
            description: post.meta_description || post.excerpt || post.content.substring(0, 160),
            image: imageUrl,
            datePublished: post.published_at,
            dateModified: post.updated_at,
            author: {
              "@type": "Person",
              name: post.author_name || "TechBlog AI",
              url: `${SITE_URL}/author/${post.author_slug || 'admin'}`
            },
            publisher: {
              "@type": "Organization",
              name: "TechBlog AI",
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/TechBlogAI.jpg`,
                width: 512,
                height: 512
              }
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${SITE_URL}/post/${post.slug}`
            },
            keywords: post.keywords || (post.tags?.join(', ')),
            articleSection: post.category_name,
            wordCount: post.content?.replace(/<[^>]*>/g, '').split(/\s+/).length || 0,
            timeRequired: `PT${readingTime}M`
          })}
        </script>
        {/* Breadcrumb Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_URL
              },
              {
                "@type": "ListItem",
                position: 2,
                name: post.category_name,
                item: `${SITE_URL}/category/${post.category_slug}`
              },
              {
                "@type": "ListItem",
                position: 3,
                name: post.title,
                item: `${SITE_URL}/post/${post.slug}`
              }
            ]
          })}
        </script>

      </Helmet>

      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div 
          className="h-full bg-primary-600 transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div className="container mx-auto px-4 py-8" ref={articleRef}>
        <article className="max-w-4xl mx-auto animate-fadeIn">
          {/* Back button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-6 animate-fadeIn">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link 
                  to="/" 
                  className="hover:text-primary-600 hover:underline underline-offset-4 transition-all"
                >
                  Home
                </Link>
              </li>

              <li className="text-blue-500">/</li>

              {post.category_name && (
                <>
                  <li>
                    <Link
                      to={`/category/${post.category_slug}`}
                      className="hover:text-primary-600 hover:underline underline-offset-4 transition-all"
                    >
                      {post.category_name}
                    </Link>
                  </li>
                  <li className="text-blue-500">/</li>
                </>
              )}

              <li className="text-gray-700 font-medium truncate max-w-xs">
                {post.title}
              </li>
            </ol>
          </nav>

          {/* Post Header */}
          <header className="mb-8">
            {post.category_name && (
              <a 
                href={`/category/${post.category_slug}`}
                className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4 hover:bg-primary-200 transition-colors"
                aria-label={`View all posts in ${post.category_name}`}
              >
                {post.category_name}
              </a>
            )}

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" aria-hidden="true" />
                <span>{post.author_name || 'Admin'}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>{readingTime} min read</span>
              </div>
              
              {post.view_count > 0 && (
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  <span>{post.view_count.toLocaleString()} views</span>
                </div>
              )}
              
              {/* Share Button */}
              <div className="relative ml-auto" ref={shareMenuRef}>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors px-3 py-2 rounded-lg hover:bg-primary-50"
                  aria-label="Share this post"
                  aria-expanded={showShareMenu}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>

                {/* Share Menu */}
                {showShareMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                      onClick={() => setShowShareMenu(false)}
                      aria-hidden="true"
                    />
                    
                    {/* Share Menu */}
                    <div 
                      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl py-4 z-50 md:absolute md:bottom-auto md:left-auto md:right-0 md:mt-2 md:w-64 md:rounded-lg md:shadow-lg md:border md:border-gray-200 animate-slideUpMobile md:animate-fadeIn"
                      role="dialog"
                      aria-label="Share options"
                    >
                      <div className="md:hidden w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                      <h3 className="md:hidden text-lg font-semibold text-gray-900 px-6 mb-3">
                        Share this post
                      </h3>
                      
                      <div className="max-h-[70vh] overflow-y-auto">
                        <ShareButton 
                          onClick={() => sharePost('twitter')}
                          icon={<TwitterIcon />}
                          label="Twitter"
                        />
                        <ShareButton 
                          onClick={() => sharePost('linkedin')}
                          icon={<LinkedInIcon />}
                          label="LinkedIn"
                        />
                        <ShareButton 
                          onClick={() => sharePost('facebook')}
                          icon={<FacebookIcon />}
                          label="Facebook"
                        />
                        <ShareButton 
                          onClick={() => sharePost('whatsapp')}
                          icon={<WhatsAppIcon />}
                          label="WhatsApp"
                        />
                        <ShareButton 
                          onClick={() => sharePost('reddit')}
                          icon={<RedditIcon />}
                          label="Reddit"
                        />
                        <ShareButton 
                          onClick={() => sharePost('email')}
                          icon={<EmailIcon />}
                          label="Email"
                        />
                        
                        <div className="border-t border-gray-200 my-1" />
                        
                        <ShareButton 
                          onClick={() => sharePost('copy')}
                          icon={<CopyIcon />}
                          label="Copy Link"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && post.tags.some(tag => tag && tag.trim() !== '') && (
              <div className="flex flex-wrap gap-2 mb-6">
                <Tag className="w-4 h-4 text-gray-400 mt-1" aria-hidden="true" />
                {post.tags.filter(tag => tag && tag.trim() !== '').slice(0, 5).map((tag, index) => (
                  <a
                    key={index}
                    href={`/search?q=${encodeURIComponent('#' + tag)}`}
                    className="text-sm text-gray-600 hover:text-primary-600 bg-gray-100 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      // Navigate to search with the tag
                      window.location.href = `/search?q=${encodeURIComponent('#' + tag)}`;
                    }}
                  >
                    #{tag}
                  </a>
                ))}
              </div>
            )}

            {post.featured_image && (
              <>
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-64 md:h-96 object-cover rounded-lg shadow-sm"
                  width="1200"
                  height="630"
                  loading="eager"
                  fetchpriority="high"
                  style={{ aspectRatio: '16/9' }}
                />
                {/* Ad just below image */}
                <div className="mt-6">
                  <InContentAd priority='high' />
                </div>
              </>
            )}
          </header>

          {/* Post Body */}
          <div className="prose prose-lg max-w-none mb-8">
            {post.excerpt && (
              <div className="bg-primary-50 border-l-4 border-primary-500 pl-4 py-2 mb-6 italic text-gray-700">
                {post.excerpt}
              </div>
            )}

            <div 
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(post.content, {
                  ADD_TAGS: ['iframe'],
                  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
                })
              }} 
            />

            {/* Mid-content Ad */}
            <InContentAd priority='medium' />
          </div>

          {/* Comments Section */}
          <CommentSection postId={post.id} />

          {/* Ad after comments */}
          <div className="mt-10">
            <InContentAd priority='low' />
          </div>

          {/* Related Posts */}
          {post.related_posts && post.related_posts.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {post.related_posts.slice(0, 2).map((relatedPost) => (
                  <PostCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </section>
          )}
        </article>
      </div>

      {/* Copy Toast Notification */}
      {showCopyToast && (
        <div 
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slideUp"
          role="alert"
        >
          ✓ Link copied to clipboard!
        </div>
      )}
    </>
  )
}

// Share Button Component
const ShareButton = ({ onClick, icon, label }) => (
  <button
    onClick={onClick}
    className="w-full px-6 md:px-4 py-3 md:py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
    aria-label={`Share on ${label}`}
  >
    <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
    <span>{label}</span>
  </button>
);

// Icon Components (keep as is)
const TwitterIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const RedditIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const EmailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
  </svg>
);

export default PostPage