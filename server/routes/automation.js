import express from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../config/db.js';
import { tickArticleAutomation, tickJobDiscovery, tickJobExpiration } from '../services/automation/scheduler.js';
import { isSafePublicUrl } from '../services/automation/utils.js';
import { purgeSsrCache } from '../services/automation/cache-purge.js';
import { generateFeaturedImage } from '../services/automation/image-pipeline.service.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';

const router = express.Router();
const triggerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many manual automation triggers, please wait before trying again.' },
});

// Manual controls
router.post('/articles/run', triggerLimiter, async (req, res) => {
  const result = await tickArticleAutomation(pool);
  res.json(result);
});

router.post('/jobs/run', triggerLimiter, async (req, res) => {
  const result = await tickJobDiscovery(pool);
  res.json(result);
});

router.post('/jobs/expire', triggerLimiter, async (req, res) => {
  const result = await tickJobExpiration(pool);
  res.json(result);
});

// Status / observability
router.get('/status', async (req, res) => {
  try {
    const [[lastArticleRun]] = await pool.execute(
      `SELECT * FROM automation_runs WHERE type = 'article_generation' ORDER BY started_at DESC LIMIT 1`
    );
    const [[lastJobRun]] = await pool.execute(
      `SELECT * FROM automation_runs WHERE type = 'job_discovery' ORDER BY started_at DESC LIMIT 1`
    );
    const [[{ todayArticleCount }]] = await pool.execute(
      `SELECT COUNT(*) AS todayArticleCount FROM posts WHERE generation_source = 'ai' AND created_at >= CURDATE()`
    );
    const [[{ pendingArticles }]] = await pool.execute(
      `SELECT COUNT(*) AS pendingArticles FROM posts WHERE generation_source = 'ai' AND status = 'pending_review'`
    );
    const [[{ pendingJobs }]] = await pool.execute(
      `SELECT COUNT(*) AS pendingJobs FROM job_listings WHERE status = 'pending_review'`
    );
    const [[{ publishedJobsToday }]] = await pool.execute(
      `SELECT COUNT(*) AS publishedJobsToday FROM job_listings WHERE discovered_at >= CURDATE() AND status = 'published'`
    );

    res.json({
      article_automation: {
        enabled: process.env.AI_ARTICLE_AUTOMATION_ENABLED === 'true',
        auto_publish: process.env.AI_ARTICLE_AUTO_PUBLISH === 'true',
        max_per_day: parseInt(process.env.AI_ARTICLE_MAX_PER_DAY || '2', 10),
        generated_today: todayArticleCount,
        pending_review: pendingArticles,
        last_run: lastArticleRun || null,
      },
      job_automation: {
        auto_publish: process.env.AUTO_PUBLISH_JOBS === 'true',
        pending_review: pendingJobs,
        published_today: publishedJobsToday,
        last_run: lastJobRun || null,
      },
    });
  } catch (error) {
    console.error('[Automation] /status error:', error);
    res.status(500).json({ error: 'Failed to load automation status' });
  }
});

router.get('/runs', async (req, res) => {
  try {
    const type = req.query.type || null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const [runs] = type
      ? await pool.execute(
          `SELECT * FROM automation_runs WHERE type = ? ORDER BY started_at DESC LIMIT ${limit}`,
          [type]
        )
      : await pool.execute(`SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT ${limit}`);

    res.json({ runs });
  } catch (error) {
    console.error('[Automation] /runs error:', error);
    res.status(500).json({ error: 'Failed to load automation runs' });
  }
});

// Job source management
router.get('/job-sources', async (req, res) => {
  try {
    const [sources] = await pool.execute('SELECT * FROM job_sources ORDER BY name');
    res.json({ sources });
  } catch (error) {
    console.error('[Automation] GET /job-sources error:', error);
    res.status(500).json({ error: 'Failed to load job sources' });
  }
});

