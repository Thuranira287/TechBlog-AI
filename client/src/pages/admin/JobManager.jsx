import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit, Trash2, Eye, BarChart, Upload, 
  Save, X, Calendar, Globe, Briefcase, 
  MapPin, DollarSign, Clock, Check, ExternalLink 
} from 'lucide-react';
import { adminApi } from '../../api/client';

const JobManager = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    featured: 0,
    clicks: 0,
    internships: 0
  });

  const formDataTemplate = {
    title: '',
    company_name: '',
    location: '',
    job_type: 'full-time',
    category: 'Software Engineering',
    description: '',
    requirements: '',
    salary_range: '',
    application_url: '',
    expires_at: '',
    featured: false,
    is_active: true
  };

  const [formData, setFormData] = useState(formDataTemplate);

  const jobTypes = [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'remote', label: 'Remote' }
  ];

  const categories = [
    'Software Engineering',
    'Data Science',
    'DevOps',
    'Cybersecurity',
    'AI/ML',
    'Web Development',
    'Mobile Development',
    'UX/UI Design',
    'Product Management',
    'Cloud Computing',
    'IT Support',
    'QA/Testing'
  ];

  const fileInputRef = useRef(null);

  // Fetch all jobs - FIXED: changed from '/admin/jobs' to '/jobs'
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/jobs');
      
      if (response.data.success) {
        setJobs(response.data.data);
        calculateStats(response.data.data);
      } else {
        console.error('API Error:', response.data.error);
        alert('Failed to load jobs: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      alert('Failed to load jobs. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (jobsData) => {
    const total = jobsData.length;
    const active = jobsData.filter(j => j.is_active && new Date(j.expires_at) >= new Date()).length;
    const featured = jobsData.filter(j => j.featured).length;
    const clicks = jobsData.reduce((sum, job) => sum + (job.clicks || 0), 0);
    const internships = jobsData.filter(j => j.job_type === 'internship').length;
    
    setStats({ total, active, featured, clicks, internships });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPEG, PNG, SVG, or WebP)');
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim() || !formData.company_name.trim() || !formData.application_url.trim()) {
      alert('Please fill in all required fields: Title, Company Name, and Application URL');
      return;
    }

    if (!formData.expires_at) {
      alert('Please select an expiration date');
      return;
    }

    try {
      setUploading(true);

      const jobData = new FormData();
      
      // Append form data
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          jobData.append(key, formData[key]);
        }
      });

      // Append logo file if exists
      if (logoFile) {
        jobData.append('company_logo', logoFile);
      }

      let response;
      if (editingJob) {
        // Update existing job - FIXED: changed from '/admin/jobs' to '/jobs'
        response = await adminApi.put(`/jobs/${editingJob.id}`, jobData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Create new job - FIXED: changed from '/admin/jobs' to '/jobs'
        response = await adminApi.post('/jobs', jobData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      alert(response.data.message || 'Job saved successfully!');
      resetForm();
      fetchJobs();
    } catch (error) {
      console.error('Error saving job:', error);
      alert(error.response?.data?.error || 'Failed to save job. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      company_name: job.company_name,
      location: job.location || '',
      job_type: job.job_type,
      category: job.category,
      description: job.description || '',
      requirements: job.requirements || '',
      salary_range: job.salary_range || '',
      application_url: job.application_url,
      expires_at: job.expires_at ? job.expires_at.split('T')[0] : '',
      featured: job.featured,
      is_active: job.is_active
    });
    setPreviewUrl(job.company_logo || '');
    setLogoFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job listing? This action cannot be undone.')) {
      return;
    }

    try {
      // FIXED: changed from '/admin/jobs' to '/jobs'
      await adminApi.delete(`/jobs/${id}`);
      alert('Job deleted successfully!');
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Failed to delete job. Please try again.');
    }
  };

  const toggleJobStatus = async (id, currentStatus) => {
    try {
      // FIXED: changed from '/admin/jobs' to '/jobs'
      await adminApi.patch(`/jobs/${id}/status`, {
        is_active: !currentStatus
      });
      alert(`Job ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      alert('Failed to update job status.');
    }
  };

  const resetForm = () => {
    setFormData(formDataTemplate);
    setEditingJob(null);
    setLogoFile(null);
    setPreviewUrl('');
    setShowForm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleViewJob = (applicationUrl) => {
    window.open(applicationUrl, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getJobTypeBadge = (type) => {
    const colors = {
      'full-time': 'bg-green-100 text-green-800',
      'part-time': 'bg-blue-100 text-blue-800',
      'contract': 'bg-yellow-100 text-yellow-800',
      'internship': 'bg-purple-100 text-purple-800',
      'remote': 'bg-indigo-100 text-indigo-800'
    };
    
    const label = type.replace('-', ' ').toUpperCase();
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {label}
      </span>
    );
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading job listings...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Job Listings Manager</h1>
          <p className="text-gray-600">Post and manage job opportunities on your website</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Post New Job
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-gray-600">Total Jobs</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <div className="text-3xl font-bold text-green-600">{stats.active}</div>
          <div className="text-gray-600">Active</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <div className="text-3xl font-bold text-purple-600">{stats.featured}</div>
          <div className="text-gray-600">Featured</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <div className="text-3xl font-bold text-orange-600">{stats.clicks}</div>
          <div className="text-gray-600">Total Clicks</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <div className="text-3xl font-bold text-teal-600">{stats.internships}</div>
          <div className="text-gray-600">Internships</div>
        </div>
      </div>

      {/* Job Creation/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingJob ? 'Edit Job Listing' : 'Create New Job Listing'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Senior Frontend Developer"
                    required
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., TechCorp Inc."
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="flex items-center">
                    <MapPin className="text-gray-400 mr-2 w-4 h-4" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Remote, San Francisco, CA"
                    />
                  </div>
                </div>

                {/* Job Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type *
                  </label>
                  <select
                    name="job_type"
                    value={formData.job_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {jobTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Range
                  </label>
                  <div className="flex items-center">
                    <DollarSign className="text-gray-400 mr-2 w-4 h-4" />
                    <input
                      type="text"
                      name="salary_range"
                      value={formData.salary_range}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., $80,000 - $120,000"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Application URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application URL *
                  </label>
                  <div className="flex items-center">
                    <Globe className="text-gray-400 mr-2 w-4 h-4" />
                    <input
                      type="url"
                      name="application_url"
                      value={formData.application_url}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://company.com/careers/apply"
                      required
                    />
                  </div>
                </div>

                {/* Expiration Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration Date *
                  </label>
                  <div className="flex items-center">
                    <Calendar className="text-gray-400 mr-2 w-4 h-4" />
                    <input
                      type="date"
                      name="expires_at"
                      value={formData.expires_at}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Company Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer block">
                      {previewUrl ? (
                        <div className="space-y-2">
                          <img
                            src={previewUrl}
                            alt="Logo preview"
                            className="h-20 mx-auto object-contain"
                            width="80"
                            height="80"
                            loading='lazy'
                          />
                          <p className="text-sm text-gray-500">Click to change logo</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                          <p className="text-gray-600">Click to upload company logo</p>
                          <p className="text-sm text-gray-500">PNG, JPG, SVG, WebP (Max 5MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Featured & Active Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="featured"
                      name="featured"
                      checked={formData.featured}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
                      Mark as Featured (shows at top of listings)
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                      Active (visible on website)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-14 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detailed job description, responsibilities, and expectations..."
                required
              />
            </div>

            {/* Requirements */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requirements & Qualifications
              </label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Required skills, education, experience level..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate requirements with bullet points or new lines
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingJob ? 'Update Job' : 'Create Job'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">All Job Listings</h3>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No job listings yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Click "Post New Job" to create your first listing
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          {job.company_logo ? (
                            <img 
                              src={job.company_logo} 
                              alt={job.company_name}
                              className="w-8 h-8 object-contain"
                              width="32"
                              height="32"
                              loading='lazy'
                            />
                          ) : (
                            <Briefcase className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{job.title}</div>
                          <div className="text-sm text-gray-500">{job.company_name}</div>
                          <div className="text-xs text-gray-400">{job.category}</div>
                        </div>
                        {job.featured && (
                          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getJobTypeBadge(job.job_type)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleJobStatus(job.id, job.is_active)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.is_active && new Date(job.expires_at) >= new Date()
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {job.is_active && new Date(job.expires_at) >= new Date() ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(job.expires_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <BarChart className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="font-medium">{job.clicks || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewJob(job.application_url)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View Application Page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(job)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export/Import Section (Optional) */}
      <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Bulk Operations</h3>
        <div className="flex space-x-4">
          <button
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            onClick={() => alert('Export functionality coming soon!')}
          >
            Export Jobs (CSV)
          </button>
          <button
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            onClick={() => alert('Import functionality coming soon!')}
          >
            Import Jobs
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobManager;