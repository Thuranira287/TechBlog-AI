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
   LTR Textarea — immune to RTL inheritance from any ancestor.

   Why the bug only hits the REPLY textarea (not the main one):
   ─────────────────────────────────────────────────────────────
   The reply textarea mounts DYNAMICALLY after a button click.
   At that exact moment the browser walks up the DOM tree to
   resolve the initial caret direction. If ANY ancestor
   (html, body, a layout wrapper) has dir="rtl" — even set
   by a third-party script or CSS — the dynamically-mounted
   textarea inherits RTL and types backwards.

   The main textarea is immune because it is server/build-time
   rendered before those scripts run, so the browser never
   re-evaluates its inherited direction.

   Fix strategy (three layers):
   1. setAttribute('dir','ltr') — the HTML *attribute* (not just
      the style property) breaks CSS cascade inheritance.
   2. All relevant style properties set directly on the DOM node
      so they cannot be overridden by any stylesheet.
   3. A MutationObserver watches for any external script that tries
      to flip the attribute back, and immediately reverts it.
----------------------------- */
const LTRTextarea = React.forwardRef(
  ({ value, onChange, onKeyDown, placeholder, rows = 4, className = '', autoFocus = false, ...rest }, ref) => {
    const internalRef = useRef(null);
    const resolvedRef = ref || internalRef;

    useEffect(() => {
      const el = resolvedRef.current;
      if (!el) return;

      // Set the HTML dir attribute directly on the DOM node.
      // This is what actually breaks RTL inheritance from ancestors
      // (html[dir="rtl"] or body[dir="rtl"]).
      // We must NOT also watch 'style' in the MutationObserver — doing so
      // causes an infinite loop: setProperty triggers the observer which
      // calls setProperty again, freezing the textarea.
      el.setAttribute('dir', 'ltr');

      // Only guard against external scripts flipping the dir attribute
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.attributeName === 'dir' && el.getAttribute('dir') !== 'ltr') {
            el.setAttribute('dir', 'ltr');
          }
        });
      });
      observer.observe(el, { attributes: true, attributeFilter: ['dir'] });

      if (autoFocus) {
        const t = setTimeout(() => {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }, 0);
        return () => {
          clearTimeout(t);
          observer.disconnect();
        };
      }

      return () => observer.disconnect();
    }, [autoFocus, resolvedRef]);

    return (
      <textarea
        ref={resolvedRef}
        rows={rows}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        dir="ltr"
        lang="en"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className={className}
        style={{
          direction:   'ltr',
          textAlign:   'left',
          unicodeBidi: 'isolate',
          writingMode: 'horizontal-tb',
        }}
        {...rest}
      />
    );
  }
);
LTRTextarea.displayName = 'LTRTextarea';

/* -----------------------------
   Component
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

  const organizeComments = (flatComments) => {
    const commentMap = new Map();
    const rootComments = [];

    flatComments.forEach((comment) => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

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

    rootComments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    rootComments.forEach((comment) => {
      if (comment.replies.length > 0) {
        comment.replies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
    });

    return rootComments;
  };

  /* -----------------------------
     Reactions
  ----------------------------- */

  const handleReaction = async (commentId, type) => {
    if (reacting === commentId) return;
    setReacting(commentId);

    try {
      const userEmail =
        formData.author_email || localStorage.getItem('comment_email');
      if (!userEmail) {
        alert('Please enter your email in the comment form before reacting');
        setReacting(null);
        return;
      }

      if (formData.author_email && !localStorage.getItem('comment_email')) {
        localStorage.setItem('comment_email', formData.author_email);
      }

      updateCommentReaction(commentId, type);
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
            if (type === 'like') newLikes = currentLikes + 1;
            else newDislikes = currentDislikes + 1;
          }

          return {
            ...comment,
            likes: newLikes,
            dislikes: newDislikes,
            userReaction: newUserReaction,
          };
        }

        if (comment.replies && comment.replies.length > 0) {
          return { ...comment, replies: updateCommentTree(comment.replies) };
        }

        return comment;
      });
    };

    setComments((prevComments) => updateCommentTree(prevComments));
  };

  /* -----------------------------
     Submit
  ----------------------------- */

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

  /* -----------------------------
     Delete
  ----------------------------- */

  const deleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await blogAPI.deleteComment(commentId);
      fetchComments();
      alert('Comment deleted successfully');
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment');
    }
  };

  /* -----------------------------
     Helpers
  ----------------------------- */

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /* -----------------------------
     CommentItem
  ----------------------------- */

  const CommentItem = ({ comment, depth = 0, isReply = false }) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const userReaction = comment.userReaction;
    const isReplying = replyingTo?.id === comment.id;

    return (
      <div
        className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-200' : ''}`}
        dir="ltr"
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
                    {comment.author_name.replace(/\b\w/g, (c) => c.toUpperCase())}
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
              <span className="min-w-[20px] text-center">{comment.likes || 0}</span>
            </button>

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
              <span className="min-w-[20px] text-center">{comment.dislikes || 0}</span>
            </button>

            <button
              onClick={() => {
                if (!hasIdentity) {
                  alert('Please enter your name and email before replying');
                  return;
                }
                setReplyingTo({ id: comment.id, name: comment.author_name });
                setReplyContent('');
              }}
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
              disabled={reacting === comment.id}
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>

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

          {/* ── Reply Form ─────────────────────────────────────────────
              Key fix: We use the LTRTextarea component and key it to
              `comment.id` so React always mounts a fresh element when
              a different comment is being replied to. A fresh mount
              means the browser has zero chance to inherit a stale RTL
              direction from a previous instance.
          ──────────────────────────────────────────────────────────── */}
          {isReplying && (
            <div className="mt-3" dir="ltr" style={{ direction: 'ltr' }}>
              <p className="text-xs text-gray-500 mb-1">
                Replying to{' '}
                <span className="font-semibold">@{replyingTo.name}</span>
              </p>
              <LTRTextarea
                key={`reply-textarea-${comment.id}`}
                rows={2}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
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

          {comment.deleted && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>This comment has been deleted by an admin.</span>
            </div>
          )}
        </div>

        {/* Render Replies */}
        {hasReplies && !collapsed[comment.id] && (
          <div className="mt-2" dir="ltr" style={{ direction: 'ltr' }}>
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

  /* -----------------------------
     Main Render
  ----------------------------- */

  const totalCommentCount = comments.reduce(
    (acc, comment) => acc + 1 + (comment.replies ? comment.replies.length : 0),
    0
  );

  return (
    <section className="mt-12" dir="ltr" style={{ direction: 'ltr' }}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Comments ({totalCommentCount})
      </h2>

      {/* Comment Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-50 p-6 rounded-lg mb-8"
        dir="ltr"
        style={{ direction: 'ltr' }}
      >
        <h3 className="text-lg font-semibold mb-4">Leave a Comment</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Your Name *"
            value={formData.author_name}
            onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            dir="ltr"
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
          <input
            type="email"
            placeholder="Your Email *"
            value={formData.author_email}
            onChange={(e) => setFormData({ ...formData, author_email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            dir="ltr"
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
        </div>

        {/* Main comment textarea also uses LTRTextarea for consistency */}
        <LTRTextarea
          rows={4}
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Your Comment *"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
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