router.post('/job-sources', async (req, res) => {
  try {
    const { name, base_url, source_type, feed_url, enabled = true, trusted = false, check_interval_minutes = 180 } = req.body;

    if (!name || !base_url || !feed_url) {
      return res.status(400).json({ error: 'name, base_url, and feed_url are required' });
    }
    if (!isSafePublicUrl(base_url) || !isSafePublicUrl(feed_url)) {
      return res.status(400).json({ error: 'base_url and feed_url must be safe public http(s) URLs' });
    }
    if (!['rss', 'json_api', 'career_page'].includes(source_type)) {
      return res.status(400).json({ error: 'source_type must be one of: rss, json_api, career_page' });
    }

    const [result] = await pool.execute(
      `INSERT INTO job_sources (name, base_url, source_type, feed_url, enabled, trusted, check_interval_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, base_url, source_type, feed_url, !!enabled, !!trusted, check_interval_minutes]
    );

    const [[created]] = await pool.execute('SELECT * FROM job_sources WHERE id = ?', [result.insertId]);
    res.status(201).json({ source: created });
  } catch (error) {
    console.error('[Automation] POST /job-sources error:', error);
    res.status(500).json({ error: 'Failed to create job source' });
  }
});

router.patch('/job-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['name', 'base_url', 'source_type', 'feed_url', 'enabled', 'trusted', 'check_interval_minutes'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if ((field === 'base_url' || field === 'feed_url') && !isSafePublicUrl(req.body[field])) {
          return res.status(400).json({ error: `${field} must be a safe public http(s) URL` });
        }
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    await pool.execute(`UPDATE job_sources SET ${updates.join(', ')} WHERE id = ?`, values);

    const [[updated]] = await pool.execute('SELECT * FROM job_sources WHERE id = ?', [id]);
    if (!updated) return res.status(404).json({ error: 'Job source not found' });
    res.json({ source: updated });
  } catch (error) {
    console.error('[Automation] PATCH /job-sources/:id error:', error);
    res.status(500).json({ error: 'Failed to update job source' });
  }
});

// Article approve/reject

router.post('/articles/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const [[post]] = await pool.execute('SELECT id, slug, status FROM posts WHERE id = ?', [id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.status === 'published') return res.json({ success: true, message: 'Already published' });

    await pool.execute(
      `UPDATE posts SET status = 'published', published_at = COALESCE(published_at, NOW()) WHERE id = ?`,
      [id]
    );
    await purgeSsrCache({ slug: post.slug });

    res.json({ success: true, id, slug: post.slug, status: 'published' });
  } catch (error) {
    console.error('[Automation] approve article error:', error);
    res.status(500).json({ error: 'Failed to approve article' });
  }
});

router.post('/articles/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const [[post]] = await pool.execute(
      'SELECT id, generation_source, featured_image_public_id FROM posts WHERE id = ?',
      [id]
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });

    await pool.execute(`UPDATE posts SET status = 'rejected' WHERE id = ?`, [id]);
    if (post.generation_source === 'ai' && post.featured_image_public_id) {
      deleteFromCloudinary(post.featured_image_public_id).catch((err) => {
        console.warn(`[Automation] Cloudinary cleanup failed for rejected post ${id} (non-fatal):`, err.message);
      });
    }

    res.json({ success: true, id, status: 'rejected' });
  } catch (error) {
    console.error('[Automation] reject article error:', error);
    res.status(500).json({ error: 'Failed to reject article' });
  }
});

// Featured image regeneration
router.post('/articles/:id/regenerate-image', triggerLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';

    const [[post]] = await pool.execute(
      `SELECT id, slug, title, featured_image_spec, featured_image_public_id,
              image_generation_status, image_generation_attempts
       FROM posts WHERE id = ?`,
      [id]
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.image_generation_status === 'ok' && !force) {
      return res.status(400).json({
        error: 'This article already has a successfully generated image. Pass ?force=true to regenerate anyway.',
      });
    }

    if (!post.featured_image_spec) {
      return res.status(400).json({
        error: 'No stored image spec for this article (it predates image generation, or was created without one) - a new spec cannot be reconstructed automatically.',
      });
    }

    const spec = typeof post.featured_image_spec === 'string'
      ? JSON.parse(post.featured_image_spec)
      : post.featured_image_spec;

    const attempt = (post.image_generation_attempts || 0) + 1;
    const previousPublicId = post.featured_image_public_id;

    try {
      const image = await generateFeaturedImage(spec, post.slug, post.title, { attempt });

      await pool.execute(
        `UPDATE posts SET featured_image = ?, featured_image_public_id = ?, featured_image_alt = ?,
          image_generation_status = 'ok', image_generation_attempts = ?, image_generation_error = NULL
         WHERE id = ?`,
        [image.url, image.publicId, image.altText, attempt, id]
      );

      await purgeSsrCache({ slug: post.slug });
      res.json({
        success: true,
        id,
        featured_image: image.url,
        previous_public_id: previousPublicId,
        note: previousPublicId ? 'Previous image asset was kept (not auto-deleted) - see cleanup notes.' : undefined,
      });
    } catch (imageError) {
      await pool.execute(
        `UPDATE posts SET image_generation_status = 'failed', image_generation_attempts = ?, image_generation_error = ? WHERE id = ?`,
        [attempt, imageError.message, id]
      );
      res.status(502).json({ error: 'Image regeneration failed', message: imageError.message });
    }
  } catch (error) {
    console.error('[Automation] regenerate-image error:', error);
    res.status(500).json({ error: 'Failed to regenerate image' });
  }
});

// Job approve/reject
router.post('/jobs/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      `UPDATE job_listings SET status = 'published', is_active = TRUE WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, id, status: 'published' });
  } catch (error) {
    console.error('[Automation] approve job error:', error);
    res.status(500).json({ error: 'Failed to approve job' });
  }
});

router.post('/jobs/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      `UPDATE job_listings SET status = 'rejected', is_active = FALSE WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, id, status: 'rejected' });
  } catch (error) {
    console.error('[Automation] reject job error:', error);
    res.status(500).json({ error: 'Failed to reject job' });
  }
});

export default router;

