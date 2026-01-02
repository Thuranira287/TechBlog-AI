import React from "react";
import AuthorBio from "../components/AuthorBio";

const handleDecline = () => {
  const expiryDate = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
  localStorage.setItem("techblog_cookie_consent", "declined");
  localStorage.setItem("techblog_consent_expiry", expiryDate.toString());
  
  // Clear ALL third-party cookies with partitioned attribute
  const cookies = document.cookie.split(";");
  cookies.forEach(cookie => {
    const [name] = cookie.split("=");
    const trimmedName = name.trim();
    
    // Clear common third-party cookies
    if (trimmedName.includes('_ga') || 
        trimmedName.includes('_gid') || 
        trimmedName === 'IDE' || 
        trimmedName === 'test_cookie') {
      
      // Clear with partitioned attribute
      document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}; SameSite=None; Secure; Partitioned`;
      document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure; Partitioned`;
    }
  });
  
  setConsent("declined");
  onDecline();
};

export default function About() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-20">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              About <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-300">TechBlog AI</span>
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-light">
              Bridging the gap between AI theory and practical implementation for developers, students, and tech enthusiasts worldwide.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Mission Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-blue-100 rounded-lg mr-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                We exist to move knowledge from theory into practice. Whether you're learning AI basics, 
                preparing for a cybersecurity role, or building your first web app, TechBlog AI aims to 
                provide clear, well-sourced, and actionable content that empowers you to succeed.
              </p>
            </div>

            {/* What You'll Find Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-green-100 rounded-lg mr-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">What You'll Find Here</h2>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    </div>
                  </div>
                  <span className="ml-3 text-lg text-gray-700">Guides and tutorials that you can follow from zero to working code</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    </div>
                  </div>
                  <span className="ml-3 text-lg text-gray-700">Trend explainers and industry analysis with referenced sources</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                    </div>
                  </div>
                  <span className="ml-3 text-lg text-gray-700">Regionally-relevant insight (Africa & Kenya) - how global tech affects local contexts</span>
                </li>
              </ul>
            </div>

            {/* How We Work Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-purple-100 rounded-lg mr-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">How We Work</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Articles are written, reviewed, and updated regularly. When facts or tools change, 
                we edit posts and maintain accuracy through continuous improvement.
              </p>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="font-semibold text-blue-900">Last Updated</span>
                  <span className="ml-2 text-blue-700">We mark articles with a "Last updated" date so readers know the content's freshness.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Get Involved Card */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">Get Involved</h3>
              <p className="mb-6 leading-relaxed">
                Contribute ideas, request guides, or suggest corrections. We welcome feedback 
                from students and professionals alike.
              </p>
              <a 
                href="mailto:contact@techblogai.com" 
                className="inline-flex items-center justify-center w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 px-6 rounded-lg transition duration-300 transform hover:-translate-y-1"
              >
                Contact Us
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </a>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Commitment</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Content Quality</span>
                  <span className="text-lg font-bold text-green-600">100%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Monthly Updates</span>
                  <span className="text-lg font-bold text-blue-600">50+</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Reader Satisfaction</span>
                  <span className="text-lg font-bold text-purple-600">98%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Links</h3>
              <ul className="space-y-4">
                <li>
                  <a href="/tutorials" className="flex items-center text-blue-600 hover:text-blue-800 hover:underline">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    AI Tutorials
                  </a>
                </li>
                <li>
                  <a href="/guides" className="flex items-center text-green-600 hover:text-green-800 hover:underline">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    Development Guides
                  </a>
                </li>
                <li>
                  <a href="/resources" className="flex items-center text-purple-600 hover:text-purple-800 hover:underline">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                    Free Resources
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Author Bio Section */}
        <div className="mt-20">
          <AuthorBio compact={false} />
        </div>
      </section>
    </main>
  );
}