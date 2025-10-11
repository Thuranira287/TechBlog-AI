import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Layout
import Layout from "./components/Layout";

// Pages
import HomePage from "./pages/HomePage";
import PostPage from "./pages/PostPage";
import CategoryPage from "./pages/CategoryPage";
import SearchPage from "./pages/SearchPage";
import PolicyPage from "./pages/PolicyPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import PostEditor from './pages/admin/PostEditor';

// Context
import { BlogProvider } from "./context/BlogContext";

function App() {
  return (
    <HelmetProvider>
      <BlogProvider>
        <Router
        future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
        >
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/post/:slug" element={<PostPage />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/policy/:type" element={<PolicyPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/posts/new" element={<PostEditor />} />
              <Route path="/admin/posts/edit/:id" element={<PostEditor />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </Router>
      </BlogProvider>
    </HelmetProvider>
  );
}

export default App;
