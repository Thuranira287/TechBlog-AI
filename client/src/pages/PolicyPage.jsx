import React from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

// POLICY CONTENT
const LAST_UPDATED = "February 4, 2026";

const policies = {
  privacy: {
    title: "Privacy Policy",
    slug: "privacy",
    description: "TechBlog AI Privacy Policy - how we collect, use, and protect your information, including cookies and Google AdSense.",
    sections: [
      {
        heading: "Privacy Policy",
        type: "h2",
      },
      {
        heading: null,
        type: "date",
      },
      {
        heading: "Information We Collect",
        type: "h3",
        content: [
          {
            type: "text",
            body: "We collect information in the following ways:"
          },
          {
            type: "list",
            items: [
              "Name and email address when you submit comments or contact us.",
              "Usage data such as pages visited, time spent, and referral sources are collected automatically via cookies and analytics tools.",
              "Any other information you voluntarily choose to share with us."
            ]
          }
        ]
      },
      {
        heading: "How We Use Your Information",
        type: "h3",
        content: [
          {
            type: "text",
            body: "We use the information we collect to:"
          },
          {
            type: "list",
            items: [
              "Operate, maintain, and improve TechBlog AI.",
              "Respond to your comments, questions, and support requests.",
              "Monitor and analyze site traffic, trends, and usage patterns.",
              "Serve relevant advertisements through Google AdSense (see below).",
              "Send you updates or newsletters, only if you have opted in."
            ]
          }
        ]
      },
      {
        heading: "Cookies and Tracking Technologies",
        type: "h3",
        content: [
          {
            type: "text",
            body: "We use cookies and similar tracking technologies to enhance your experience on our site. For a detailed breakdown of every cookie we use, the purpose of each, and how to manage them, please refer to our Cookie Policy."
          },
          {
            type: "text",
            body: "In short, we use three categories of cookies:"
          },
          {
            type: "list",
            items: [
              "Essential cookies:- required for the site to function.",
              "Analytics cookies:- help us understand how you use the site (Google Analytics).",
              "Advertising cookies:- used by Google AdSense to show relevant ads."
            ]
          }
        ]
      },
      {
        heading: "Google AdSense and Advertising",
        type: "h3",
        content: [
          {
            type: "text",
            body: "TechBlog AI uses Google AdSense to display advertisements. Google AdSense uses cookies and web beacons to serve ads that are relevant to you based on your browsing history; including visits to this site and other sites across the web."
          },
          {
            type: "text",
            body: "Google's use of cookies allows it to deliver personalized advertising. By visiting our site, you consent to Google's use of cookies for ad serving as described in Google's Privacy Policy. You can opt out of Google's personalized advertising by visiting Google's Ads Settings or by installing the Google Analytics Opt-out Browser Add-on."
          },
          {
            type: "info",
            body: "We do not control the content of ads displayed on our site. Google determines which ads appear based on its own algorithms."
          }
        ]
      },
      {
        heading: "Third-Party Services",
        type: "h3",
        content: [
          {
            type: "text",
            body: "We may use third-party services that collect information independently. These include:"
          },
          {
            type: "list",
            items: [
              "Google Analytics - for site traffic and behavior analysis.",
              "Google AdSense - for serving advertisements.",
              "UI Avatars (ui-avatars.com) - for generating fallback avatar images."
            ]
          },
          {
            type: "text",
            body: "Each of these services has its own privacy policy. We encourage you to review them."
          }
        ]
      },
      {
        heading: "Data Retention",
        type: "h3",
        content: [
          {
            type: "text",
            body: "We retain the information we collect for as long as necessary to provide our services or comply with legal requirements. Analytics data is retained in aggregated, anonymized form. Your cookie consent preference is stored locally on your device for 30 days."
          }
        ]
      },
      {
        heading: "Your Rights",
        type: "h3",
        content: [
          {
            type: "text",
            body: "Depending on your location, you may have the right to access, delete, or restrict the processing of your personal data. You can:"
          },
          {
            type: "list",
            items: [
              "Manage your cookie preferences using the Cookie Settings option on our site.",
              "Opt out of Google's personalized ads via Google's Ads Settings."
            ]
          },
          {
            type: "email",
            body: "Contact us at",
            email: "contact@techblogai.com",
            suffix: "with any data-related requests."
          }
        ]
      },
      {
        heading: "Changes to This Policy",
        type: "h3",
        content: [
          {
            type: "text",
            body: "We may update this Privacy Policy from time to time. The \"Last updated\" date at the top of this page reflects the most recent revision. We encourage you to review this policy periodically."
          }
        ]
      },
      {
        heading: "Contact Us",
        type: "h3",
        content: [
          {
            type: "email",
            body: "If you have questions or concerns about this Privacy Policy, please contact us at",
            email: "contact@techblogai.com",
            suffix: "."
          }
        ]
      }
    ]
  },

  terms: {
    title: "Terms of Service",
    slug: "terms",
    description: "TechBlog AI Terms of Service, rules and guidelines for using our platform.",
    sections: [
      {
        heading: "Terms of Service",
        type: "h2",
      },
      {
        heading: null,
        type: "date",
      },
      {
        heading: "Acceptance of Terms",
        type: "h3",
        content: [
          {
            type: "text",
            body: "By accessing and using TechBlog AI, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our site."
          }
        ]
      },
      {
        heading: "Use of the Website",
        type: "h3",
        content: [
          {
            type: "text",
            body: "You agree to use TechBlog AI only for lawful purposes and in a manner that does not infringe upon the rights of others. You agree not to:"
          },
          {
            type: "list",
            items: [
              "Submit any content that is unlawful, harmful, threatening, abusive, or offensive.",
              "Impersonate any person or entity, or misrepresent your affiliation with any person or entity.",
              "Engage in any activity that interferes with or disrupts the functionality of the website.",
              "Attempt to gain unauthorized access to any part of the site or its related systems.",
              "Use automated tools (bots, scrapers) to harvest content without prior written permission."
            ]
          }
        ]
      },
      {
        heading: "Intellectual Property",
        type: "h3",
        content: [
          {
            type: "text",
            body: "All content on TechBlog AI including:- articles, code snippets, graphics, logos, and other materials is the intellectual property of TechBlog AI or its contributors and is protected by applicable copyright and intellectual property laws."
          },
          {
            type: "text",
            body: "You may read and share individual articles for personal, non-commercial purposes, provided you credit TechBlog AI as the source and do not modify the content. Reproducing substantial portions of our content without permission is not permitted."
          }
        ]
      },
      {
        heading: "Advertising",
        type: "h3",
        content: [
          {
            type: "text",
            body: "TechBlog AI displays advertisements served by Google AdSense. We are not responsible for the content, accuracy, or legality of ads displayed on our site. Clicking an ad may direct you to a third-party website governed by its own terms."
          }
        ]
      },
      {
        heading: "Limitation of Liability",
        type: "h3",
        content: [
          {
            type: "text",
            body: "TechBlog AI shall not be held liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of or inability to use the website, including but not limited to loss of profits, data, or goodwill."
          },
          {
            type: "info",
            body: "This limitation applies to the maximum extent permitted by applicable law."
          }
        ]
      },
      {
        heading: "Disclaimer of Warranties",
        type: "h3",
        content: [
          {
            type: "text",
            body: "TechBlog AI is provided on an \"as is\" and \"as available\" basis. We make no warranties, express or implied regarding the site's accuracy, reliability, or fitness for a particular purpose."
          }
        ]
      },
      {
        heading: "Changes to These Terms",
        type: "h3",
        content: [
          {
            type: "text",
            body: "We reserve the right to modify these Terms at any time. Continued use of the site after changes constitutes acceptance of the updated terms."
          }
        ]
      },
      {
        heading: "Contact Us",
        type: "h3",
        content: [
          {
            type: "email",
            body: "For questions about these Terms of Service, contact us at",
            email: "contact@techblogai.com",
            suffix: "."
          }
        ]
      }
    ]
  },

  cookie: {
    title: "Cookie Policy",
    slug: "cookie",
    description: "TechBlog AI Cookie Policy. A full list of cookies we use, why we use them, and how to manage them.",
    sections: [
      {
        heading: "Cookie Policy",
        type: "h2",
      },
      {
        heading: null,
        type: "date",
      },
      {
        heading: "What Are Cookies",
        type: "h3",
        content: [
          {
            type: "text",
            body: "Cookies are small text files stored on your device by websites you visit. They help sites remember your preferences, improve performance, and enable certain features. Cookies do not contain personal information unless you have provided it directly."
          }
        ]
      },
      {
        heading: "How We Use Cookies",
        type: "h3",
        content: [
          {
            type: "text",
            body: "TechBlog AI uses cookies across three categories. You can manage your preferences at any time using the Cookie Settings option available on our site."
          }
        ]
      },
      {
        heading: "1. Essential Cookies",
        type: "h3",
        content: [
          {
            type: "text",
            body: "These cookies are required for the site to function. They cannot be disabled."
          },
          {
            type: "table",
            headers: ["Cookie Name", "Purpose", "Duration"],
            rows: [
              ["techblog_cookie_consent", "Stores your cookie consent choice", "30 days"],
              ["techblog_consent_expiry", "Tracks when your consent expires", "30 days"],
              ["techblog_analytics_consent", "Stores your analytics cookie preference", "30 days"],
              ["techblog_ads_consent", "Stores your advertising cookie preference", "30 days"]
            ]
          }
        ]
      },
      {
        heading: "2. Analytics Cookies",
        type: "h3",
        content: [
          {
            type: "text",
            body: "These cookies help us understand how visitors use our site. We use Google Analytics to collect aggregated, anonymized traffic data. These cookies are only set if you accept or customize analytics in your cookie preferences."
          },
          {
            type: "table",
            headers: ["Cookie Name", "Provider", "Purpose", "Duration"],
            rows: [
              ["_ga", "Google", "Distinguishes unique users for analytics", "2 years"],
              ["_gid", "Google", "Distinguishes unique users (short-term)", "24 hours"],
              ["_ga_[ID]", "Google", "Tracks session-level activity", "2 years"]
            ]
          }
        ]
      },
      {
        heading: "3. Advertising Cookies",
        type: "h3",
        content: [
          {
            type: "text",
            body: "These cookies are used by Google AdSense to serve relevant advertisements. They may track your browsing behavior across sites to build an interest profile. These cookies are only set if you accept advertising cookies in your preferences."
          },
          {
            type: "table",
            headers: ["Cookie Name", "Provider", "Purpose", "Duration"],
            rows: [
              ["NID", "Google", "Used to store your ad preferences and customize ads", "6 months"],
              ["IDE", "Google (doubleclick.net)", "Used to deliver and measure ad performance", "1 year"],
              ["SAPISID", "Google", "Used for targeting ads based on location and interests", "2 years"],
              ["1P_PREF", "Google", "Used to store user ad preferences", "2 years"],
              ["HSID", "Google", "Used for Google security and ad delivery", "2 years"],
              ["SID", "Google", "Used for secure session identification", "2 years"]
            ]
          },
          {
            type: "info",
            body: "Google AdSense may set additional cookies not listed here. For a full list, refer to Google's Privacy & Terms."
          }
        ]
      },
      {
        heading: "Managing Cookies",
        type: "h3",
        content: [
          {
            type: "text",
            body: "You have full control over cookies on TechBlog AI. Here is how to manage them:"
          },
          {
            type: "list",
            items: [
              "Use the Cookie Settings option on our site to toggle analytics and advertising cookies on or off.",
              "Clear cookies manually through your browser settings.",
              "Install the Google Analytics Opt-out Browser Add-on to block Google Analytics across all sites.",
              "Visit Google's Ads Settings to opt out of personalized advertising."
            ]
          }
        ]
      },
      {
        heading: "Changes to This Policy",
        type: "h3",
        content: [
          {
            type: "text",
            body: "We may update this Cookie Policy when we add or change the cookies we use. The \"Last updated\" date at the top of this page reflects the most recent change."
          }
        ]
      }
    ]
  }
};

