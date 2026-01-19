import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { blogAPI } from '../../api/client';
import { Save, ArrowLeft, Eye, Twitter, Facebook } from 'lucide-react';

const PostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category_id: '',
    meta_title: '',
    meta_description: '',
    keywords: '',
    og_title: '',
    og_description: '',
    twitter_title: '',
    twitter_description: '',
    tags: '',
    status: 'draft',
    featured_image: null
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchCategories();
    if (isEditing) {
      fetchPost();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await blogAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPost = async () => {
    try {
      const response = await blogAPI.getAdminPost(id);
      const post = response.data;
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        category_id: post.category_id,
        meta_title: post.meta_title || post.title,
        meta_description: post.meta_description || post.excerpt,
        keywords: post.keywords || '',
        og_title: post.og_title || post.meta_title || post.title,
        og_description: post.og_description || post.meta_description || post.excerpt,
        twitter_title: post.twitter_title || post.og_title || post.meta_title || post.title,
        twitter_description: post.twitter_description || post.og_description || post.meta_description || post.excerpt,
        tags: Array.isArray(post.tags) ? post.tags.join(', ') : post.tags || '',
        status: post.status
      });
      if (post.featured_image) {
        setImagePreview(post.featured_image);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate required fields
  if (!formData.title || !formData.slug || !formData.content || !formData.category_id) {
    alert('Please fill in all required fields: Title, Slug, Content, and Category');
    return;
  }
  
  setLoading(true);

  try {
    // Create FormData object
    const postData = new FormData();
    
    // Append all text fields
    postData.append('title', formData.title || '');
    postData.append('slug', formData.slug || '');
    postData.append('excerpt', formData.excerpt || '');
    postData.append('content', formData.content || '');
    postData.append('category_id', formData.category_id || '');
    postData.append('meta_title', formData.meta_title || formData.title || '');
    postData.append('meta_description', formData.meta_description || formData.excerpt || '');
    postData.append('keywords', formData.keywords || '');
    postData.append('og_title', formData.og_title || formData.meta_title || formData.title || '');
    postData.append('og_description', formData.og_description || formData.meta_description || formData.excerpt || '');
    postData.append('twitter_title', formData.twitter_title || formData.og_title || formData.meta_title || formData.title || '');
    postData.append('twitter_description', formData.twitter_description || formData.og_description || formData.meta_description || formData.excerpt || '');
    postData.append('status', formData.status || 'draft');
    
    // Handle tags - convert to JSON array string
    const tagsArray = formData.tags 
      ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      : [];
    postData.append('tags', JSON.stringify(tagsArray));
    
    // Append featured image if it's a File object
    if (formData.featured_image instanceof File) {
      postData.append('featured_image', formData.featured_image);
    }
    
    // Debug: Log what's being sent
    console.log('📤 FormData contents:');
    for (let [key, value] of postData.entries()) {
      console.log(`${key}:`, value instanceof File ? `File: ${value.name}` : value);
    }

    let response;
    if (isEditing) {
      // For editing, include existing image if available
      if (imagePreview && !imagePreview.startsWith('blob:')) {
        postData.append('existing_featured_image', imagePreview);
      }
      console.log(`🔄 Updating post ID: ${id}`);
      response = await blogAPI.updateAdminPost(id, postData);
    } else {
      console.log('🆕 Creating new post');
      response = await blogAPI.createAdminPost(postData);
    }

    console.log('✅ Success:', response.data);
    navigate('/admin/dashboard');
  } catch (error) {
    console.error('❌ Error saving post:', error);
    console.error('Full error:', error);
    
    let errorMessage = 'Error saving post. Please try again.';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
      if (error.response.data.details) {
        errorMessage += `\n\nDetails: ${error.response.data.details}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    alert(errorMessage);
  } finally {
    setLoading(false);
  }
};

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, featured_image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title) => {
    const newSlug = generateSlug(title);
    const newMetaTitle = title;
    const newMetaDescription = formData.excerpt;
    
    setFormData({ 
      ...formData, 
      title: title,
      slug: newSlug,
      meta_title: formData.meta_title || newMetaTitle,
      og_title: formData.og_title || newMetaTitle,
      twitter_title: formData.twitter_title || newMetaTitle,
      meta_description: formData.meta_description || newMetaDescription,
      og_description: formData.og_description || newMetaDescription,
      twitter_description: formData.twitter_description || newMetaDescription
    });
  };

  const handleExcerptChange = (excerpt) => {
    setFormData({ 
      ...formData, 
      excerpt: excerpt,
      meta_description: formData.meta_description || excerpt,
      og_description: formData.og_description || excerpt,
      twitter_description: formData.twitter_description || excerpt
    });
  };

  // Character counter component
  const CharCounter = ({ text, max, min = 0 }) => {
    const length = text?.length || 0;
    const isValid = length >= min && length <= max;
    return (
      <div className={`text-xs mt-1 ${isValid ? 'text-gray-500' : 'text-red-500'}`}>
        {length} / {max} characters {!isValid && '(Check length)'}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Post' : 'Create New Post'}
            </h1>
          </div>
          <button
            type="submit"
            form="post-form"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Post'}</span>
          </button>
        </div>

        <form id="post-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Main Content Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Content</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Slug *</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="post-url-slug"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Excerpt</label>
                <textarea
                  rows="3"
                  value={formData.excerpt}
                  onChange={(e) => handleExcerptChange(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Brief summary of your post"
                />
                <CharCounter text={formData.excerpt} max={700} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Content *</label>
                <textarea
                  rows="15"
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono"
                  placeholder="Write your post content here..."
                />
              </div>
            </div>
          </div>

          {/* SEO Settings Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Eye className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-medium text-gray-900">SEO Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meta Title (Search Results)
                </label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Optimized title for search engines"
                />
                <CharCounter text={formData.meta_title} min={30} max={500} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meta Description (Search Results)
                </label>
                <textarea
                  rows="3"
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Brief description that appears in search results"
                />
                <CharCounter text={formData.meta_description} min={120} max={500} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="seo, keywords, comma, separated"
                />
              </div>

              {/* Social Media Section */}
              <div className="border-t pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Facebook className="w-5 h-5 text-blue-500" />
                  <h3 className="text-md font-medium text-gray-900">Open Graph (Facebook/WhatsApp)</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">OG Title</label>
                    <input
                      type="text"
                      value={formData.og_title}
                      onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="Title for social media shares"
                    />
                    <CharCounter text={formData.og_title} min={30} max={500} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">OG Description</label>
                    <textarea
                      rows="2"
                      value={formData.og_description}
                      onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="Description for social media shares"
                    />
                    <CharCounter text={formData.og_description} min={100} max={500} />
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-6 mb-4">
                  <Twitter className="w-5 h-5 text-blue-400" />
                  <h3 className="text-md font-medium text-gray-900">Twitter Cards</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Twitter Title</label>
                    <input
                      type="text"
                      value={formData.twitter_title}
                      onChange={(e) => setFormData({ ...formData, twitter_title: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="Title for Twitter shares"
                    />
                    <CharCounter text={formData.twitter_title} min={30} max={500} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Twitter Description</label>
                    <textarea
                      rows="2"
                      value={formData.twitter_description}
                      onChange={(e) => setFormData({ ...formData, twitter_description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="Description for Twitter shares"
                    />
                    <CharCounter text={formData.twitter_description} min={100} max={500} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Post Settings Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Post Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Featured Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1 block w-full"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img src={imagePreview} alt="Preview" className="h-32 object-cover rounded" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="AI, Machine Learning, Tutorial"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostEditor;