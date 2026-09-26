export default async (request, context) => {
  try {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return context.next();
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts[0] !== 'jobs' || !pathParts[1]) {
      return context.next();
    }

    const jobId = pathParts[1];
    if (!/^\d+$/.test(jobId)) {
      return context.next();
    }

    const cacheKey = `job-${jobId}`;
    const cache = await caches.open('job-cache');
    const cached = await cache.match(cacheKey);
    if (cached) {
      console.log(`[Edge-Job] Cache HIT for job ${jobId}`);
      return cached;
    }

    const result = await fetchJobData(jobId);

    if (result.status === 'notfound') {
      const html = await buildHtml(request, {
        title: 'Job Not Found | TechBlog AI Jobs',
        metaTags: '<meta name="robots" content="noindex, follow" />',
        bodyContent: `
      <main style="max-width:600px;margin:4rem auto;text-align:center;font-family:system-ui,sans-serif;">
        <h1>Job Not Found</h1>
        <p>This job listing doesn't exist or has expired.</p>
        <a href="/jobs">Browse all jobs</a>
      </main>`,
      });
      return new Response(html, {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex, follow',
        },
      });
    }

    if (result.status === 'error') {
      const staleCache = await caches.open('job-cache');
      const stale = await staleCache.match(cacheKey);
      if (stale) {
        console.log(`[Edge-Job] Backend error, serving STALE cache for job ${jobId}`);
        return stale;
      }
      console.log(`[Edge-Job] Backend error, no stale cache, rewriting to SPA for job ${jobId}`);
      return context.rewrite('/index.html');
    }

    const html = await buildHtml(request, jobToTemplateData(result.job));
    const response = new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=3600',
        'X-Robots-Tag': 'index, follow, max-image-preview:large',
      },
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error('[Edge-Job] Unexpected error, bypassing to origin:', error.message);
    return context.next();
  }
};

async function fetchJobData(jobId, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const url = `https://techblogai-backend.onrender.com/api/jobs/public/${jobId}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TechBlogAI-Edge/1.0', Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (response.status === 404) {
      return { status: 'notfound' };
    }
    if (!response.ok) {
      throw new Error(`Backend status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data) {
      return { status: 'notfound' };
    }
    return { status: 'ok', job: data.data };
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[Edge-Job] Fetch error (attempt ${attempt}):`, error.message);
    if (attempt === 1) {
      return fetchJobData(jobId, 2);
    }
    return { status: 'error' };
  }
}

// Cloudinary optimization
function optimizeImage(imgUrl, width) {
  if (!imgUrl || !imgUrl.includes('res.cloudinary.com') || !imgUrl.includes('/upload/')) {
    return imgUrl;
  }
  return imgUrl.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}

function escapeHtml(text = '') {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function parseSalaryRange(salaryRange) {
  if (!salaryRange) return { min: '', max: '' };
  const numbers = salaryRange.match(/[\d,]+/g);
  if (!numbers || numbers.length === 0) return { min: '', max: '' };
  const clean = (n) => n.replace(/,/g, '');
  return {
    min: clean(numbers[0]) || '',
    max: numbers.length > 1 ? clean(numbers[1]) : '',
  };
}

function jobToTemplateData(job) {
  const SITE_URL = 'https://aitechblogs.netlify.app';
  const pageUrl = `${SITE_URL}/jobs/${job.id}`;
  const jobTitle = `${job.title} at ${job.company_name}`;
  const jobDescription = (job.description || '').substring(0, 200) || 'Check out this exciting job opportunity!';
  const imageUrl = optimizeImage(job.company_logo, 1200) || `${SITE_URL}/og-image-jobs.png`;
  const salary = parseSalaryRange(job.salary_range);

  const jobPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || '',
    datePosted: job.posted_at,
    validThrough: job.expires_at || undefined,
    employmentType: job.job_type,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name,
      logo: job.company_logo || undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location },
    },
    ...(salary.min ? {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'USD',
        value: {
          '@type': 'QuantitativeValue',
          minValue: Number(salary.min),
          ...(salary.max ? { maxValue: Number(salary.max) } : {}),
          unitText: 'YEAR',
        },
      },
    } : {}),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Jobs', item: `${SITE_URL}/jobs` },
      { '@type': 'ListItem', position: 2, name: job.title, item: pageUrl },
    ],
  };

  const metaTags = `
      <meta name="keywords" content="${escapeHtml(`${job.category || ''}, ${job.job_type || ''}, ${job.company_name}, tech jobs, ${job.location || ''}`)}" />

      <meta property="og:type" content="website" />
      <meta property="og:url" content="${pageUrl}" />
      <meta property="og:title" content="${escapeHtml(jobTitle)}" />
      <meta property="og:description" content="${escapeHtml(jobDescription)}" />
      <meta property="og:image" content="${escapeHtml(imageUrl)}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="${escapeHtml(`${job.company_name} job posting for ${job.title}`)}" />
      <meta property="og:site_name" content="TechBlog AI Jobs" />
      <meta property="article:section" content="Jobs" />
      <meta property="article:published_time" content="${escapeHtml(job.posted_at || '')}" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content="${pageUrl}" />
      <meta name="twitter:title" content="${escapeHtml(jobTitle)}" />
      <meta name="twitter:description" content="${escapeHtml(jobDescription)}" />
      <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
      <meta name="twitter:site" content="@AiTechBlogs" />

      <link rel="canonical" href="${pageUrl}" />
      <script type="application/ld+json">${escapeJson(jobPostingSchema)}</script>
      <script type="application/ld+json">${escapeJson(breadcrumbSchema)}</script>
      `;

  const bodyContent = `
      <main style="max-width:800px;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;">
        <nav aria-label="Breadcrumb"><a href="/jobs">Jobs</a> &rsaquo; ${escapeHtml(job.title)}</nav>
        <h1>${escapeHtml(job.title)}</h1>
        <p><strong>${escapeHtml(job.company_name)}</strong>${job.location ? ' - ' + escapeHtml(job.location) : ''}</p>
        <p>${job.job_type ? escapeHtml(job.job_type) : ''}${job.salary_range ? ' - ' + escapeHtml(job.salary_range) : ''}</p>
        <div>${job.description ? escapeHtml(job.description).replace(/\n/g, '<br/>') : ''}</div>
        ${job.application_url ? `<p><a href="${escapeHtml(job.application_url)}" rel="nofollow noopener">Apply for this position</a></p>` : ''}
      </main>`;

  return { title: `${jobTitle} | TechBlog AI Jobs`, description: jobDescription, metaTags, bodyContent };
}

async function buildHtml(request, { title, description, metaTags, bodyContent }) {
  const spaResponse = await fetch(new URL('/index.html', request.url));
  let html = await spaResponse.text();

  html = html.replace(/<title>.*?<\/title>/i, '');
  html = html.replace(/<meta name="description"[^>]*>/gi, '');
  html = html.replace(/<link rel="canonical"[^>]*>/gi, '');
  html = html.replace(/<meta property="og:[^>]*>/gi, '');
  html = html.replace(/<meta name="twitter:[^>]*>/gi, '');

  const injected = `
      <title>${escapeHtml(title)}</title>
      ${description ? `<meta name="description" content="${escapeHtml(description)}" />` : ''}
      ${metaTags || ''}
      `;
  html = html.replace('</head>', `${injected}</head>`);

  html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);

  return html;
}

export const config = {
  path: '/jobs/*',
  onError: 'bypass',
};
