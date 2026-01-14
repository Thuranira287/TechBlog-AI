import React from 'react';
import { Facebook, MessageSquare, Link as LinkIcon, Copy, Check } from 'lucide-react';

const SocialShare = ({ job }) => {
  const [copied, setCopied] = React.useState(false);
  
  const shareUrl = window.location.href;
  const jobTitle = encodeURIComponent(`${job.title} at ${job.company_name}`);
  const jobDescription = encodeURIComponent(job.description?.substring(0, 200) || 'Check out this job opportunity!');
  const hashtags = 'TechJobs,Hiring,Jobs';

  // Facebook Share URL
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${jobTitle}`;

  // WhatsApp Share URL
  const whatsappShareUrl = `https://wa.me/?text=${jobTitle}%0A%0A${jobDescription}%0A%0A${encodeURIComponent(shareUrl)}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700">Share this job:</span>
      
      <div className="flex items-center space-x-2">
        {/* Facebook Share */}
        <a
          href={facebookShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
          aria-label="Share on Facebook"
        >
          <Facebook className="w-5 h-5" />
        </a>

        {/* WhatsApp Share */}
        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
          aria-label="Share on WhatsApp"
        >
          <MessageSquare className="w-5 h-5" />
        </a>

        {/* Copy Link */}
        <button
          onClick={copyToClipboard}
          className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Copy link"
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