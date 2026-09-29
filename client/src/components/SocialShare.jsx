import React from 'react';
import {
  Facebook,
  MessageCircle,
  Link as LinkIcon,
  Check,
  Briefcase,
} from 'lucide-react';

const SocialShare = ({ job }) => {
  const [copied, setCopied] = React.useState(false);

  const shareUrl = window.location.href;

  const jobTitle = job?.title || 'Job Opportunity';
  const companyName = job?.company_name || 'a company';
  const jobDescription =
    job?.description?.substring(0, 200) ||
    'Check out this job opportunity!';

  // Facebook Share URL
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}&quote=${encodeURIComponent(
    `${jobTitle} at ${companyName}`
  )}`;

  // WhatsApp message — no emojis
  const whatsappMessage = `JOB OPPORTUNITY

${jobTitle} at ${companyName}

${jobDescription}

View Job:
${shareUrl}

#TechJobs #Hiring #Jobs`;

  // WhatsApp Share URL
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700">
        Share this job:
      </span>

      <div className="flex items-center gap-2">
        {/* Facebook */}
        <a
          href={facebookShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
          aria-label="Share on Facebook"
        >
          <Facebook className="w-5 h-5" />
        </a>

        {/* WhatsApp */}
        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
          aria-label="Share on WhatsApp"
        >
          <MessageCircle className="w-5 h-5" />
        </a>

        {/* Copy Link */}
        <button
          type="button"
          onClick={copyToClipboard}
          className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          aria-label={copied ? 'Link copied' : 'Copy job link'}
        >
          {copied ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <LinkIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {copied && (
        <span className="text-sm text-green-600 animate-pulse">
          Link copied!
        </span>
      )}
    </div>
  );
};

export default SocialShare;