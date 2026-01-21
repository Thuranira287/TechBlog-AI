import React from 'react';
import { Helmet } from 'react-helmet-async';

const JobsPageMetaTags = () => {
  const pageUrl = 'https://aitechblogs.netlify.app/jobs';
  
  // Schema.org structured data for Jobs listing
  const jobsListingSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Tech Jobs & Careers | TechBlog AI",
    "url": pageUrl,
    "description": "Find tech jobs, internships, and career opportunities at leading tech companies. Software engineering, data science, AI/ML, web development jobs and more.",
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": "50+",
      "itemListElement": []
    }
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>Tech Jobs & Careers | Find Programming Jobs & Internships</title>
      <meta name="title" content="Tech Jobs & Careers | Find Programming Jobs & Internships" />
      <meta name="description" content="Find tech jobs, internships, and career opportunities at leading companies. Software engineering, data science, AI/ML, web development jobs and more." />
      <meta name="keywords" content="tech jobs, programming jobs, software engineering jobs, data science jobs, AI jobs, ML jobs, web development jobs, internships, remote jobs" />
      
      {/* Open Graph / Facebook */}
      <meta property="fb:app_id" content="1829393364607774" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content="Tech Jobs & Careers | Find Programming Jobs & Internships" />
      <meta property="og:description" content="Find tech jobs, internships, and career opportunities at leading tech companies. Software engineering, data science, AI/ML, web development jobs and more." />
      <meta property="og:image" content="https://aitechblogs.netlify.app/og-image-jobs.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Tech Jobs Board - Find your next career opportunity" />
      <meta property="og:site_name" content="TechBlog AI Jobs" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content="Tech Jobs & Careers | Find Programming Jobs & Internships" />
      <meta name="twitter:description" content="Find tech jobs, internships, and career opportunities at leading tech companies." />
      <meta name="twitter:image" content="https://aitechblogs.netlify.app/og-image-jobs.png" />
      <meta name="twitter:site" content="@AiTechBlogs" />
      <meta name="twitter:creator" content="@AiTechBlogs" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={pageUrl} />
      
      {/* Schema.org Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jobsListingSchema)}
      </script>
    </Helmet>
  );
};

export default JobsPageMetaTags;