import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogAPI } from '../../api/client';
import { Plus, FileText, Folder, MessageSquare, Eye, Trash2 } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalCategories: 0,
    totalComments: 0
  });
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchDashboardData(page);
  }, [page]);

const fetchDashboardData = async (pageNum = 1) => {
  try {
    setLoading(true);
    const response = await blogAPI.getAdminDashboard({ page: pageNum, limit: 50 });
    
    console.log('Response posts:', response.data?.posts);
    console.log('Post IDs:', response.data?.posts?.map(p => p.id));
    
    // Check for duplicates
    const postIds = response.data?.posts?.map(p => p.id) || [];
    const uniqueIds = [...new Set(postIds)];
    if (postIds.length !== uniqueIds.length) {
      console.warn('DUPLICATE POSTS DETECTED!', postIds);
    }
    
    if (response.data) {
      setStats(response.data.stats || {
        totalPosts: 0,
        totalCategories: 0,
        totalComments: 0
      });
      
      const postsData = response.data.posts || [];
      
      if (pageNum === 1) {
        setRecentPosts(postsData);
      } else {
        // Filter out duplicates before adding
        const existingIds = new Set(recentPosts.map(p => p.id));
        const newPosts = postsData.filter(post => !existingIds.has(post.id));
        
        console.log('Filtered new posts:', newPosts.length, 'out of', postsData.length);
        
        setRecentPosts((prev) => [...prev, ...newPosts]);
      }

        // Handle pagination safely
        if (response.data.pagination) {
          setHasMore(pageNum < (response.data.pagination.totalPages || 0));
        } else {
          // If no pagination in response, assume no more posts
          setHasMore(postsData.length > 0);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = () => {
    setPage((prev) => prev + 1);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      setDeletingId(postId);
      await blogAPI.deleteAdminPost(postId);
      setRecentPosts((prev) => prev.filter((p) => p.id !== postId));
      // Update stats
      setStats(prev => ({
        ...prev,
        totalPosts: prev.totalPosts - 1
      }));
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <Link
            to="/admin/posts/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Post</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            icon={<FileText className="w-6 h-6 text-blue-600" />} 
            label="Total Posts" 
            value={stats.totalPosts} 
            bg="bg-blue-100" 
          />
          <StatCard 
            icon={<Folder className="w-6 h-6 text-green-600" />} 
            label="Categories" 
            value={stats.totalCategories} 
            bg="bg-green-100" 
          />
          <StatCard 
            icon={<MessageSquare className="w-6 h-6 text-purple-600" />} 
            label="Comments" 
            value={stats.totalComments} 
            bg="bg-purple-100" 
          />
        </div>

        {/* Recent Posts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Posts</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentPosts.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No posts found
              </div>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{post.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {post.category_name || 'Uncategorized'} • {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      post.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {post.status || 'draft'}
                    </span>
                    <Link
                      to={`/admin/posts/edit/${post.id}`}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </Link>
                    <a
                      href={`/post/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deletingId === post.id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Load More Button */}
          {hasMore && recentPosts.length > 0 && (
            <div className="px-6 py-4 text-center">
              <button
                onClick={loadMorePosts}
                className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More Posts'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** ---------------- SMALL REUSABLE STAT CARD ---------------- */
const StatCard = ({ icon, label, value, bg }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className={`p-3 rounded-lg ${bg}`}>{icon}</div>
      <div className="ml-4">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

export default AdminDashboard;