import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/ContextAuth';

const FloatingAdminButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;
  
  const handleLogout = async() => {
    logout();
    setIsOpen(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Link
          to="/admin/login"
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          title="Admin Login"
        >
          <Settings className="w-6 h-6" />
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 right-6 z-50">
      {/* Main Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        title="Admin Menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Settings className="w-2 h-2" />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-48">
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">Hello, {user.username}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          
          <div className="p-2">
            <Link
              to="/admin/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            
            <Link
              to="/admin/posts/new"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <span>New Post</span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default FloatingAdminButton;
