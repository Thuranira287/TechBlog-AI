import React from 'react'
import { Link } from 'react-router-dom'
import { useBlog } from '../context/BlogContext'
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Github,
  MessageCircle,
} from "lucide-react";

const Footer = () => {
  const { categories } = useBlog()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white py-2">
      <div className="container mx-auto px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TB</span>
              </div>
              <span className="text-xl font-bold">TechBlog AI</span>
            </Link>
            <p className="text-gray-400 mb-4">
              Your trusted source for the latest technology news, AI insights, and web development tutorials.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <ul className="space-y-1">
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link 
                    to={`/category/${category.slug}`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/policy/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/policy/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/policy/cookie" className="text-gray-400 hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className='contact'>
            <h3 className="text-lg font-semibold mb-4">Connect</h3>
            <ul className="space-y-2 text-gray-400">
              <li className='flex items-center space-x-1'>
                <Mail className='text-gray-400 w-5 h-5 text-xl mr-2'/>
                <a href="mailto:contact@techblogai.com" className='hover:underline text-blue-400 text-center'>
                  contact@techblogai.com
                </a>
                </li>
              <li>Follow us on social media</li>
            </ul>
            <div className="flex space-x-4">
              
              <a
                href="https://www.facebook.com/alexander.thuranira.1044"
                aria-label="Facebook"
                title="Facebook"
                className="text-blue-400 hover:text-brand-gold transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/ranviah?s=09"
                aria-label="Twitter"
                title="Twitter"
                className="text-gray-400 hover:text-brand-gold transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/"
                aria-label="LinkedIn"
                title="LinkedIn"
                className="text-blue-400 hover:text-brand-gold transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com"
                aria-label="Instagram"
                title="Instagram"
                className="text-pink-400 hover:text-brand-gold transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/Thuranira287"
                aria-label="Github"
                title="Github"
                className="text-gray-400 hover:text-brand-gold transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-6 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} TechBlog AI. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/policy/privacy" className="text-gray-400 hover:text-white text-sm">
              Privacy
            </Link>
            <Link to="/policy/terms" className="text-gray-400 hover:text-white text-sm">
              Terms
            </Link>
            <Link to="/sitemap.xml" className="text-gray-400 hover:text-white text-sm">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer