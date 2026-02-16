import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBlog } from '../context/BlogContext'
import { Mail, Facebook, Twitter, Linkedin, Instagram, Github } from "lucide-react";
import DigitalOcean from "../assets/DigitalOcean.png";
import CloudFlare from "../assets/CloudFlare.png";
import AWS from "../assets/AWS.png";
import GitHub from "../assets/GitHub.png";
import Vercel from "../assets/Vercel.png";
import Netlify from "../assets/Netlify.png";
import GoogleCloud from "../assets/GoogleCloud.png";
import Cisco from "../assets/Cisco.png";
import MicroSoft from "../assets/MicroSoft.png";
import TechBlogAI from "../assets/TechBlogAI.jpg";

const Footer = () => {
  const { categories } = useBlog()
  const currentYear = new Date().getFullYear()
  const [isHovered, setIsHovered] = useState(false)

  // Partner logos
  const partnerLogos = [
    { id: 1, name: "DigitalOcean", logo: DigitalOcean },
    { id: 2, name: "Cloudflare", logo: CloudFlare },
    { id: 3, name: "AWS", logo: AWS },
    { id: 4, name: "GitHub", logo: GitHub },
    { id: 5, name: "Vercel", logo: Vercel },
    { id: 6, name: "Netlify", logo: Netlify },
    { id: 7, name: "Google Cloud", logo: GoogleCloud },
    { id: 8, name: "Cisco", logo: Cisco },
    { id: 9, name: "MicroSoft", logo: MicroSoft },
  ]

  // Duplicate for seamless animation
  const duplicatedLogos = [...partnerLogos, ...partnerLogos]

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-2">
        {/* Trusted Partners Section */}
        <div className="mb-8 pt-4 border-t border-gray-800 ">
          <div className="flex items-center justify-center mb-3">
            <h3 className="text-sm font-semibold text-gray-400 mr-3">Trusted by</h3>
          </div>
          <div 
            className="relative overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className={`flex items-center ${isHovered ? 'paused' : 'animate-marquee'}`}>
              {duplicatedLogos.map((partner, index) => (
                <div 
                  key={`${partner.id}-${index}`}
                  className="flex flex-col items-center mx-6 min-w-[80px] group"
                >
                  <div className="h-8 w-24 flex items-center justify-center mb-1 bg-gray-600/30 rounded-lg p-2 group-hover:bg-gray-600/50 transition-colors">
                    <img 
                      src={partner.logo} 
                      alt={partner.name}
                      className="h-4 object-contain group-hover:grayscale-0 transition-all duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="text-gray-400 text-xs font-medium">${partner.name}</div>
                        `;
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {partner.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-start space-x-3 mb-4">
              <div className="relative flex-shrink-0">
                {/* Logo container */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16">
                  <div className="absolute inset-0 rounded-full border-3 border-blue-600 ring-3 ring-blue-100 ring-offset-1"></div>
                  
                  {/* Logo image */}
                  <img 
                    src={TechBlogAI} 
                    alt="TechBlog AI Logo" 
                    className="w-full h-full rounded-full object-cover p-1"
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <span className="text-xl sm:text-2xl font-bold text-white block">
                  Tech<span className="text-blue-400">Blog</span> AI
                </span>
                <p className="text-gray-300 text-xs sm:text-sm mt-2 leading-relaxed tracking-wide font-medium">
                  Your Trusted Guide to AI, Emerging Tech & Modern Web Development
                </p>
              </div>
            </Link>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-300">Categories</h3>
            <ul className="space-y-1.5">
              {categories.slice(0, 4).map((category) => (
                <li key={category.id}>
                  <Link 
                    to={`/category/${category.slug}`}
                    className="text-gray-400 hover:text-white transition-colors text-xs"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-300">Legal</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors text-xs">
                  About
                </Link>
              </li>
              <li>
                <Link to="/policy/privacy" className="text-gray-400 hover:text-white transition-colors text-xs">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/policy/terms" className="text-gray-400 hover:text-white transition-colors text-xs">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/policy/cookie" className="text-gray-400 hover:text-white transition-colors text-xs">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-300">Contact</h3>
            <div className="space-y-2">
              <a 
                href="mailto:contact@techblogai.com" 
                className="text-blue-400 hover:underline text-xs flex items-center"
              >
                <Mail className="w-3 h-3 mr-1.5" />
                contact@techblogai.com
              </a>
              <p className="text-gray-400 text-xs">Follow us</p>
              <div className="flex space-x-2">
                <a
                  href="https://www.facebook.com/alexander.thuranira.1044"
                  aria-label="Facebook"
                  title="Facebook"
                  className="text-blue-400 hover:text-white transition-colors"
                >
                  <Facebook className="h-3 w-3" />
                </a>
                <a
                  href="https://x.com/TechBlogsAI"
                  aria-label="Twitter"
                  title="Twitter"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Twitter className="h-3 w-3" />
                </a>
                <a
                  href="https://www.linkedin.com/"
                  aria-label="LinkedIn"
                  title="LinkedIn"
                  className="text-blue-400 hover:text-white transition-colors"
                >
                  <Linkedin className="h-3 w-3" />
                </a>
                <a
                  href="https://github.com/Thuranira287"
                  aria-label="Github"
                  title="Github"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Github className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-4 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-xs">
            © {currentYear} TechBlog AI. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-2 md:mt-0">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-xs"
              >
              Sitemap
            </a>
            <Link to="/advertise" className="text-gray-400 hover:text-white text-xs">
              Advertise
            </Link>
             <a
              href="/sitemap-ai.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-xs"
              >
              Sitemap-AI
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer