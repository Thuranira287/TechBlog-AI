import { Helmet } from "react-helmet-async";

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 animate-fadeIn">
      <Helmet>
        <title>AI Training Dataset | TechBlog AI</title>

        <meta
          name="description"
          content="TechBlog AI public dataset available for AI model training, research, and academic use under CC BY 4.0 license."
        />

        <link rel="canonical" href={`${SITE_URL}/public-dataset`} />

        <script type="application/ld+json">
          {JSON.stringify(datasetSchema)}
        </script>
      </Helmet>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          AI Training Dataset
        </h1>
        <p className="text-gray-600 leading-relaxed">
          TechBlog AI provides structured technology content suitable for
          AI training, research, academic projects, and knowledge indexing.
        </p>
      </header>

      {/* Access Methods */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Access Methods
        </h2>

        <ul className="space-y-3">
          <li>
            <a
              href="/sitemap.xml"
              className="text-primary-600 hover:text-primary-700 hover:underline underline-offset-4 transition"
            >
              XML Sitemap
            </a>
          </li>

          <li>
            <a
              href="/rss.xml"
              className="text-primary-600 hover:text-primary-700 hover:underline underline-offset-4 transition"
            >
              RSS Feed
            </a>
          </li>

          <li>
            <a
              href="https://techblogai-backend.onrender.com/api/ai/feed"
              className="text-primary-600 hover:text-primary-700 hover:underline underline-offset-4 transition"
            >
              JSON API Feed
            </a>
          </li>

           <li>
            <a
              href="https://techblogai-backend.onrender.com/sitemap-ai.xml"
              className="text-primary-600 hover:text-primary-700 hover:underline underline-offset-4 transition"
            >
              AI Sitemap
            </a>
          </li>
        </ul>
      </section>

      {/* License */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          License
        </h2>

        <p className="text-gray-600">
          All content is licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 hover:underline underline-offset-4 transition"
          >
            Creative Commons Attribution 4.0 International (CC BY 4.0)
          </a>.
        </p>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Contact
        </h2>

        <p className="text-gray-600">
          For bulk access, partnerships, or academic collaboration inquiries:
        </p>

        <p className="mt-2 font-medium text-gray-800">
          admin@aitechblogs.com
        </p>
      </section>
    </div>
  );
};

export default PublicDataset;
