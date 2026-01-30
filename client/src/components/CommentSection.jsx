import React, { useState, useEffect, useRef } from 'react';
import { blogAPI } from '../api/client';
import {
  Send,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  Trash2,
  CheckCircle,
  Reply,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* -----------------------------
   Helpers
----------------------------- */

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-green-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-indigo-600',
  'bg-red-600',
  'bg-yellow-500',
];

const getAvatarColor = (name = '') => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const isAdmin = (email) => {
  const ADMINS = ['admin@blog.com'];
  return ADMINS.includes(email);
};

/* -----------------------------
   Component: Organize flat array into hierarchy
----------------------------- */

const CommentSection = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reacting, setReacting] = useState(null);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const [formData, setFormData] = useState({
    author_name: '',
    author_email: '',
    content: '',
  });

  // Check if user has entered name and email
  const hasIdentity =
    formData.author_name.trim() && formData.author_email.trim();

  useEffect(() => {
    fetchComments();
  }, [postId]);

  /* -----------------------------
     Fetch Comments
  ----------------------------- */

  const fetchComments = async () => {
  try {
    setLoading(true);

    const res = await blogAPI.getComments(postId);

    if (Array.isArray(res.data)) {
      setComments(organizeComments(res.data));
    } else {
      setComments([]);
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching comments:', err);
      console.error('Response:', err?.response?.data);
      console.error('Status:', err?.response?.status);
    }
  } finally {
    setLoading(false);
  }
};


  // Function to organize flat comments array into hierarchy
  const organizeComments = (flatComments) => {
    const commentMap = new Map();
    const rootComments = [];

    // First pass: Create map and add replies array
    flatComments.forEach((comment) => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    // Second pass: Build hierarchy
    flatComments.forEach((comment) => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(comment);
        } else {
          rootComments.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });
    rootComments.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    rootComments.forEach((comment) => {
      if (comment.replies.length > 0) {
        comment.replies.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      }
    });

    return rootComments;
  };

// Reactions
  const handleReaction = async (commentId, type) => {
    if (reacting === commentId) return;
    setReacting(commentId);

    try {
      // Get user email
      const userEmail =
        formData.author_email || localStorage.getItem('comment_email');
      if (!userEmail) {
        alert('Please enter your email in the comment form before reacting');
        setReacting(null);
        return;
      }

      // Save email for future use
      if (formData.author_email && !localStorage.getItem('comment_email')) {
        localStorage.setItem('comment_email', formData.author_email);
      }

      // Optimistic update
      updateCommentReaction(commentId, type);

      // Send to backend
      await blogAPI.reactToComment(commentId, type);
    } catch (err) {
      console.error('Error reacting to comment:', err);
      fetchComments();
      alert('Failed to save reaction. Please try again.');
    } finally {
      setReacting(null);
    }
  };

  const updateCommentReaction = (commentId, type) => {
    const updateCommentTree = (commentList) => {
      return commentList.map((comment) => {
        if (comment.id === commentId) {
          const currentLikes = comment.likes || 0;
          const currentDislikes = comment.dislikes || 0;
          const userReaction = comment.userReaction;

          let newLikes = currentLikes;
          let newDislikes = currentDislikes;
          let newUserReaction = type;

          // Toggle logic
          if (userReaction === 'like' && type === 'like') {
            newLikes = Math.max(0, currentLikes - 1);
            newUserReaction = null;
          } else if (userReaction === 'dislike' && type === 'dislike') {
            newDislikes = Math.max(0, currentDislikes - 1);
            newUserReaction = null;
          } else if (userReaction === 'like' && type === 'dislike') {
            newLikes = Math.max(0, currentLikes - 1);
            newDislikes = currentDislikes + 1;
          } else if (userReaction === 'dislike' && type === 'like') {
            newDislikes = Math.max(0, currentDislikes - 1);
            newLikes = currentLikes + 1;
          } else {
            if (type === 'like') {
              newLikes = currentLikes + 1;
            } else {
              newDislikes = currentDislikes + 1;
            }
          }

          return {
            ...comment,
            likes: newLikes,
            dislikes: newDislikes,
            userReaction: newUserReaction,
          };
        }

        // Check replies recursively
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentTree(comment.replies),
          };
        }

        return comment;
      });
    };

    setComments((prevComments) => updateCommentTree(prevComments));
  };

//Submit Comment / Reply
  const submitComment = async (payload) => {
    if (!payload.content.trim()) {
      alert('Please enter your comment');
      return false;
    }

    try {
      await blogAPI.createComment(payload);
      fetchComments();
      return true;
    } catch (err) {
      alert('Error submitting comment. Please try again.');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const success = await submitComment({
      post_id: postId,
      ...formData,
    });

    if (success) {
      setFormData({ author_name: '', author_email: '', content: '' });
    }

    setSubmitting(false);
  };

  const handleReplySubmit = async (parentId) => {
    if (!replyContent.trim()) {
      alert('Please enter your reply');
      return;
    }

    setSubmitting(true);
    const success = await submitComment({
      post_id: postId,
      parent_id: parentId,
      content: replyContent,
      author_name: formData.author_name,
      author_email: formData.author_email,
    });

    if (success) {
      setReplyingTo(null);
      setReplyContent('');
    }
    setSubmitting(false);
  };

// Delete Comment (Admin only)
  const deleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await blogAPI.deleteComment(commentId);
      fetchComments();
      alert('Comment deleted successfully');
    } catch (err) {
      console.error(' Error deleting comment:', err);
      alert('Failed to delete comment');
    }
  };

//Format Date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

