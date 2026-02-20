export default async (request, context) => {
  try {
    const url = new URL(request.url);
    
    // Skip API routes
    if (url.pathname.startsWith('/api/')) {
      return context.next();
    }

    // Only handle about page
    if (url.pathname !== '/about') {
      return context.next();
    }

    console.log(`[Edge-About] Serving SSR`);

    try {
      // Check cache first
      const cacheKey = 'about-page';
      const cache = await caches.open('about-cache');
      const cached = await cache.match(cacheKey);
      
      if (cached) {
        console.log(`[Edge-About] Cache HIT`);
        return cached;
      }

      // Fetch categories for Quick Links
      const categoriesRes = await fetch('https://techblogai-backend.onrender.com/api/categories', {
        headers: { "User-Agent": "TechBlogAI-Edge/1.0" }
      });
      
      const categories = categoriesRes.ok ? await categoriesRes.json() : [];

      // Get the SPA template
      const spaResponse = await fetch(new URL('/index.html', request.url));
      let html = await spaResponse.text();

      // Generate SSR content
      const ssrContent = generateAboutSSR(categories);

      // Inject SSR content into root div
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root">${ssrContent}</div>`
      );

      // Inject initial data for hydration
      html = html.replace(
        '</body>',
        `<script>
          window.__INITIAL_ABOUT_DATA__ = {
            categories: ${JSON.stringify(categories).replace(/</g, '\\u003c')}
          }
        </script></body>`
      );

      const response = new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
          "X-Robots-Tag": "index, follow, max-image-preview:large",
          "Vary": "User-Agent",
          "X-Rendered-By": "Edge-SSR-About"
        }
      });

      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;

    } catch (error) {
      console.error("[Edge-About] Error:", error);
      return context.rewrite("/index.html");
    }

  } catch (error) {
    console.error("[Edge-About] Critical error:", error);
    return context.rewrite("/index.html");
  }
};

function generateAboutSSR(categories) {
  const SITE = {
    url: "https://aitechblogs.netlify.app",
    name: "TechBlog AI",
    logo: "https://aitechblogs.netlify.app/TechBlogAI.jpg"
  };

  const AUTHOR = {
    name: "Alexander Zachary",
    role: "Senior AI & Full-Stack Developer",
    bio: "Computer Science graduate with over 5 years of professional experience in full-stack development and artificial intelligence. Founder of TechBlog AI, combining technical expertise with pedagogical clarity to create practical, accessible learning resources.",
    image: "https://aitechblogs.netlify.app/author-avatar.jpg",
    location: "Nairobi, Kenya",
    email: "contact@techblogai.com",
    sameAs: [
      "https://twitter.com/AiTechBlogs",
      "https://facebook.com/alexander.thuranira.1044",
      "https://github.com/Thuranira287",
      "https://linkedin.com/in/alexander-zachary-287b621b4/"
    ]
  };

  // Schema.org data
  const schemas = {
    person: {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${SITE.url}/about#alexander-zachary`,
      "name": AUTHOR.name,
      "url": `${SITE.url}/about`,
      "image": AUTHOR.image,
      "jobTitle": AUTHOR.role,
      "description": AUTHOR.bio,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Nairobi",
        "addressCountry": "Kenya"
      },
      "email": AUTHOR.email,
      "sameAs": AUTHOR.sameAs,
      "worksFor": {
        "@type": "Organization",
        "@id": `${SITE.url}#organization`,
        "name": SITE.name
      }
    },
    organization: {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE.url}#organization`,
      "name": SITE.name,
      "url": SITE.url,
      "logo": SITE.logo,
      "description": "Bridging the gap between AI theory and practical implementation for developers, students, and tech enthusiasts.",
      "founder": {
        "@type": "Person",
        "@id": `${SITE.url}/about#alexander-zachary`
      },
      "sameAs": AUTHOR.sameAs
    },
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": SITE.url
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "About",
          "item": `${SITE.url}/about`
        }
      ]
    }
  };

  // Generate categories HTML
  const categoriesHtml = categories.slice(0, 5).map(cat => `
    <li>
      <a 
        href="/category/${cat.slug}"
        class="flex items-center text-blue-600 hover:text-blue-700 hover:underline transition-colors"
      >
        <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        ${escapeHtml(cat.name)}
      </a>
    </li>
  `).join('');

  return `
    <main class="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <!-- Hero Section -->
      <section class="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-20">
        <div class="absolute inset-0 bg-black opacity-20"></div>
        <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center">
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              About <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-300">TechBlog AI</span>
            </h1>
            <p class="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-light">
              Bridging the gap between AI theory and practical implementation for developers, students, and tech enthusiasts worldwide.
            </p>
          </div>
        </div>
      </section>

      <!-- Main Content -->
      <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <!-- Left Column - Main Content -->
          <div class="lg:col-span-2 space-y-12">
            <!-- Mission Card -->
            <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <div class="flex items-center mb-6">
                <div class="p-3 bg-blue-100 rounded-lg mr-4">
                  <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h2 class="text-3xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p class="text-lg text-gray-700 leading-relaxed">
                We exist to move knowledge from theory into practice. Whether you're learning AI basics, 
                preparing for a cybersecurity role, or building your first web app, TechBlog AI aims to 
                provide clear, well-sourced, and actionable content that empowers you to succeed.
              </p>
            </div>

            <!-- What You'll Find Card -->
            <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <div class="flex items-center mb-6">
                <div class="p-3 bg-green-100 rounded-lg mr-4">
                  <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h2 class="text-3xl font-bold text-gray-900">What You'll Find Here</h2>
              </div>
              <ul class="space-y-4">
                <li class="flex items-start">
                  <div class="flex-shrink-0 mt-1">
                    <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <div class="w-3 h-3 bg-blue-600 rounded-full"></div>
                    </div>
                  </div>
                  <span class="ml-3 text-lg text-gray-700">Guides and tutorials that you can follow from zero to working code</span>
                </li>
                <li class="flex items-start">
                  <div class="flex-shrink-0 mt-1">
                    <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <div class="w-3 h-3 bg-green-600 rounded-full"></div>
                    </div>
                  </div>
                  <span class="ml-3 text-lg text-gray-700">Trend explainers and industry analysis with referenced sources</span>
                </li>
                <li class="flex items-start">
                  <div class="flex-shrink-0 mt-1">
                    <div class="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <div class="w-3 h-3 bg-purple-600 rounded-full"></div>
                    </div>
                  </div>
                  <span class="ml-3 text-lg text-gray-700">Regionally-relevant insight (Africa & Kenya) - how global tech affects local contexts</span>
                </li>
              </ul>
            </div>

            <!-- How We Work Card -->
            <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <div class="flex items-center mb-6">
                <div class="p-3 bg-purple-100 rounded-lg mr-4">
                  <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h2 class="text-3xl font-bold text-gray-900">How We Work</h2>
              </div>
              <p class="text-lg text-gray-700 leading-relaxed mb-6">
                Articles are written, reviewed, and updated regularly. When facts or tools change, 
                we edit posts and maintain accuracy through continuous improvement.
              </p>
              <div class="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <div class="flex items-center">
                  <svg class="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span class="font-semibold text-blue-900">Last Updated</span>
                  <span class="ml-2 text-blue-700">We mark articles with a "Last updated" date so readers know the content's freshness.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column - Sidebar -->
          <div class="lg:col-span-1 space-y-8">
            <!-- Get Involved Card -->
            <div class="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
              <h3 class="text-2xl font-bold mb-6">Get Involved</h3>
              <p class="mb-6 leading-relaxed">
                Contribute ideas, request guides, or suggest corrections. We welcome feedback 
                from students and professionals alike.
              </p>
              <a 
                href="mailto:contact@techblogai.com" 
                class="inline-flex items-center justify-center w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 px-6 rounded-lg transition duration-300 transform hover:-translate-y-1"
              >
                Contact Us
                <svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </a>
            </div>

            <!-- Stats Card -->
            <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h3 class="text-2xl font-bold text-gray-900 mb-6">Our Commitment</h3>
              <div class="space-y-6">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600">Content Quality</span>
                    <span class="text-lg font-bold text-green-600">100%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-green-500 h-2 rounded-full" style="width: 100%"></div>
                  </div>
                </div>
                
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600">Monthly Updates</span>
                    <span class="text-lg font-bold text-blue-600">50+</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: 90%"></div>
                  </div>
                </div>
                
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600">Reader Satisfaction</span>
                    <span class="text-lg font-bold text-purple-600">98%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-purple-500 h-2 rounded-full" style="width: 98%"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Links -->
            <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Quick Links</h3>
              <ul class="space-y-4">
                ${categoriesHtml}
              </ul>
            </div>
          </div>
        </div>

        <!-- Author Bio Section -->
        <div class="mt-20">
          ${generateAuthorBio()}
        </div>
      </section>
    </main>
  `;
}

