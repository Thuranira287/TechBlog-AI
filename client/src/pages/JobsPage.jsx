import React, { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, Clock, DollarSign, Filter, MessageSquare, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import JobsPageMetaTags from '../components/JobsPageMetaTags';

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    jobType: 'all',
    category: 'all'
  });

  const jobTypes = ['all', 'full-time', 'part-time', 'contract', 'internship', 'remote'];
  const categories = ['all', 'Software Engineering', 'Data Science', 'DevOps', 'Cybersecurity', 'AI/ML', 'Web Development'];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/jobs/public');
      
      if (response.data.success) {
        setJobs(response.data.data);
        setFilteredJobs(response.data.data);
      }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filters, jobs]);

  const applyFilters = () => {
    let result = jobs;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(job => 
        job.title.toLowerCase().includes(searchLower) ||
        job.company_name.toLowerCase().includes(searchLower) ||
        job.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.jobType !== 'all') {
      result = result.filter(job => job.job_type === filters.jobType);
    }

    if (filters.category !== 'all') {
      result = result.filter(job => job.category === filters.category);
    }

    setFilteredJobs(result);
  };

  const handleApplyClick = (jobId, applicationUrl) => {
    // Track click in database
    api.post(`/jobs/${jobId}/track-click`);
    // Open application page in new tab
    window.open(applicationUrl, '_blank', 'noopener,noreferrer');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading job opportunities...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Meta Tags */}
      <JobsPageMetaTags />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Tech Careers & Internships
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
            Discover exciting opportunities at leading tech companies. 
            Launch your career with the best in the industry.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs by title, company, or keyword..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center mb-4">
            <Filter className="text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Filter Opportunities</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
              <select
                value={filters.jobType}
                onChange={(e) => setFilters({...filters, jobType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {jobTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ search: '', jobType: 'all', category: 'all' })}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Job Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-blue-600">{filteredJobs.length}</span> opportunities
          </p>
        </div>

        {/* Jobs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <Link to={`/jobs/${job.id}`} key={job.id}>
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200 h-full">
                {job.featured && (
                  <div className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 absolute top-4 right-4 rounded-full">
                    Featured
                  </div>
                )}
                
                <div className="p-6">
                  {/* Company Header */}
                  <div className="flex items-start mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      {job.company_logo ? (
                        <img 
                          src={job.company_logo} 
                          alt={job.company_name}
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <Briefcase className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1 hover:text-blue-600 transition-colors">
                        {job.title}
                      </h3>
                      <p className="text-gray-700 font-medium">{job.company_name}</p>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{job.location || 'Multiple Locations'}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <Briefcase className="w-4 h-4 mr-2" />
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getJobTypeColor(job.job_type)}`}>
                        {job.job_type.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    {job.salary_range && (
                      <div className="flex items-center text-gray-600">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>{job.salary_range}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Posted {new Date(job.posted_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-gray-600 text-sm mb-6 line-clamp-3">
                    {job.description.substring(0, 150)}...
                  </p>

                  {/* View Details Button */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600 font-medium">
                      View Details →
                    </span>
                    {/* Mini Share Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const shareUrl = `${window.location.origin}/jobs/${job.id}`;
                        const text = encodeURIComponent(`Check out this job: ${job.title} at ${job.company_name}`);
                        window.open(`https://wa.me/?text=${text}%0A%0A${shareUrl}`, '_blank');
                      }}
                      className="text-green-600 hover:text-green-700 text-sm flex items-center"
                      aria-label="Share on WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Share
                    </button>
                    <span className="text-xs text-gray-500">
                      {job.views || 0} views
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {/* Empty State */}
        {filteredJobs.length === 0 && (
          <div className="text-center py-16">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No jobs found</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your filters or check back later for new opportunities.
            </p>
            <button
              onClick={() => setFilters({ search: '', jobType: 'all', category: 'all' })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Jobs
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsPage;