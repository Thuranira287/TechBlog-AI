import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogAPI } from '../../api/client';
import { 
  Plus, FileText, Folder, MessageSquare, Eye, Trash2, 
  Users, CheckCircle, XCircle, MessageCircle, RefreshCw 
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalCategories: 0,
    totalComments: 0,
    pendingComments: 0
  });
  const [recentPosts, setRecentPosts] = useState([]);
  const [recentComments, setRecentComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [moderatingCommentId, setModeratingCommentId] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData(page);
    fetchRecentComments();
  }, [page]);

  const fetchDashboardData = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await blogAPI.getAdminDashboard({ page: pageNum, limit: 50 });
      
      console.log('Dashboard Response:', response.data);
      
      if (response.data) {
        setStats(response.data.stats || {
          totalPosts: 0,
          totalCategories: 0,
          totalComments: 0,
          pendingComments: 0
        });
        
        const postsData = response.data.posts || [];
        
        if (pageNum === 1) {
          setRecentPosts(postsData);
        } else {
          const existingIds = new Set(recentPosts.map(p => p.id));
          const newPosts = postsData.filter(post => !existingIds.has(post.id));
          setRecentPosts((prev) => [...prev, ...newPosts]);
        }

        if (response.data.pagination) {
          setHasMore(pageNum < (response.data.pagination.totalPages || 0));
        } else {
          setHasMore(postsData.length > 0);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError({
        message: 'Failed to load dashboard data',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentComments = async () => {
    try {
      setCommentsLoading(true);
      //const response = await blogAPI.get('/api/comments');
      const response = await blogAPI.getAdminComments();

      if (response.data) {
        setRecentComments(response.data.slice(0, 5)); // Show only 5 most recent
        
        // Update stats with pending comments count
        const pendingCount = response.data.filter(comment => 
          !comment.approved && (!comment.status || comment.status === 'pending')
        ).length;
        
        setStats(prev => ({
          ...prev,
          pendingComments: pendingCount,
          totalComments: response.data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
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
      setStats(prev => ({
        ...prev,
        totalPosts: prev.totalPosts - 1
      }));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleApproveComment = async (commentId) => {
    try {
      setModeratingCommentId(commentId);
      await blogAPI.updateAdminComment(commentId,
        { approved: 1,
          status: 'approved'
         });
      
      // Update local state
      setRecentComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, approved: 1, status: 'approved' }
            : comment
        )
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        pendingComments: Math.max(0, prev.pendingComments - 1)
      }));
      
    } catch (error) {
      console.error('Error approving comment:', error);
      alert('Failed to approve comment: ' + error.message);
    } finally {
      setModeratingCommentId(null);
    }
  };

  const handleRejectComment = async (commentId) => {
    try {
      setModeratingCommentId(commentId);
      await blogAPI.deleteAdminComment(commentId);
      
      // Remove from local state
      setRecentComments(prev => prev.filter(comment => comment.id !== commentId));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalComments: Math.max(0, prev.totalComments - 1),
        pendingComments: Math.max(0, prev.pendingComments - 1)
      }));
      
    } catch (error) {
      console.error('Error rejecting comment:', error);
      alert('Failed to reject comment: ' + error.message);
    } finally {
      setModeratingCommentId(null);
    }
  };

  const handleRefreshComments = () => {
    fetchRecentComments();
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-600 animate-pulse">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome to your admin dashboard</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => fetchDashboardData(1)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center space-x-2"
              title="Refresh dashboard"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <Link
              to="/admin/posts/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Post</span>
            </Link>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error.message}</p>
                <button
                  onClick={() => fetchDashboardData(1)}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            label="Total Comments" 
            value={stats.totalComments} 
            bg="bg-purple-100" 
          />
          <StatCard 
            icon={<Users className="w-6 h-6 text-yellow-600" />} 
            label="Pending Comments" 
            value={stats.pendingComments} 
            bg="bg-yellow-100" 
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Posts */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Posts</h2>
              <Link
                to="/admin/posts"
                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
              {recentPosts.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No posts found
                </div>
              ) : (
                recentPosts.map((post) => (
                  <div key={post.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate" title={post.title}>
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {post.category_name || 'Uncategorized'} • {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 flex-shrink-0">
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
                        title="Edit post"
                      >
                        Edit
                      </Link>
                      <a
                        href={`/post/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900"
                        title="View post"
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
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <button
                  onClick={loadMorePosts}
                  className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More Posts'}
                </button>
              </div>
            )}
          </div>

          {/* Recent Comments */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Comments</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefreshComments}
                  disabled={commentsLoading}
                  className="text-gray-600 hover:text-gray-900"
                  title="Refresh comments"
                >
                  <RefreshCw className={`w-4 h-4 ${commentsLoading ? 'animate-spin' : ''}`} />
                </button>
                <Link
                  to="/admin/comments"
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
              {commentsLoading ? (
                <div className="px-6 py-8 text-center">
                  <div className="text-gray-600 animate-pulse">Loading comments...</div>
                </div>
              ) : recentComments.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No comments yet
                </div>
              ) : (
                recentComments.map((comment) => (
                  <div key={comment.id} className="px-6 py-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {comment.author_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {comment.author_email}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                        comment.approved || comment.status === 'approved' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {comment.approved || comment.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {comment.content}
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">
                        On: <span className="font-medium">{comment.post_title || `Post #${comment.post_id}`}</span>
                      </p>
                      {!(comment.approved || comment.status === 'approved') && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveComment(comment.id)}
                            disabled={moderatingCommentId === comment.id}
                            className="text-green-600 hover:text-green-800 disabled:opacity-80 flex items-center space-x-1 text-xs"
                            title="Approve comment"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectComment(comment.id)}
                            disabled={moderatingCommentId === comment.id}
                            className="text-red-600 hover:text-red-800 disabled:opacity-80 flex items-center space-x-1 text-xs"
                            title="Reject comment"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** ---------------- SMALL REUSABLE STAT CARD ---------------- */
const StatCard = ({ icon, label, value, bg }) => {
  // Ensure value is a valid number
  const displayValue = isNaN(value) || value === undefined || value === null ? 0 : value;
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${bg}`}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">
            {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;