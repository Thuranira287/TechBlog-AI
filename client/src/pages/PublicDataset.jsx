import { Helmet } from "react-helmet-async";
import { 
  FileJson, 
  FileText, 
  Database, 
  Rss, 
  Shield, 
  Mail, 
  ExternalLink,
  Sparkles,
  BookOpen,
  Globe
} from "lucide-react";

const SITE_URL = "https://aitechblogs.netlify.app";

const PublicDataset = () => {
  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "TechBlog AI Public AI Training Dataset",
    description:
      "Structured collection of technology blog articles available for AI training, research, and academic use under the Creative Commons Attribution 4.0 International license.",
    url: `${SITE_URL}/public-dataset`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: {
      "@type": "Organization",
      name: "TechBlog AI",
      url: SITE_URL,
    },
    isAccessibleForFree: true,
    distribution: [
      {
        "@type": "DataDownload",
        name: "XML Sitemap",
        encodingFormat: "application/xml",
        contentUrl: `${SITE_URL}/sitemap.xml`,
      },
      {
        "@type": "DataDownload",
        name: "RSS Feed",
        encodingFormat: "application/rss+xml",
        contentUrl: `${SITE_URL}/rss.xml`,
      },
      {
        "@type": "DataDownload",
        name: "JSON API Feed",
        encodingFormat: "application/json",
        contentUrl:
          "https://techblogai-backend.onrender.com/api/ai/feed",
      },
    ],
  };

  const accessMethods = [
    {
      name: "XML Sitemap",
      url: "/sitemap.xml",
      icon: FileText,
      description: "Complete site structure for crawlers and AI indexing",
      format: "XML",
    },
    {
      name: "RSS Feed",
      url: "/rss.xml",
      icon: Rss,
      description: "Real-time content updates in RSS format",
      format: "RSS",
    },
    {
      name: "JSON API Feed",
      url: "https://techblogai-backend.onrender.com/api/ai/feed",
      icon: FileJson,
      description: "Structured JSON data optimized for AI training",
      format: "JSON",
    },
    {
      name: "AI Sitemap",
      url: "https://techblogai-backend.onrender.com/sitemap-ai.xml",
      icon: Database,
      description: "Specialized sitemap with enhanced AI metadata",
      format: "XML+AI",
    },
  ];

  const stats = [
    { label: "Articles", value: "1000+", icon: BookOpen },
    { label: "Categories", value: "12", icon: Globe },
    { label: "License", value: "CC BY 4.0", icon: Shield },
    { label: "Free Access", value: "Always", icon: Sparkles },
  ];

  return (
    <>
      <Helmet>
        <title>AI Training Dataset | TechBlog AI</title>
        <meta
          name="description"
          content="TechBlog AI public dataset available for AI model training, research, and academic use under CC BY 4.0 license. Access structured technology content via XML, RSS, and JSON feeds."
        />
        <meta name="keywords" content="AI training dataset, machine learning data, tech blog dataset, CC BY 4.0, open data, research dataset" />
        <link rel="canonical" href={`${SITE_URL}/public-dataset`} />
        <meta property="og:title" content="TechBlog AI - AI Training Dataset" />
        <meta property="og:description" content="Free public dataset for AI training, research, and academic use. 1000+ technology articles in structured formats." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/public-dataset`} />
        <meta property="og:image" content={`${SITE_URL}/og-dataset.png`} />
        <script type="application/ld+json">
          {JSON.stringify(datasetSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-grid-white/[0.1] bg-[length:50px_50px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <div className="max-w-3xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-8">
                <Sparkles className="w-4 h-4 text-yellow-300 mr-2" />
                <span className="text-sm font-medium text-white">Open Dataset • CC BY 4.0</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                AI Training Dataset
              </h1>
              <p className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
                Free, structured technology content for AI training, research, and academic innovation
              </p>
            </div>
          </div>
          
          {/* Decorative wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg className="w-full h-12 text-white fill-current" viewBox="0 0 1440 48" preserveAspectRatio="none">
              <path d="M0,48 L1440,48 L1440,0 L720,48 L0,0 L0,48 Z" />
            </svg>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="w-6 h-6 text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                      {stat.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </div>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Column - Access Methods */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  <Database className="w-6 h-6 mr-2 text-indigo-600" />
                  Access Methods
                </h2>
                <p className="text-gray-600">
                  Choose from multiple formats to integrate our dataset into your AI workflows
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {accessMethods.map((method, index) => {
                  const Icon = method.icon;
                  return (
                    <a
                      key={index}
                      href={method.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-200 hover:-translate-y-1"
                    >
                      {/* Format badge */}
                      <div className="absolute top-4 right-4">
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                          {method.format}
                        </span>
                      </div>
                      
                      {/* Icon */}
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {method.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {method.description}
                      </p>
                      
                      {/* Link indicator */}
                      <div className="flex items-center text-sm font-medium text-indigo-600">
                        <span>Access dataset</span>
                        <ExternalLink className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Additional info */}
              <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
                  Dataset Features
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 mr-3" />
                    <span>1000+ technology articles with full text content</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 mr-3" />
                    <span>Structured metadata: categories, tags, publication dates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 mr-3" />
                    <span>Regular updates with new content weekly</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 mr-3" />
                    <span>Multiple formats: JSON, XML, RSS</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column - License & Contact */}
            <div className="space-y-6">
              {/* License Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center mb-4">
                  <Shield className="w-6 h-6 text-indigo-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-900">License</h2>
                </div>
                
                <div className="space-y-4">
                  <p className="text-gray-600 leading-relaxed">
                    All content is freely available under the
                  </p>
                  
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 hover:border-indigo-300 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">CC BY 4.0</span>
                      <ExternalLink className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-sm text-gray-600">
                      Creative Commons Attribution 4.0 International
                    </p>
                  </a>
                  
                  <p className="text-sm text-gray-500">
                    You are free to share and adapt the material for any purpose, even commercially, as long as you provide appropriate attribution.
                  </p>
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center mb-4">
                  <Mail className="w-6 h-6 text-indigo-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-900">Contact</h2>
                </div>
                
                <p className="text-gray-600 mb-4">
                  For bulk access, partnerships, or academic collaborations:
                </p>
                
                <a
                  href="mailto:admin@aitechblogs.com"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors group"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  <span>admin@aitechblogs.com</span>
                </a>
                
                <p className="text-xs text-gray-400 mt-4">
                  Response time: 24-48 hours
                </p>
              </div>

              {/* Usage Stats Card */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Dataset Usage
                </h3>
                <div className="space-y-2 text-white/90">
                  <div className="flex justify-between">
                    <span>Monthly requests:</span>
                    <span className="font-bold">50K+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active researchers:</span>
                    <span className="font-bold">100+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data freshness:</span>
                    <span className="font-bold">Daily</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-16 text-center border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500">
              TechBlog AI is committed to advancing AI research through open data. 
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicDataset;