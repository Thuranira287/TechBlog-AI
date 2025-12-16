import React from 'react';

const AdminFooter = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 mt-8">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>© {currentYear} TechBlog AI Admin Panel. All rights reserved.</p>
            <p className="text-xs text-gray-500 mt-1">
              Version 1.0.0 • Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <a 
                href="/admin/dashboard" 
                className="hover:text-blue-600 transition-colors"
              >
                Dashboard
              </a>
              <a 
                href="/admin/posts" 
                className="hover:text-blue-600 transition-colors"
              >
                Posts
              </a>
              <a 
                href="/admin/comments" 
                className="hover:text-blue-600 transition-colors"
              >
                Comments
              </a>
              <a 
                href="/admin/categories" 
                className="hover:text-blue-600 transition-colors"
              >
                Categories
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AdminFooter;