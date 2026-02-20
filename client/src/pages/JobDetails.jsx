import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, Briefcase, Clock, DollarSign, Globe, 
  Calendar, ChevronLeft, ExternalLink, Building, 
  CheckCircle, Users, Award, Mail, Phone, Share2
} from 'lucide-react';
import { api } from '../api/client';
import JobMetaTags from '../components/JobMetaTags';
import SocialShare from '../components/SocialShare';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [viewTracked, setViewTracked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchJobDetails();
    trackJobView();
  }, [id]);

  const trackJobView = async () => {
    if (!viewTracked) {
      try {
        await api.post(`/jobs/${id}/view`);
        setViewTracked(true);
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }
  };

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch job details
      const response = await api.get(`/jobs/public/${id}`);
      
      if (response.data.success) {
        setJob(response.data.data);
        
        // Fetch related jobs
        fetchRelatedJobs(response.data.data.category, response.data.data.id);
      } else {
        setError('Job not found');
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      setError('Failed to load job details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedJobs = async (category, excludeId) => {
    try {
      const response = await api.get(`/jobs/public?category=${category}`);
      if (response.data.success) {
        const filtered = response.data.data
          .filter(job => job.id !== excludeId)
          .slice(0, 3);
        setRelatedJobs(filtered);
      }
    } catch (error) {
      console.error('Error fetching related jobs:', error);
    }
  };

  const handleApplyClick = async () => {
    try {
      // Track the click
      await api.post(`/jobs/${id}/click`);
      
      // Open application URL in new tab
      window.open(job.application_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still open the URL even if tracking fails
      window.open(job.application_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Check out this ${job.title} position at ${job.company_name}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: job.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Sharing cancelled:', error);
        // Fallback to copy to clipboard
        copyToClipboard(shareUrl);
      }
    } else {
      // Fallback for desktop and older browsers
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOnWhatsApp = () => {
    const shareUrl = window.location.href;
    const text = encodeURIComponent(`Check out this ${job.title} position at ${job.company_name}`);
    window.open(`https://wa.me/?text=${text}%0A%0A${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnFacebook = () => {
    const shareUrl = window.location.href;
    const text = encodeURIComponent(`${job.title} at ${job.company_name}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${text}`, '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getJobTypeColor = (type) => {
    const colors = {
      'full-time': 'bg-green-100 text-green-800',
      'part-time': 'bg-blue-100 text-blue-800',
      'contract': 'bg-yellow-100 text-yellow-800',
      'internship': 'bg-purple-100 text-purple-800',
      'remote': 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const parseRequirements = (requirementsText) => {
    if (!requirementsText) return [];
    return requirementsText.split('\n').filter(line => line.trim());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading job details...</div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || 'The job you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <button
            onClick={() => navigate('/jobs')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Browse All Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add meta tags for social sharing */}
      <JobMetaTags job={job} />
      
      {/* Back Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/jobs')}
            className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Jobs
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2">
            {/* Job Header with Share Button */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-start mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      {job.company_logo ? (
                        <img 
                          src={job.company_logo} 
                          alt={job.company_name}
                          className="w-12 h-12 object-contain"
                          width="48"
                          height="48"
                          loading='eager'
                          fetchPriority='high'
                        />
                      ) : (
                        <Building className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <div className="flex items-center text-gray-700">
                              <Building className="w-4 h-4 mr-2" />
                              <span className="font-medium">{job.company_name}</span>
                            </div>
                            {job.featured && (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Share Button in Header */}
                        <button
                          onClick={handleShare}
                          className="flex items-center text-blue-600 hover:text-blue-800 font-medium ml-4"
                          title="Share this job"
                        >
                          <Share2 className="w-5 h-5 mr-2" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Job Meta Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm text-gray-600">Location</div>
                        <div className="font-medium">{job.location || 'Not specified'}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Briefcase className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm text-gray-600">Job Type</div>
                        <div className={`font-medium px-2 py-1 rounded text-xs ${getJobTypeColor(job.job_type)}`}>
                          {job.job_type.replace('-', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                    
                    {job.salary_range && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                          <div className="text-sm text-gray-600">Salary</div>
                          <div className="font-medium">{job.salary_range}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm text-gray-600">Posted</div>
                        <div className="font-medium">{formatDate(job.posted_at)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Copy Link Button */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="truncate text-sm text-gray-700 mr-2">
                        {window.location.href}
                      </div>
                      <button
                        onClick={() => copyToClipboard(window.location.href)}
                        className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        {copied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                    {copied && (
                      <div className="text-green-600 text-sm mt-2 text-center">
                        Link copied to clipboard!
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg mb-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700">{job.views || 0}</div>
                      <div className="text-sm text-blue-600">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700">{job.clicks || 0}</div>
                      <div className="text-sm text-green-600">Applications</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-700">{relatedJobs.length}</div>
                      <div className="text-sm text-purple-600">Related Jobs</div>
                    </div>
                  </div>

                  {/* Job Description */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                      <Briefcase className="w-6 h-6 mr-2 text-blue-600" />
                      Job Description
                    </h2>
                    <div className="prose max-w-none text-gray-700">
                      {job.description.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-4">{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {/* Requirements & Qualifications */}
                  {job.requirements && (
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                        <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                        Requirements & Qualifications
                      </h2>
                      <ul className="space-y-3">
                        {parseRequirements(job.requirements).map((req, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                            <span className="text-gray-700">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Benefits (Optional - can be added to your database) */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                      <Award className="w-6 h-6 mr-2 text-yellow-600" />
                      Why Join Us?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <Users className="w-5 h-5 text-blue-500 mr-3" />
                        <div>
                          <div className="font-medium">Collaborative Team</div>
                          <div className="text-sm text-gray-600">Work with talented professionals</div>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <Award className="w-5 h-5 text-yellow-500 mr-3" />
                        <div>
                          <div className="font-medium">Growth Opportunities</div>
                          <div className="text-sm text-gray-600">Career advancement paths</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application URL Section */}
              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Apply?</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Apply directly through {job.company_name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      You'll be redirected to their official application portal
                    </div>
                  </div>
                  <button
                    onClick={handleApplyClick}
                    className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold px-8 py-3 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center whitespace-nowrap"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Apply Now
                  </button>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About {job.company_name}</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Building className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-gray-700">{job.company_name}</span>
                    </div>
                    {job.location && (
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-gray-700">{job.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Share This Job</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={shareOnWhatsApp}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg flex items-center justify-center"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={shareOnFacebook}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center"
                    >
                      Facebook
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            {/* Quick Apply Card */}
            <div className="bg-gradient-to-br from-blue-600 to-teal-600 text-white rounded-xl shadow-lg p-6 mb-6 sticky top-6">
              <h3 className="text-xl font-bold mb-4">Quick Apply</h3>
              <p className="mb-6">Ready to take the next step in your career?</p>
              
              <button
                onClick={handleApplyClick}
                className="w-full bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 rounded-lg text-lg transition-colors mb-4 flex items-center justify-center"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Apply Now
              </button>
              
              <div className="text-sm opacity-90">
                <div className="flex items-center mb-2">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Posted: {formatDate(job.posted_at)}</span>
                </div>
                {job.expires_at && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Expires: {formatDate(job.expires_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Share Card in Sidebar */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Share This Job</h3>
              <div className="space-y-3">
                <button
                  onClick={handleShare}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg font-medium flex items-center justify-center"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share with Friends
                </button>
                
                <div className="flex space-x-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg font-medium text-sm"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={shareOnFacebook}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg font-medium text-sm"
                  >
                    Facebook
                  </button>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Copy direct link:</p>
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={window.location.href}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(window.location.href)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-r-lg text-sm"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Summary</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">Category</div>
                  <div className="font-medium">{job.category}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Job Type</div>
                  <div className={`font-medium px-2 py-1 rounded text-xs inline-block ${getJobTypeColor(job.job_type)}`}>
                    {job.job_type.replace('-', ' ').toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Location</div>
                  <div className="font-medium">{job.location || 'Not specified'}</div>
                </div>
                {job.salary_range && (
                  <div>
                    <div className="text-sm text-gray-600">Salary Range</div>
                    <div className="font-medium">{job.salary_range}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Related Jobs */}
            {relatedJobs.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Jobs</h3>
                <div className="space-y-4">
                  {relatedJobs.map(relatedJob => (
                    <Link
                      key={relatedJob.id}
                      to={`/jobs/${relatedJob.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="font-medium text-gray-900 mb-1">{relatedJob.title}</div>
                      <div className="text-sm text-gray-600 mb-2">{relatedJob.company_name}</div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs ${getJobTypeColor(relatedJob.job_type)}`}>
                          {relatedJob.job_type.replace('-', ' ').toUpperCase()}
                        </span>
                        {relatedJob.salary_range && (
                          <span className="text-sm font-medium">{relatedJob.salary_range}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
                <Link
                  to="/jobs"
                  className="block text-center mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Jobs →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;