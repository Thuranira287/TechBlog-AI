import express from 'express';
import multer from 'multer';
import { pool } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadJobLogoToCloudinary } from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ====== PUBLIC ROUTES ======
// GET all active jobs
router.get('/public', async (req, res) => {
  try {
    const { type, category, search } = req.query;
    
    let query = `
      SELECT id, title, company_name, company_logo, location, job_type, category, 
             description, requirements, salary_range, application_url, 
             featured, posted_at, expires_at, views, clicks
      FROM job_listings 
      WHERE is_active = TRUE 
        AND (expires_at IS NULL OR expires_at >= CURDATE())
    `;
    
    const params = [];

    if (type && type !== 'all') {
      query += ` AND job_type = ?`;
      params.push(type);
    }
    
    if (category && category !== 'all') {
      query += ` AND category = ?`;
      params.push(category);
    }
    
    if (search) {
      query += ` AND (title LIKE ? OR company_name LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY featured DESC, posted_at DESC`;
    if (process.env.NODE_ENV !== 'production') {
    console.log('Executing query:', query);
    console.log('With params:', params);}
    
    const [jobs] = await pool.execute(query, params);
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('Error fetching public jobs:', error);}
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message 
    });
  }
});

// GET single job details (public)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [jobs] = await pool.execute(
      `SELECT * FROM job_listings 
       WHERE id = ? 
         AND is_active = TRUE 
         AND (expires_at IS NULL OR expires_at >= CURDATE())`,
      [id]
    );
    
    if (jobs.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found or expired' 
      });
    }
    
    res.json({
      success: true,
      data: jobs[0]
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('Error fetching job details:', error);}
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch job details' 
    });
  }
});

// Track job view
router.post('/:id/view', async (req, res) => {
  try {
    await pool.execute(
      'UPDATE job_listings SET views = views + 1 WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('Error tracking view:', error);}
    res.status(500).json({ success: false, error: 'Failed to track view' });
  }
});

// Track job click
router.post('/:id/click', async (req, res) => {
  try {
    await pool.execute(
      'UPDATE job_listings SET clicks = clicks + 1 WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('Error tracking click:', error);}
    res.status(500).json({ success: false, error: 'Failed to track click' });
  }
});

// ====== ADMIN PROTECTED ROUTES ======

// GET all jobs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [jobs] = await pool.execute(
      `SELECT * FROM job_listings ORDER BY posted_at DESC`
    );
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('Error fetching admin jobs:', error);}
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message 
    });
  }
});

// GET single job by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [jobs] = await pool.execute(
      'SELECT * FROM job_listings WHERE id = ?',
      [req.params.id]
    );
    
    if (jobs.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }
    
    res.json({
      success: true,
      data: jobs[0]
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('Error fetching job:', error);}
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch job' 
    });
  }
});

// POST create new job
router.post('/', authenticateToken, upload.single('company_logo'), async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
    console.log('Creating new job...');
    console.log('Request body:', req.body);
    console.log('File present:', req.file ? 'Yes' : 'No');}

    const {
      title,
      company_name,
      location = '',
      job_type = 'full-time',
      category = 'Software Engineering',
      description,
      requirements = '',
      salary_range = '',
      application_url,
      expires_at,
      featured = false,
      is_active = true
    } = req.body;

    // Validate required fields
    if (!title || !company_name || !application_url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, company_name, and application_url are required'
      });
    }

    let logoUrl = '';
    if (req.file) {
      try {
        const uploadResult = await uploadJobLogoToCloudinary(
          req.file.buffer,
          company_name
        );
        logoUrl = uploadResult.secure_url;
        if (process.env.NODE_ENV !== 'production') {
        console.log('Logo uploaded to:', logoUrl);}
      } catch (uploadError) {
        if (process.env.NODE_ENV !== 'production') {
        console.error('Cloudinary upload error:', uploadError);}
        // Continue without logo if upload fails
      }
    }

    // Insert into database
    const [result] = await pool.execute(
      `INSERT INTO job_listings 
       (title, company_name, company_logo, location, job_type, category, 
        description, requirements, salary_range, application_url, 
        expires_at, featured, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        company_name.trim(),
        logoUrl,
        location.trim(),
        job_type,
        category,
        description,
        requirements,
        salary_range,
        application_url,
        expires_at || null,
        featured === true || featured === 'true' ? 1 : 0,
        is_active === true || is_active === 'true' ? 1 : 0
      ]
    );

    // Get the created job
    const [newJob] = await pool.execute(
      'SELECT * FROM job_listings WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: newJob[0]
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('Error creating job:', error);}
    res.status(500).json({
      success: false,
      error: 'Failed to create job',
      message: error.message,
      sql: error.sql
    });
  }
});

// PUT update job
router.put('/:id', authenticateToken, upload.single('company_logo'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if job exists
    const [existingJobs] = await pool.execute(
      'SELECT * FROM job_listings WHERE id = ?',
      [id]
    );
    
    if (existingJobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const existingJob = existingJobs[0];
    const {
      title,
      company_name,
      location,
      job_type,
      category,
      description,
      requirements,
      salary_range,
      application_url,
      expires_at,
      featured,
      is_active
    } = req.body;

    // Update logo if new file uploaded
    let logoUrl = existingJob.company_logo;
    if (req.file) {
      try {
        const uploadResult = await uploadJobLogoToCloudinary(
          req.file.buffer,
          company_name || existingJob.company_name
        );
        logoUrl = uploadResult.secure_url;
      } catch (uploadError) {
        if (process.env.NODE_ENV !== 'production') {
        console.error('Cloudinary upload error:', uploadError);}
        // Keep existing logo if upload fails
      }
    }

    await pool.execute(
      `UPDATE job_listings SET 
        title = ?, company_name = ?, company_logo = ?, location = ?, 
        job_type = ?, category = ?, description = ?, requirements = ?,
        salary_range = ?, application_url = ?, expires_at = ?, 
        featured = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title || existingJob.title,
        company_name || existingJob.company_name,
        logoUrl,
        location !== undefined ? location : existingJob.location,
        job_type || existingJob.job_type,
        category || existingJob.category,
        description || existingJob.description,
        requirements !== undefined ? requirements : existingJob.requirements,
        salary_range !== undefined ? salary_range : existingJob.salary_range,
        application_url || existingJob.application_url,
        expires_at !== undefined ? expires_at : existingJob.expires_at,
        featured !== undefined ? (featured === true || featured === 'true' ? 1 : 0) : existingJob.featured,
        is_active !== undefined ? (is_active === true || is_active === 'true' ? 1 : 0) : existingJob.is_active,
        id
      ]
    );

    // Get updated job
    const [updatedJob] = await pool.execute(
      'SELECT * FROM job_listings WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob[0]
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job',
      message: error.message
    });
  }
});

// DELETE job
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if job exists
    const [existingJobs] = await pool.execute(
      'SELECT * FROM job_listings WHERE id = ?',
      [id]
    );
    
    if (existingJobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    await pool.execute('DELETE FROM job_listings WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete job'
    });
  }
});

// PATCH update job status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    // Check if job exists
    const [existingJobs] = await pool.execute(
      'SELECT * FROM job_listings WHERE id = ?',
      [id]
    );
    
    if (existingJobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    await pool.execute(
      'UPDATE job_listings SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    );

    res.json({
      success: true,
      message: `Job ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job status'
    });
  }
});

export default router;