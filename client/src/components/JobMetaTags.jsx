import React from 'react';
import { Helmet } from 'react-helmet-async';

const JobMetaTags = ({ job }) => {
  const siteUrl = 'https://aitechblogs.netlify.app';
  const pageUrl = `${siteUrl}/jobs/${job.id}`;
  const jobTitle = `${job.title} at ${job.company_name}`;
  const jobDescription = job.description?.substring(0, 200) || 'Check out this exciting job opportunity!';
  const imageUrl = job.company_logo || `${siteUrl}/og-image-jobs.png`;
  
  // Schema.org JobPosting structured data
  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "datePosted": job.posted_at,
    "validThrough": job.expires_at || "",
    "employmentType": job.job_type,
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.company_name,
      "logo": job.company_logo || ""
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.location
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": job.salary_range?.match(/\$(\d+)/)?.[1] || "",
        "maxValue": job.salary_range?.match(/\$(\d+)/)?.[2] || "",
        "unitText": "YEAR"
      }
    },
    "applicantLocationRequirements": {
      "@type": "Country",
      "name": "Worldwide"
    }
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{jobTitle} | TechBlog AI Jobs</title>
      <meta name="title" content={jobTitle} />
      <meta name="description" content={jobDescription} />
      <meta name="keywords" content={`${job.category}, ${job.job_type}, ${job.company_name}, tech jobs, programming jobs, ${job.location}`} />
      
      {/* Open Graph / Facebook */}
      <meta property="fb:app_id" content="1829393364607774" />
      <meta property="og:type" content="article" />
      <meta property="article:section" content="Jobs" />
      <meta property="article:published_time" content={job.posted_at} />
      <meta property="article:author" content={job.company_name} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={jobTitle} />
      <meta property="og:description" content={jobDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${job.company_name} job posting for ${job.title}`} />
      <meta property="og:site_name" content="TechBlog AI Jobs" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={jobTitle} />
      <meta name="twitter:description" content={jobDescription} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:site" content="@AiTechBlogs" />
      <meta name="twitter:creator" content="@AiTechBlogs" />
      
      {/* Job-specific Meta Tags */}
      <meta property="job:category" content={job.category} />
      <meta property="job:type" content={job.job_type} />
      <meta property="job:location" content={job.location} />
      <meta property="job:salary" content={job.salary_range || "Competitive"} />
      <meta property="job:posted_date" content={job.posted_at} />
      <meta property="job:expires_date" content={job.expires_at || ""} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={pageUrl} />
      
      {/* Schema.org Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jobPostingSchema)}
      </script>
      
      {/* Additional Meta for WhatsApp */}
      <meta property="og:type" content="website" />
    </Helmet>
  );
};

export default JobMetaTags;