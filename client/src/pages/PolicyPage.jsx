import React from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

const PolicyPage = () => {
  const { type } = useParams()

  const policies = {
    privacy: {
      title: 'Privacy Policy',
      content: `
        <h2>Privacy Policy</h2>
        <p>Last updated: ${new Date().toLocaleDateString()}</p>
        
        <h3>Information We Collect</h3>
        <p>We collect information you provide directly to us, including:</p>
        <ul>
          <li>Name and email address when you submit comments</li>
          <li>Any other information you choose to provide</li>
        </ul>
        
        <h3>How We Use Your Information</h3>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Operate and maintain our blog</li>
          <li>Respond to your comments and questions</li>
          <li>Monitor and analyze trends and usage</li>
        </ul>
        
        <h3>Cookies and Tracking</h3>
        <p>We use cookies and similar tracking technologies to track activity on our website and hold certain information.</p>
        
        <h3>Third-Party Services</h3>
        <p>We use Google AdSense to serve ads. Google uses cookies to serve ads based on your prior visits to our website or other websites.</p>
      `
    },
    terms: {
      title: 'Terms of Service',
      content: `
        <h2>Terms of Service</h2>
        <p>Last updated: ${new Date().toLocaleDateString()}</p>
        
        <h3>Acceptance of Terms</h3>
        <p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>
        
        <h3>User Conduct</h3>
        <p>You agree not to use the website to:</p>
        <ul>
          <li>Submit any content that is unlawful, harmful, or offensive</li>
          <li>Impersonate any person or entity</li>
          <li>Engage in any activity that interferes with the website</li>
        </ul>
        
        <h3>Intellectual Property</h3>
        <p>All content on this website is the property of TechBlog AI and protected by copyright laws.</p>
        
        <h3>Limitation of Liability</h3>
        <p>We shall not be held liable for any indirect, incidental, or consequential damages arising out of your use of the website.</p>
      `
    },
    cookie: {
      title: 'Cookie Policy',
      content: `
        <h2>Cookie Policy</h2>
        <p>Last updated: ${new Date().toLocaleDateString()}</p>
        
        <h3>What Are Cookies</h3>
        <p>Cookies are small text files that are placed on your computer by websites that you visit.</p>
        
        <h3>How We Use Cookies</h3>
        <p>We use cookies for:</p>
        <ul>
          <li>Understanding how you use our website</li>
          <li>Personalizing your experience</li>
          <li>Showing relevant advertisements through Google AdSense</li>
        </ul>
        
        <h3>Third-Party Cookies</h3>
        <p>We use Google AdSense which uses cookies to serve ads based on your prior visits to our website or other websites.</p>
        
        <h3>Managing Cookies</h3>
        <p>You can control and/or delete cookies as you wish through your browser settings.</p>
      `
    }
  }

  const policy = policies[type] || policies.privacy

  return (
    <>
      <Helmet>
        <title>{policy.title} | TechBlog AI</title>
        <meta name="description" content={`Read our ${policy.title.toLowerCase()} for TechBlog AI`} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <article className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{policy.title}</h1>
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: policy.content }}
          />
        </article>
      </div>
    </>
  )
}

export default PolicyPage