// RENDER HELPERS
function renderContent(content) {
  if (!content) return null;
  return content.map((block, i) => {
    switch (block.type) {
      case "text":
        return (
          <p key={i} className="text-gray-700 leading-relaxed mb-4">
            {block.body}
          </p>
        );
      case "email":
        return (
          <p key={i} className="text-gray-700 leading-relaxed mb-4">
            {block.body}{" "}
            <a 
              href={`mailto:${block.email}`}
              className="text-blue-600 hover:text-blue-700 underline font-medium"
            >
              {block.email}
            </a>
            {block.suffix && ` ${block.suffix}`}
          </p>
        );
      case "list":
        return (
          <ul key={i} className="list-disc list-inside text-gray-700 leading-relaxed mb-4 space-y-1.5 ml-2">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        );
      case "info":
        return (
          <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-800 text-sm leading-relaxed">{block.body}</p>
          </div>
        );
      case "table":
        return (
          <div key={i} className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {block.headers.map((h, j) => (
                    <th key={j} className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, j) => (
                  <tr key={j} className={`border-b border-gray-100 ${j % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    {row.map((cell, k) => (
                      <td key={k} className="px-4 py-3 text-gray-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  });
}

function renderSections(sections) {
  return sections.map((section, i) => {
    if (section.type === "h2") {
      return (
        <h2 key={i} className="text-3xl font-bold text-gray-900 mb-2">
          {section.heading}
        </h2>
      );
    }
    if (section.type === "date") {
      return (
        <p key={i} className="text-sm text-gray-500 mb-8">
          Last updated: {LAST_UPDATED}
        </p>
      );
    }
    return (
      <div key={i} className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6 first:mt-0">
          {section.heading}
        </h3>
        {renderContent(section.content)}
      </div>
    );
  });
}

// PAGE COMPONENT
const PolicyPage = () => {
  const { type: paramType } = useParams();
  const location = window.location;
  
  // Handle both /privacy and /policy/privacy routes
  const type = paramType || location.pathname.split('/').pop();

  // Only allow valid policy slugs
  const validSlugs = ["privacy", "terms", "cookie"];
  if (!validSlugs.includes(type)) {
    return <Navigate to="/privacy" replace />;
  }

  const policy = policies[type];

  return (
    <>
      <Helmet>
        <title>{policy.title} | TechBlog AI</title>
        <meta name="description" content={policy.description} />
        <link rel="canonical" href={`https://aitechblogs.netlify.app/policy/${policy.slug}`} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header strip */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-10">
          <div className="max-w-4xl mx-auto px-4">
            <nav className="text-xs text-blue-300 mb-4" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-white transition">Home</Link>
              <span className="mx-2">›</span>
              <span className="text-white">{policy.title}</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-bold">{policy.title}</h1>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-4xl mx-auto px-4 py-10">
          <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
            {renderSections(policy.sections)}
          </article>

          {/* Cross-links to other policies */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {validSlugs
              .filter(slug => slug !== type)
              .map(slug => (
                <Link
                  key={slug}
                  to={`/policy/${slug}`}
                  className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition"
                >
                  <p className="text-sm font-semibold text-primary-600">{policies[slug].title}</p>
                  <p className="text-xs text-gray-500 mt-1">{policies[slug].description.slice(0, 70)}…</p>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default PolicyPage;