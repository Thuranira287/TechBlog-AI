import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogAPI } from '../../api/client';
import { 
  CheckCircle, XCircle, Trash2, Eye, Search, 
  Filter, RefreshCw, MessageSquare, ChevronLeft, ChevronRight,
  User, Mail, Calendar, FileText
} from 'lucide-react';

const CommentsPage = () => {
  const [comments, setComments] = useState([]);
  const [filteredComments, setFilteredComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moderatingId, setModeratingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);
  const [error, setError] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [currentPage]);

  useEffect(() => {
    filterComments();
  }, [comments, searchTerm, filter]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await blogAPI.getAdminComments();
      
      if (response.data) {
        setComments(response.data);
        setTotalPages(Math.ceil(response.data.length / itemsPerPage));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError({
        message: 'Failed to load comments',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const filterComments = () => {
    let filtered = [...comments];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(comment => 
        comment.author_name?.toLowerCase().includes(term) ||
        comment.author_email?.toLowerCase().includes(term) ||
        comment.content?.toLowerCase().includes(term) ||
        comment.post_title?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filter === 'pending') {
      filtered = filtered.filter(comment => 
        !comment.approved && (!comment.status || comment.status === 'pending')
      );
    } else if (filter === 'approved') {
      filtered = filtered.filter(comment => 
        comment.approved || comment.status === 'approved'
      );
    } else if (filter === 'rejected') {
      filtered = filtered.filter(comment => 
        comment.status === 'rejected' || comment.status === 'spam'
      );
    }

    setFilteredComments(filtered);
  };

  // Bulk approve all pending comments
  const handleBulkApprove = async () => {
    const pendingComments = comments
      .filter(c => !c.approved && (!c.status || c.status === 'pending'));
    
    if (pendingComments.length === 0) {
      alert('No pending comments to approve');
      return;
    }
    
    if (!window.confirm(`Approve ${pendingComments.length} pending comments?`)) {
      return;
    }
    
    try {
      setBulkProcessing(true);
      let successCount = 0;
      let failCount = 0;
      
      // Approve each comment one by one
      for (const comment of pendingComments.slice(0, 50)) { // Limit to 50 to avoid overwhelming
        try {
          await blogAPI.updateAdminComment(comment.id, { 
            approved: 1,
            status: 'approved'
          });
          successCount++;
          console.log(`Approved comment ${comment.id}`);
        } catch (error) {
          failCount++;
          console.error(`Failed to approve comment ${comment.id}:`, error);
        }
      }
      
      // Refresh comments after bulk operation
      await fetchComments();
      
      if (failCount > 0) {
        alert(`Approved ${successCount} comments. Failed to approve ${failCount} comments.`);
      } else {
        alert(`Successfully approved ${successCount} comments`);
      }
      
    } catch (error) {
      console.error('Error in bulk approve:', error);
      alert('Failed to approve comments: ' + error.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk delete all spam comments
  const handleBulkDeleteSpam = async () => {
    const spamComments = comments
      .filter(c => c.status === 'spam' || c.status === 'rejected');
    
    if (spamComments.length === 0) {
      alert('No spam comments to delete');
      return;
    }
    
    if (!window.confirm(`Delete ${spamComments.length} spam/rejected comments? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setBulkProcessing(true);
      let successCount = 0;
      let failCount = 0;
      
      // Delete each comment one by one
      for (const comment of spamComments.slice(0, 50)) { // Limit to 50
        try {
          await blogAPI.deleteAdminComment(comment.id);
          successCount++;
          console.log(`Deleted spam comment ${comment.id}`);
        } catch (error) {
          failCount++;
          console.error(`Failed to delete comment ${comment.id}:`, error);
        }
      }
      
      // Refresh comments after bulk operation
      await fetchComments();
      
      if (failCount > 0) {
        alert(`Deleted ${successCount} comments. Failed to delete ${failCount} comments.`);
      } else {
        alert(`Successfully deleted ${successCount} spam comments`);
      }
      
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Failed to delete spam comments: ' + error.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk mark as spam
  const handleBulkMarkAsSpam = async () => {
    const nonSpamComments = comments.filter(c => 
      c.status !== 'spam' && 
      c.status !== 'rejected' && 
      !c.approved
    );
    
    if (nonSpamComments.length === 0) {
      alert('No non-spam comments to mark');
      return;
    }
    
    if (!window.confirm(`Mark ${nonSpamComments.length} comments as spam?`)) {
      return;
    }
    
    try {
      setBulkProcessing(true);
      let successCount = 0;
      let failCount = 0;
      
      for (const comment of nonSpamComments.slice(0, 50)) {
        try {
          await blogAPI.updateAdminComment(comment.id, { 
            status: 'spam',
            approved: 0
          });
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to mark comment ${comment.id} as spam:`, error);
        }
      }
      
      await fetchComments();
      
      if (failCount > 0) {
        alert(`Marked ${successCount} comments as spam. Failed to mark ${failCount} comments.`);
      } else {
        alert(`Successfully marked ${successCount} comments as spam`);
      }
      
    } catch (error) {
      console.error('Error in bulk mark as spam:', error);
      alert('Failed to mark comments as spam: ' + error.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleApproveComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to approve this comment?')) return;
    
    try {
      setModeratingId(commentId);
      await blogAPI.updateAdminComment(commentId, { approved: 1, status:'approved'});
      
      // Update local state
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, approved: 1, status: 'approved' }
            : comment
        )
      );
      
    } catch (error) {
      console.error('Error approving comment:', error);
      alert('Failed to approve comment: ' + error.message);
    } finally {
      setModeratingId(null);
    }
  };

  const handleRejectComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to reject this comment?')) return;
    
    try {
      setModeratingId(commentId);
      await blogAPI.updateAdminComment(commentId, { status: 'rejected' });
      
      // Update local state
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, approved: 0, status: 'rejected' }
            : comment
        )
      );
      
    } catch (error) {
      console.error('Error rejecting comment:', error);
      alert('Failed to reject comment: ' + error.message);
    } finally {
      setModeratingId(null);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment permanently?')) return;
    
    try {
      setModeratingId(commentId);
      await blogAPI.deleteAdminComment(commentId);
      
      // Remove from local state
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment: ' + error.message);
    } finally {
      setModeratingId(null);
    }
  };

  const handleMarkAsSpam = async (commentId) => {
    if (!window.confirm('Mark this comment as spam?')) return;
    
    try {
      setModeratingId(commentId);
      await blogAPI.updateAdminComment(commentId, { status: 'spam', approved: 0 });
      
      // Update local state
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, approved: 0, status: 'spam' }
            : comment
        )
      );
      
    } catch (error) {
      console.error('Error marking as spam:', error);
      alert('Failed to mark as spam: ' + error.message);
    } finally {
      setModeratingId(null);
    }
  };

  const getStatusBadge = (comment) => {
    if (comment.status === 'spam') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
          Spam
        </span>
      );
    }
    if (comment.status === 'rejected') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
          Rejected
        </span>
      );
    }
    if (comment.approved || comment.status === 'approved') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
          Approved
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  const getPaginationData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredComments.slice(startIndex, endIndex);
  };

  const paginatedComments = getPaginationData();

  const pendingCount = comments.filter(c => !c.approved && (!c.status || c.status === 'pending')).length;
  const spamCount = comments.filter(c => c.status === 'spam' || c.status === 'rejected').length;
  const nonSpamCount = comments.filter(c => c.status !== 'spam' && c.status !== 'rejected' && !c.approved).length;

  if (loading && !bulkProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-gray-600 animate-pulse">Loading comments...</div>
          </div>
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
            <div className="flex items-center space-x-3">
              <Link to="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Comments Management</h1>
                <p className="text-gray-600 mt-1">Manage and moderate user comments</p>
              </div>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={fetchComments}
              disabled={loading || bulkProcessing}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
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
                  onClick={fetchComments}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Comments</p>
                <p className="text-2xl font-semibold text-gray-900">{comments.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {pendingCount}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-semibold text-green-600">
                  {comments.filter(c => c.approved || c.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Spam/Rejected</p>
                <p className="text-2xl font-semibold text-red-600">
                  {spamCount}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search comments by author, content, or post..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Comments</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Spam/Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Actions</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleBulkApprove}
              disabled={loading || bulkProcessing || pendingCount === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-80 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve All Pending ({pendingCount})</span>
            </button>
            
            <button
              onClick={handleBulkDeleteSpam}
              disabled={loading || bulkProcessing || spamCount === 0}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 disabled:opacity-80 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete All Spam ({spamCount})</span>
            </button>
            
            <button
              onClick={handleBulkMarkAsSpam}
              disabled={loading || bulkProcessing || nonSpamCount === 0}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center space-x-2 disabled:opacity-80 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Mark All as Spam ({nonSpamCount})</span>
            </button>
          </div>
          
          {/* Progress indicator for bulk operations */}
          {bulkProcessing && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing bulk operation... Please wait.</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                This may take a moment depending on the number of comments.
              </div>
            </div>
          )}
        </div>

        {/* Comments Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredComments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No comments found</p>
              <p className="text-gray-400 mt-2">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'No comments have been submitted yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Author & Content
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Post
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedComments.map((comment) => (
                      <tr key={comment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {comment.author_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {comment.author_email}
                              </p>
                              <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <FileText className="w-4 h-4 text-gray-400 mt-1 mr-2 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate" title={comment.post_title}>
                                {comment.post_title || `Post #${comment.post_id}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                Post ID: {comment.post_id}
                              </p>
                              <a
                                href={`/post/${comment.post_slug || comment.post_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-900 inline-flex items-center mt-1"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View Post
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-sm text-gray-900">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(comment)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {!(comment.approved || comment.status === 'approved') && (
                              <>
                                <button
                                  onClick={() => handleApproveComment(comment.id)}
                                  disabled={moderatingId === comment.id || bulkProcessing}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 p-1 rounded hover:bg-green-50 transition-colors"
                                  title="Approve comment"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleRejectComment(comment.id)}
                                  disabled={moderatingId === comment.id || bulkProcessing}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 p-1 rounded hover:bg-red-50 transition-colors"
                                  title="Reject comment"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleMarkAsSpam(comment.id)}
                              disabled={moderatingId === comment.id || bulkProcessing}
                              className="text-orange-600 hover:text-orange-900 disabled:opacity-50 p-1 rounded hover:bg-orange-50 transition-colors"
                              title="Mark as spam"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={moderatingId === comment.id || bulkProcessing}
                              className="text-gray-600 hover:text-gray-900 disabled:opacity-50 p-1 rounded hover:bg-gray-100 transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredComments.length > itemsPerPage && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || bulkProcessing}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || bulkProcessing}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * itemsPerPage, filteredComments.length)}
                          </span> of{' '}
                          <span className="font-medium">{filteredComments.length}</span> comments
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || bulkProcessing}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          
                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                disabled={bulkProcessing}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === pageNum
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                } ${bulkProcessing ? 'disabled:opacity-50' : ''}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || bulkProcessing}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentsPage;