import React, { useState, useEffect } from "react";
import { FiDownload, FiMail, FiUsers, FiTrendingUp, FiExternalLink, FiRefreshCw } from "react-icons/fi";
import { FaAffiliatetheme } from "react-icons/fa";
import { api } from '../api/client'; 

export default function Advertise() {
  const [monthlyVisitors, setMonthlyVisitors] = useState("5,000+");
  const [affiliateClicks, setAffiliateClicks] = useState([]);
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);
  const [mediaKitLoading, setMediaKitLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Brand partners with actual logo images and websites
  const brandPartners = [
    { 
      id: 1, 
      name: "DigitalOcean", 
      logo: "https://www.digitalocean.com/_next/static/media/logo.6b42f3d3.svg",
      website: "https://www.digitalocean.com",
      description: "Cloud Infrastructure"
    },
    { 
      id: 2, 
      name: "Cloudflare", 
      logo: "https://www.cloudflare.com/img/logo/cloudflare-logo-white.svg",
      website: "https://www.cloudflare.com",
      description: "Web Performance & Security"
    },
    { 
      id: 3, 
      name: "AWS", 
      logo: "https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png",
      website: "https://aws.amazon.com",
      description: "Amazon Web Services"
    },
    { 
      id: 4, 
      name: "Google Cloud", 
      logo: "https://cloud.google.com/_static/cloud/images/social-icon-google-cloud-1200-630.png",
      website: "https://cloud.google.com",
      description: "Google Cloud Platform"
    },
    { 
      id: 5, 
      name: "Microsoft Azure", 
      logo: "https://azure.microsoft.com/svghandler/azure/?width=600&height=315",
      website: "https://azure.microsoft.com",
      description: "Microsoft Cloud"
    },
    { 
      id: 6, 
      name: "GitHub", 
      logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
      website: "https://github.com",
      description: "Code Hosting Platform"
    },
    { 
      id: 7, 
      name: "Vercel", 
      logo: "https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png",
      website: "https://vercel.com",
      description: "Frontend Cloud"
    },
    { 
      id: 8, 
      name: "Netlify", 
      logo: "https://www.netlify.com/v3/img/components/logomark.png",
      website: "https://www.netlify.com",
      description: "Web Development Platform"
    },
    { 
      id: 9, 
      name: "Stripe", 
      logo: "https://stripe.com/img/v3/home/twitter.png",
      website: "https://stripe.com",
      description: "Payment Processing"
    },
    { 
      id: 10, 
      name: "MongoDB", 
      logo: "https://webassets.mongodb.com/_com_assets/cms/mongodb_logo1-76twgcu2dm.png",
      website: "https://www.mongodb.com",
      description: "NoSQL Database"
    },
    { 
      id: 11, 
      name: "PostgreSQL", 
      logo: "https://www.postgresql.org/media/img/about/press/elephant.png",
      website: "https://www.postgresql.org",
      description: "Open Source Database"
    },
    { 
      id: 12, 
      name: "Docker", 
      logo: "https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png",
      website: "https://www.docker.com",
      description: "Container Platform"
    }
  ];
  
  // Default affiliate data
  const defaultAffiliates = [
    { name: "DigitalOcean", clicks: "1,200+", conversionRate: "4.2%" },
    { name: "Cloudflare", clicks: "850+", conversionRate: "3.8%" },
    { name: "Tech Learning Platforms", clicks: "2,300+", conversionRate: "4.5%" }
  ];

  useEffect(() => {
    fetchStats();
    fetchLogos();
  }, []);

// Update the fetchStats function
const fetchStats = async () => {
  try {
    setStatsLoading(true);
    console.log('Fetching stats from Netlify function...');
    
    // IMPORTANT: Make sure you're calling the correct function name
    const response = await fetch('/.netlify/functions/get-stats');
    
    if (!response.ok) {
      console.error('Stats fetch failed:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Stats data received:', data);
    
    // Format monthly visitors
    const visitorsNum = parseInt(data.monthlyVisitors) || 5000;
    setMonthlyVisitors(formatNumber(visitorsNum));
    
    // Format affiliate clicks - handle both property names
    if (data.affiliates && data.affiliates.length > 0) {
      const formattedAffiliates = data.affiliates.map(aff => ({
        name: aff.name,
        clicks: formatNumber(aff.clicks || 0),
        conversionRate: aff.conversionRate ? `${aff.conversionRate}%` : 
                       aff.conversion_rate ? `${aff.conversion_rate}%` : 
                       calculateConversionRate(aff.name)
      }));
      setAffiliateClicks(formattedAffiliates);
    } else {
      setAffiliateClicks(defaultAffiliates);
    }
    
    setLastUpdated(new Date(data.timestamp).toLocaleString());
  } catch (error) {
    console.error('Error fetching stats:', error);
    setMonthlyVisitors("5,000+");
    setAffiliateClicks(defaultAffiliates);
  } finally {
    setStatsLoading(false);
    setLoading(false);
  }
};

const formatNumber = (num) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M+`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k+`;
  } else {
    return `${num}+`;
  }
};
// Helper function to calculate conversion rates
const calculateConversionRate = (name) => {
  const rates = {
    'DigitalOcean': '4.2%',
    'Cloudflare': '3.8%', 
    'Tech Learning Platforms': '4.5%',
    'AWS': '3.5%',
    'Google Cloud': '4.0%',
    'Microsoft Azure': '3.2%'
  };
  return rates[name] || '3.5%';
};

// Also update fetchLogos to use Netlify function if you have one
const fetchLogos = async () => {
  try {
    // Try Netlify function first
    const response = await fetch('/.netlify/functions/logos');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        setLogos(data);
        return;
      }
    }
    
    // Fallback to Express API
    const apiResponse = await api.get('/logos');
    if (Array.isArray(apiResponse.data)) {
      setLogos(apiResponse.data);
    }
  } catch (error) {
    console.log('Using default logos:', error.message);
  }
};

  
  const defaultLogos = [
    { 
      id: 1, 
      name: "DigitalOcean", 
      logo: "https://www.digitalocean.com/_next/static/media/logo.6b42f3d3.svg",
      website: "https://www.digitalocean.com",
      description: "Cloud Infrastructure"
    },
    { 
      id: 2, 
      name: "Cloudflare", 
      logo: "https://www.cloudflare.com/img/logo/cloudflare-logo-white.svg",
      website: "https://www.cloudflare.com",
      description: "Web Performance & Security"
    },
    { 
      id: 3, 
      name: "AWS", 
      logo: "https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png",
      website: "https://aws.amazon.com",
      description: "Amazon Web Services"
    },
    { 
      id: 4, 
      name: "Google Cloud", 
      logo: "https://cloud.google.com/_static/cloud/images/social-icon-google-cloud-1200-630.png",
      website: "https://cloud.google.com",
      description: "Google Cloud Platform"
    },
    { 
      id: 5, 
      name: "Microsoft Azure", 
      logo: "https://azure.microsoft.com/svghandler/azure/?width=600&height=315",
      website: "https://azure.microsoft.com",
      description: "Microsoft Cloud"
    },
    { 
      id: 6, 
      name: "GitHub", 
      logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
      website: "https://github.com",
      description: "Code Hosting Platform"
    }
  ];

    // Use API logos or defaults
  const displayLogos = logos.length > 0 ? logos : defaultLogos;

  const handleDownload = async () => {
  try {
    setMediaKitLoading(true);
    console.log('Downloading media kit...');
    
    // IMPORTANT: Use the correct function name - note the dot before netlify
    const mediaKitResponse = await fetch('/.netlify/functions/generate-media-kit');
    
    console.log('Media kit response status:', mediaKitResponse.status);
    
    if (!mediaKitResponse.ok) {
      const errorData = await mediaKitResponse.json();
      throw new Error(errorData.message || `HTTP error! status: ${mediaKitResponse.status}`);
    }
    
    // Get the PDF blob
    const blob = await mediaKitResponse.blob();
    console.log('PDF blob size:', blob.size, 'type:', blob.type);
    
    // Check if blob is valid
    if (!blob || blob.size === 0) {
      throw new Error('Empty PDF received from server');
    }
    
    // Check if it's a PDF
    if (!blob.type.includes('pdf')) {
      console.warn('Received non-PDF content:', blob.type);
      // Try to parse as text to see what we got
      const text = await blob.text();
      console.log('Received text:', text.substring(0, 200));
      throw new Error('Server returned non-PDF content');
    }
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TechBlogAI_MediaKit.pdf";
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    console.log('PDF downloaded successfully');
    
  } catch (err) {
    console.error('Media kit download error:', err);
    
    // Show user-friendly error
    const errorMessage = err.message.includes('Failed to fetch') 
      ? 'Cannot connect to server. Please check your connection.'
      : err.message;
    
    alert(`Media kit download failed: ${errorMessage}\n\nPlease email us at advertise@techblogai.com for the media kit.`);
    
    // Try fallback: Direct download link
    try {
      console.log('Trying fallback download...');
      const fallbackLink = document.createElement('a');
      fallbackLink.href = 'https://techblogai.com/TechBlogAI_MediaKit.pdf'; // Or your actual URL
      fallbackLink.download = 'TechBlogAI_MediaKit_Fallback.pdf';
      fallbackLink.target = '_blank';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
  } finally {
    setMediaKitLoading(false);
  }
};
  const handleRefreshStats = () => {
    fetchStats();
  };

  const nicheTopics = [
    "Cybersecurity Fundamentals",
    "Network Security",
    "AI & Machine Learning",
    "Web Development",
    "Cloud Computing",
    "Tech Career Growth"
  ];

  // Pause animation on hover
  const handleMouseEnter = () => setIsAnimating(false);
  const handleMouseLeave = () => setIsAnimating(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading advertising information...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header/Hero Section */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Advertise with <span className="text-yellow-300">TechBlog AI</span>
          </h1>
          <p className="text-xl text-teal-100 max-w-3xl mx-auto mb-8">
            Reach our engaged audience of tech enthusiasts, cybersecurity professionals, 
            and lifelong learners in the AI & technology space.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center bg-teal-700/30 px-4 py-2 rounded-lg">
              <FiUsers className="mr-2 text-xl" />
              <span className="font-semibold">{monthlyVisitors} Monthly Visitors</span>
            </div>
            <div className="flex items-center bg-teal-700/30 px-4 py-2 rounded-lg">
              <FiTrendingUp className="mr-2 text-xl" />
              <span className="font-semibold">85% Tech Professionals</span>
            </div>
            <div className="flex items-center bg-teal-700/30 px-4 py-2 rounded-lg">
              <FaAffiliatetheme className="mr-2 text-xl" />
              <span className="font-semibold">High Engagement Rate</span>
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={mediaKitLoading}
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-8 py-4 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mediaKitLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <FiDownload className="mr-2" />
                Download Media Kit
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Audience Insights */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 relative">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
            <h2 className="text-3xl font-bold text-gray-800">
              <FiUsers className="inline mr-3 text-teal-600" />
              Audience Insights
            </h2>
            <button
              onClick={handleRefreshStats}
              className="flex items-center text-teal-600 hover:text-teal-700 text-sm font-medium"
              title="Refresh Stats"
            >
              <FiRefreshCw className="mr-1" /> Refresh
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-teal-50 p-6 rounded-xl border border-teal-100 hover:border-teal-300 transition-colors duration-300">
              <div className="text-3xl font-bold text-teal-700 mb-2">{monthlyVisitors}</div>
              <div className="text-gray-600">Monthly Visitors</div>
              <div className="text-xs text-teal-500 mt-2">Updated via GA4 API</div>
            </div>
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-colors duration-300">
              <div className="text-3xl font-bold text-emerald-700 mb-2">45%</div>
              <div className="text-gray-600">Return Visitors</div>
              <div className="text-xs text-emerald-500 mt-2">High retention rate</div>
            </div>
            <div className="bg-cyan-50 p-6 rounded-xl border border-cyan-100 hover:border-cyan-300 transition-colors duration-300">
              <div className="text-3xl font-bold text-cyan-700 mb-2">3.5min</div>
              <div className="text-gray-600">Avg. Session Duration</div>
              <div className="text-xs text-cyan-500 mt-2">Deep engagement</div>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 hover:border-blue-300 transition-colors duration-300">
              <div className="text-3xl font-bold text-blue-700 mb-2">68%</div>
              <div className="text-gray-600">US/UK Audience</div>
              <div className="text-xs text-blue-500 mt-2">Global tech hubs</div>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mb-4">Affiliate Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border border-gray-200">Platform</th>
                  <th className="p-3 border border-gray-200">Monthly Clicks</th>
                  <th className="p-3 border border-gray-200">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {affiliateClicks.map((affiliate, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 border border-gray-200 font-medium">{affiliate.name}</td>
                    <td className="p-3 border border-gray-200 text-teal-600 font-bold">{affiliate.clicks}</td>
                    <td className="p-3 border border-gray-200">
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                        {affiliate.conversionRate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-gray-500 mt-2 italic">
              * Real-time data from affiliate tracking database
            </div>
          </div>
        </div>

        {/* Trusted Brand Partners - Animated Carousel */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 overflow-hidden">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 pb-4 border-b border-gray-200">
            <FaAffiliatetheme className="inline mr-3 text-teal-600" />
            Trusted Brand Partners
          </h2>
          <p className="text-gray-600 mb-8 text-center">
            We partner with industry-leading brands that share our commitment to quality education 
            and technological innovation.
          </p>
          
          {/* Animated Logo Marquee */}
          <div 
            className="relative overflow-hidden py-8 mb-8"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Marquee Container */}
            <div className={`flex ${isAnimating ? 'animate-marquee' : ''} space-x-12`}>
              {[...brandPartners, ...brandPartners].map((brand, index) => (
                <a
                  key={`${brand.id}-${index}`}
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center min-w-[200px] p-6 bg-gray-50 rounded-xl hover:bg-teal-50 hover:shadow-lg transition-all duration-300 group relative"
                >
                  {/* Logo Image */}
                  <div className="h-20 w-full flex items-center justify-center mb-4">
                    <img 
                      src={brand.logo} 
                      alt={brand.name}
                      className="max-h-16 max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="text-center">
                            <div class="text-teal-600 font-bold text-xl mb-2">${brand.name}</div>
                            <div class="text-gray-400 text-sm">${brand.description}</div>
                          </div>
                        `;
                      }}
                    />
                  </div>
                  
                  {/* Brand Name & Description */}
                  <div className="text-center">
                    <div className="font-semibold text-gray-800 mb-1 group-hover:text-teal-700">
                      {brand.name}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {brand.description}
                    </div>
                    <FiExternalLink className="text-gray-400 group-hover:text-teal-600 mx-auto" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Collaboration & Niche */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-200">
              <FiMail className="inline mr-3 text-teal-600" />
              Get In Touch
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Email Address</h3>
                <a 
                  href="mailto:advertise@techblogai.com" 
                  className="text-teal-600 hover:text-teal-700 font-bold text-xl flex items-center hover:underline"
                >
                  <FiMail className="mr-3" />
                  advertise@techblogai.com
                </a>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Response Time</h3>
                <p className="text-gray-600">Within 24-48 hours</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Advertising Options</h3>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-600">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                    Sponsored Content & Articles
                  </li>
                  <li className="flex items-center text-gray-600">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                    Newsletter Features
                  </li>
                  <li className="flex items-center text-gray-600">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                    Banner Advertising
                  </li>
                  <li className="flex items-center text-gray-600">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                    Product Reviews
                  </li>
                  <li className="flex items-center text-gray-600">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                    Affiliate Partnerships
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-200">
              Niche Expertise
            </h2>
            <p className="text-gray-600 mb-6">
              Our content focuses on cutting-edge technology topics that resonate with professionals 
              and enthusiasts alike.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {nicheTopics.map((topic, index) => (
                <div 
                  key={index} 
                  className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-xl border border-teal-100 hover:border-teal-300 hover:shadow-md transition-all duration-300"
                >
                  <div className="text-teal-700 font-semibold">{topic}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl shadow-2xl p-10 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Reach Our Tech Audience?</h2>
          <p className="text-teal-100 text-xl mb-8 max-w-2xl mx-auto">
            Join leading brands that trust TechBlog AI to connect with technology professionals, 
            cybersecurity experts, and AI enthusiasts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleDownload}
              disabled={mediaKitLoading}
              className="bg-white text-teal-700 hover:bg-gray-100 font-bold px-8 py-4 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mediaKitLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <FiDownload className="mr-3" />
                  Download Media Kit (PDF)
                </>
              )}
            </button>
            <a
              href="mailto:advertise@techblogai.com"
              className="bg-transparent border-2 border-white hover:bg-white/10 text-white font-bold px-8 py-4 rounded-lg text-lg transition-all duration-300 flex items-center justify-center"
            >
              <FiMail className="mr-3" />
              Contact Us Directly
            </a>
          </div>
          <p className="mt-8 text-teal-200">
            For urgent inquiries, expect responses within 24 hours.
          </p>
        </div>
      </div>

      {/* Add CSS animations directly in the component 
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-marquee {
          animation: marquee 40s linear infinite;
          animation-play-state: running;
        }
        
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style> */}
    </div>
  );
}