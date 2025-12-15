import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { blogAPI } from "../../api/client";
import {
  Plus,
  FileText,
  Folder,
  MessageSquare,
  Eye,
  Trash2,
} from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalCategories: 0,
    totalComments: 0,
  });
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1); // for optional pagination
  const [hasMore, setHasMore] = useState(true);

  /** ---------------- FETCH DASHBOARD DATA ---------------- */
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const { data } = await blogAPI.getAdminDashboard({ page: 1, limit: 1000 });

      if (!data?.posts || !Array.isArray(data.posts)) {
        throw new Error("Invalid posts data from server");
      }

      setStats(data.stats ?? stats);
      setRecentPosts(Array.isArray(data.posts) ? data.posts : []);
      setHasMore(data.posts.length >= 1000); // backend limit
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setError(
        err.response?.data?.error ||
        err.message ||
        "Failed to fetch dashboard data"
      );
      setRecentPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /** ---------------- DELETE POST ---------------- */
  const handleDeletePost = async (postId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this post?"
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(postId);
      await blogAPI.deletePost(postId);

      // Optimistic UI update
      setRecentPosts((prev) => prev.filter((p) => p.id !== postId));
      setStats((prev) => ({
        ...prev,
        totalPosts: Math.max(prev.totalPosts - 1, 0),
      }));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete post");
    } finally {
      setDeletingId(null);
    }
  };

  /** ---------------- LOAD MORE POSTS (OPTIONAL) ---------------- */
  const loadMorePosts = async () => {
    try {
      const nextPage = page + 1;
      const { data } = await blogAPI.getAdminPosts(nextPage);

      if (data.posts.length === 0) {
        setHasMore(false);
        return;
      }

      setRecentPosts((prev) => [...prev, ...data.posts]);
      setPage(nextPage);
    } catch (err) {
      console.error("Load more failed:", err);
      alert("Failed to load more posts");
    }
  };

  /** ---------------- LOADING OR ERROR STATE ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  /** ---------------- DASHBOARD UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <Link
            to="/admin/posts/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Post
          </Link>
        </div>

        {/* STATS */}
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

        {/* RECENT POSTS */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">Recent Posts</h2>
          </div>

          <div className="divide-y">
            {recentPosts.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No recent posts available
              </div>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {post.category_name} •{" "}
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          post.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {post.status}
                      </span>

                      <Link
                        to={`/admin/posts/edit/${post.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm"
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
                </div>
              ))
            )}
          </div>

          {/* Load More Button */}
          {hasMore && recentPosts.length > 0 && (
            <div className="px-6 py-4 text-center">
              <button
                onClick={loadMorePosts}
                className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Load More Posts
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
