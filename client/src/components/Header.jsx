import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Menu, X, Lock, User, LogOut } from 'lucide-react'
import { useBlog } from '../context/BlogContext'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { categories } = useBlog()
  const navigate = useNavigate()

  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('authToken')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Secret trigger - show admin after 3 quick clicks on logo
  const [clickCount, setClickCount] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [showAdmin, setShowAdmin] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`)
      setSearchTerm('')
      setIsMenuOpen(false)
    }
  }

  const handleLogoClick = (e) => {
    e.preventDefault()
    const currentTime = new Date().getTime()
    
    if (currentTime - lastClickTime < 1000) { // Within 1 second
      const newCount = clickCount + 1
      setClickCount(newCount)
      
      if (newCount >= 3) {
        setShowAdmin(true)
        setClickCount(0)
        // Show admin for 30 seconds
        setTimeout(() => setShowAdmin(false), 30000)
      }
    } else {
      setClickCount(1)
    }
    
    setLastClickTime(currentTime)
    navigate('/') // Navigate to home after secret trigger
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setShowAdmin(false)
    window.location.href = '/'
  }

  const handleAdminAccess = () => {
    if (isLoggedIn) {
      navigate('/admin/dashboard')
    } else {
      navigate('/admin/login')
    }
    setIsMenuOpen(false)
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4">
          {/* Logo with secret click trigger */}
          <Link 
            to="/" 
            className="flex items-center space-x-2"
            onClick={handleLogoClick}
            title={clickCount > 0 ? `${3 - clickCount} more clicks for admin` : 'TechBlog AI'}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TB</span>
            </div>
            <span className="text-xl font-bold text-gray-900">TechBlog AI</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">
              Home
            </Link>
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                {category.name}
              </Link>
            ))}
            
            {/* Hidden Admin Access - Only shows after secret trigger or when logged in */}
            {(showAdmin || isLoggedIn) && (
              <div className="flex items-center space-x-4 border-l border-gray-300 pl-4">
                {isLoggedIn ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1"
                    >
                      <User className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/admin/login"
                    className="text-gray-700 hover:text-blue-600 font-medium flex items-center space-x-1"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
              </div>
            )}
          </nav>

          {/* Search and Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="hidden sm:flex">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </form>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </form>

            {/* Mobile Navigation */}
            <nav className="space-y-2">
              <Link
                to="/"
                className="block py-2 text-gray-700 hover:text-blue-600 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="block py-2 text-gray-700 hover:text-blue-600 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
              
              {/* Hidden Mobile Admin Access */}
              {(showAdmin || isLoggedIn) && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  {isLoggedIn ? (
                    <>
                      <Link
                        to="/admin/dashboard"
                        className="block py-2 text-gray-700 hover:text-blue-600 font-medium items-center space-x-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout()
                          setIsMenuOpen(false)
                        }}
                        className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/admin/login"
                      className="block py-2 text-gray-700 hover:text-blue-600 font-medium items-center space-x-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Lock className="w-4 h-4" />
                      <span>Admin Login</span>
                    </Link>
                  )}
                </div>
              )}
            </nav>
          </div>
        )}

        {/* Secret Access Indicator */}
        {clickCount > 0 && !showAdmin && (
          <div className="fixed top-20 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-1 rounded text-sm z-50">
            {3 - clickCount} more clicks for admin access
          </div>
        )}

        {/* Admin Access Timer */}
        {showAdmin && (
          <div className="fixed top-20 right-4 bg-green-100 border border-green-400 text-green-800 px-3 py-1 rounded text-sm z-50">
            Admin access active - 30s remaining
          </div>
        )}
      </div>
    </header>
  )
}

export default Header