function generateAuthorBio() {
  return `
    <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 md:p-10 shadow-xl border border-indigo-100">
      <div class="max-w-4xl mx-auto">
        <div class="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div class="relative flex-shrink-0">
            <div class="relative w-36 h-36 md:w-44 md:h-44">
              <div class="absolute inset-0 rounded-full border-4 border-blue-600 ring-4 ring-blue-100"></div>
              <img 
                src="https://aitechblogs.netlify.app/author-avatar.jpg"
                alt="Alexander Zachary"
                class="w-full h-full rounded-full object-cover p-1"
                width="176"
                height="176"
                loading="eager"
                fetchpriority="high"
              />
            </div>
          </div>
          <div class="text-center md:text-left flex-1">
            <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Alexander Zachary</h2>
            <p class="text-xl text-blue-600 font-medium mb-4">Senior AI & Full-Stack Developer</p>
            <p class="text-gray-700 text-lg leading-relaxed mb-6">
              Computer Science graduate with over 5 years of professional experience in full-stack development 
              and artificial intelligence. Founder of TechBlog AI, combining technical expertise with pedagogical 
              clarity to create practical, accessible learning resources.
            </p>
            <div class="flex flex-wrap justify-center md:justify-start gap-4">
              <a href="https://twitter.com/AiTechBlogs" class="text-blue-500 hover:text-blue-600">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://github.com/Thuranira287" class="text-gray-700 hover:text-gray-900">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.253-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025.8-.223 1.65-.334 2.5-.334.85 0 1.7.111 2.5.334 1.91-1.294 2.75-1.025 2.75-1.025.545 1.376.201 2.393.099 2.646.64.698 1.03 1.591 1.03 2.682 0 3.841-2.34 4.687-4.57 4.933.36.31.68.919.68 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </a>
              <a href="https://linkedin.com/in/alexander-zachary-287b621b4/" class="text-blue-700 hover:text-blue-800">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str = "") {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
}

export const config = {
  path: "/about",
  onError: "bypass"
};