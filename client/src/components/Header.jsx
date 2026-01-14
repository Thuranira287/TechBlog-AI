import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Menu, X, Lock, User, LogOut, ChevronDown, Briefcase } from 'lucide-react'
import { useBlog } from '../context/BlogContext'
import TechBlogAI from '../assets/TechBlogAI.jpg'

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
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [jobCount, setJobCount] = useState(0);

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
  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  const fetchJobCount = async () => {
    try {
      const response = await api.get('/jobs/public/count');
      if (response.data.success) {
        setJobCount(response.data.count);
      }
    } catch (error) {
      console.error('Error fetching job count:', error);
    }
  };

   return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 flex-shrink-0"
            onClick={handleLogoClick}
            title={clickCount > 0 ? `${3 - clickCount} more clicks for admin` : 'TechBlog AI'}
          >
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full border-2 border-blue-600 ring-2 ring-blue-100 ring-offset-1"></div>
              <img 
                src={TechBlogAI} 
                alt="TechBlog AI Logo" 
                className="w-full h-full rounded-full object-cover p-0.5"
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-gray-900 leading-tight">TechBlog</span>
              <span className="text-lg font-bold text-blue-600 leading-tight"> AI</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 flex-1 justify-center">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium text-sm px-3 py-2 rounded-lg hover:bg-blue-50">
              Home
            </Link>
            
            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                className="flex items-center text-gray-700 hover:text-blue-600 font-medium text-sm px-3 py-2 rounded-lg hover:bg-blue-50"
              >
                Articles
                <ChevronDown className={`ml-1 w-4 h-4 transition-transform ${isCategoriesOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isCategoriesOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50"
                  onMouseLeave={() => setIsCategoriesOpen(false)}
                >
                  {categories.slice(0, 8).map((category) => (
                    <Link
                      key={category.id}
                      to={`/category/${category.slug}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => setIsCategoriesOpen(false)}
                    >
                      {category.name}
                    </Link>
                  ))}
                  <div className="border-t mt-2 pt-2">
                    <Link
                      to="/categories"
                      className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
                      onClick={() => setIsCategoriesOpen(false)}
                    >
                      View all categories →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link to="/jobs" className="flex items-center text-gray-700 hover:text-blue-600 font-medium text-sm px-3 py-2 rounded-lg hover:bg-blue-50 relative">
              <Briefcase className="w-4 h-4 mr-2" />
              Jobs
              {jobCount > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {jobCount}
                </span>
              )}
            </Link>
            
            <Link to="/advertise" className="text-gray-700 hover:text-blue-600 font-medium text-sm px-3 py-2 rounded-lg hover:bg-blue-50">
              Advertise
            </Link>
          </nav>

          {/* Right Side: Search, Admin, User */}
          <div className="flex items-center space-x-3">
            {/* Search Bar */}
            <div className="hidden md:block relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 lg:w-64 text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

            {/* Admin/User Section */}
            <div className="flex items-center space-x-2">
              {isLoggedIn ? (
                <>
                  {/* User Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                        ) : (
                          <User className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <span className="hidden lg:inline text-sm font-medium">{user?.name}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
                        <Link
                          to="/admin/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Admin Access Trigger */}
                  {(showAdmin || clickCount > 0) && (
                    <Link
                      to="/admin/login"
                      className="hidden sm:inline-flex items-center text-gray-700 hover:text-blue-600 font-medium text-sm px-3 py-2 rounded-lg hover:bg-blue-50"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Admin
                    </Link>
                  )}
                  
                  {/* Login Button 
                  <Link
                    to="/login"
                    className="hidden sm:inline-flex items-center text-gray-700 hover:text-blue-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-blue-50"
                  >
                    Sign In
                  </Link> */}
                </>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            {/* Mobile Search */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="space-y-1">
              <Link
                to="/"
                className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              
              <Link
                to="/jobs"
                className="flex items-center justify-between px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Jobs & Internships
                </div>
                {jobCount > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {jobCount}
                  </span>
                )}
              </Link>
              
              <Link
                to="/advertise"
                className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Advertise
              </Link>

              {/* Mobile Categories */}
              <div className="px-4 py-3">
                <div className="text-sm font-semibold text-gray-500 mb-2">Articles</div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.slice(0, 6).map((category) => (
                    <Link
                      key={category.id}
                      to={`/category/${category.slug}`}
                      className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
                <Link
                  to="/categories"
                  className="block mt-2 text-blue-600 text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  View all →
                </Link>
              </div>

              {/* Mobile Auth Links */}
              <div className="border-t pt-4 mt-4">
                {isLoggedIn ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    {(showAdmin || clickCount > 0) && (
                      <Link
                        to="/admin/login"
                        className="flex items-center px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-lg"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Admin Login
                      </Link>
                    )}
                  </>
                )}
              </div>
            </nav>
          </div>
        )}

        {/* Secret Indicators */}
        {clickCount > 0 && !showAdmin && (
          <div className="fixed top-16 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-1 rounded text-sm z-50 shadow-lg">
            {3 - clickCount} more clicks for admin
          </div>
        )}

        {showAdmin && (
          <div className="fixed top-16 right-4 bg-green-100 border border-green-400 text-green-800 px-3 py-1 rounded text-sm z-50 shadow-lg">
            Admin access unlocked - 30s
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;