//Render Comment with Replies
  const CommentItem = ({ comment, depth = 0, isReply = false }) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const userReaction = comment.userReaction;
    const isReplying = replyingTo?.id === comment.id;
    const textareaRef = useRef(null);

    // RTL textarea
    useEffect(() => {
      if (isReplying && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.setAttribute('dir', 'ltr');
        textarea.style.direction = 'ltr';
        textarea.style.textAlign = 'left';
        textarea.style.unicodeBidi = 'plaintext';
        textarea.style.removeProperty('rtl');
        textarea.style.removeProperty('right');
        textarea.style.transform = 'translateZ(0)';
        textarea.style.backfaceVisibility = 'hidden';
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(0, 0);
        }, 10);
        textarea.offsetHeight;
      }
    }, [isReplying]);

    return (
      <div
        className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-200' : ''}`}
        style={{ direction: 'ltr' }} 
      >
        {/* Comment Card */}
        <div
          className={`bg-white rounded-lg p-4 mt-3 ${
            isReply ? 'bg-gray-50' : 'border border-gray-200'
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-semibold uppercase ${getAvatarColor(
                  comment.author_name
                )}`}
              >
                {comment.author_name.charAt(0)}
              </div>

              <div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900">
                    {comment.author_name.replace(/\b\w/g, (c) =>
                      c.toUpperCase()
                    )}
                  </span>

                  {isAdmin(comment.author_email) && (
                    <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3 h-3" />
                      Admin
                    </span>
                  )}

                  {comment.author_email === formData.author_email && (
                    <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      <CheckCircle className="w-3 h-3" />
                      You
                    </span>
                  )}
                </div>

                <time className="text-xs text-gray-500">
                  {formatDate(comment.created_at)}
                </time>
              </div>
            </div>

            {isAdmin(formData.author_email) && (
              <button
                onClick={() => deleteComment(comment.id)}
                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                title="Delete comment"
                disabled={reacting === comment.id}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Content */}
          <p className="text-gray-700 mb-3" dir="ltr">
            {comment.content}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {/* Like Button */}
            <button
              onClick={() => handleReaction(comment.id, 'like')}
              className={`flex items-center gap-1 transition-colors ${
                userReaction === 'like'
                  ? 'text-blue-600 font-semibold'
                  : 'hover:text-blue-600'
              }`}
              disabled={reacting === comment.id}
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="min-w-[20px] text-center">
                {comment.likes || 0}
              </span>
            </button>

            {/* Dislike Button */}
            <button
              onClick={() => handleReaction(comment.id, 'dislike')}
              className={`flex items-center gap-1 transition-colors ${
                userReaction === 'dislike'
                  ? 'text-red-600 font-semibold'
                  : 'hover:text-red-600'
              }`}
              disabled={reacting === comment.id}
            >
              <ThumbsDown className="w-4 h-4" />
              <span className="min-w-[20px] text-center">
                {comment.dislikes || 0}
              </span>
            </button>

            {/* Reply Button */}
            <button
              onClick={() => {
                if (!hasIdentity) {
                  alert('Please enter your name and email before replying');
                  return;
                }
                setReplyingTo({ id: comment.id, name: comment.author_name });
              }}
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
              disabled={reacting === comment.id}
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>

            {/* Show/Hide Replies Toggle */}
            {hasReplies && (
              <button
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [comment.id]: !prev[comment.id],
                  }))
                }
                className="flex items-center gap-1 hover:text-gray-800 transition-colors"
              >
                {collapsed[comment.id] ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>
                      Show {comment.replies.length}{' '}
                      {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Hide replies</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3" style={{ direction: 'ltr' }}>
              <p className="text-xs text-gray-500 mb-1">
                Replying to{' '}
                <span className="font-semibold">@{replyingTo.name}</span>
              </p>
              <textarea
                ref={textareaRef}
                rows="2"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{
                  direction: 'ltr',
                  textAlign: 'left',
                  unicodeBidi: 'plaintext',
                  transform: 'translateZ(0)',
                }}
                autoFocus
                dir="ltr"
                lang="en"
                translate="no"
                spellCheck="false"
                data-ltr="true"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleReplySubmit(comment.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Admin Notice for Deleted Comments */}
          {comment.deleted && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>This comment has been deleted by an admin.</span>
            </div>
          )}
        </div>

        {/* Render Replies */}
        {hasReplies && !collapsed[comment.id] && (
          <div className="mt-2" style={{ direction: 'ltr' }}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                isReply={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

// Main Render
  const totalCommentCount = comments.reduce(
    (acc, comment) => acc + 1 + (comment.replies ? comment.replies.length : 0),
    0
  );

  return (
    <section className="mt-12" style={{ direction: 'ltr' }}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Comments ({totalCommentCount})
      </h2>

      {/* Comment Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-50 p-6 rounded-lg mb-8"
        style={{ direction: 'ltr' }}
      >
        <h3 className="text-lg font-semibold mb-4">Leave a Comment</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Your Name *"
            value={formData.author_name}
            onChange={(e) =>
              setFormData({ ...formData, author_name: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            dir="ltr"
          />
          <input
            type="email"
            placeholder="Your Email *"
            value={formData.author_email}
            onChange={(e) =>
              setFormData({ ...formData, author_email: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            dir="ltr"
          />
        </div>

        <textarea
          placeholder="Your Comment *"
          rows="4"
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          required
          dir="ltr"
          style={{ direction: 'ltr', textAlign: 'left' }}
        />

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>{submitting ? 'Submitting...' : 'Submit Comment'}</span>
        </button>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 mr-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                  <div className="h-2 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-lg">
          No comments yet. Be the first to comment!
        </p>
      )}
    </section>
  );
};

export default CommentSection;