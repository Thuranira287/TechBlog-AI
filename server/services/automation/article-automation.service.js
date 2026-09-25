import { discoverTopic, generateArticle, recordTopicOutcome } from '../ai/article-generator.service.js';
import { validateArticleData, generateSlug, normalizeTopicKey } from './utils.js';
import { purgeSsrCache } from './cache-purge.js';
import { submitSitemapToSearchEngines } from '../../utils/sitemapSubmitter.js';
import { generateFeaturedImage } from './image-pipeline.service.js';
import { ImageGenerationError } from '../ai/image-generation.service.js';
import sanitizeHtml from 'sanitize-html';

const CONTENT_SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'br', 'span', 'img'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    span: ['style']
  },
  allowedSchemes: ['http', 'https', 'mailto']
};

const FALLBACK_FEATURED_IMAGE = process.env.AI_ARTICLE_FALLBACK_IMAGE
  || 'https://res.cloudinary.com/dkcgcnrcv/image/upload/f_auto,q_auto,w_1200/techblogai/featured-images/default-article-cover.png';

function isAutomationEnabled() {
  return process.env.AI_ARTICLE_AUTOMATION_ENABLED === 'true';
}

function isAutoPublishEnabled() {
  return process.env.AI_ARTICLE_AUTO_PUBLISH === 'true';
}

function isImageRequiredForPublish() {
  return process.env.IMAGE_REQUIRED_FOR_PUBLISH !== 'false'; // default true - safe by default
}

function getMaxPerDay() {
  return parseInt(process.env.AI_ARTICLE_MAX_PER_DAY || '2', 10);
}

async function acquireRunLock(pool, type, triggeredBy, triggeredByUserId) {
  const [running] = await pool.execute(
    `SELECT id FROM automation_runs WHERE type = ? AND status = 'running'
     AND started_at > (NOW() - INTERVAL 30 MINUTE)`,
    [type]
  );
  if (running.length > 0) {
    return null; // another run holds the lock; a run "running" for 30+
  }

  const [result] = await pool.execute(
    `INSERT INTO automation_runs (type, status, triggered_by, triggered_by_user_id)
     VALUES (?, 'running', ?, ?)`,
    [type, triggeredBy, triggeredByUserId]
  );
  return result.insertId;
}

async function completeRun(pool, runId, { status, itemsProcessed = 0, itemsCreated = 0, itemsPublished = 0, itemsRejected = 0, errorCount = 0, errorMessage = null, metadata = null }) {
  await pool.execute(
    `UPDATE automation_runs SET
      status = ?, completed_at = NOW(), items_processed = ?, items_created = ?,
      items_published = ?, items_rejected = ?, error_count = ?, error_message = ?, metadata = ?
     WHERE id = ?`,
    [status, itemsProcessed, itemsCreated, itemsPublished, itemsRejected, errorCount, errorMessage, metadata ? JSON.stringify(metadata) : null, runId]
  );
}

async function ensureUniqueSlug(pool, baseSlug) {
  let slug = baseSlug;
  let suffix = 1;
  while (suffix < 50) {
    const [rows] = await pool.execute('SELECT id FROM posts WHERE slug = ? LIMIT 1', [slug]);
    if (rows.length === 0) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  throw new Error(`Could not find a unique slug after ${suffix} attempts for base "${baseSlug}"`);
}

export async function runArticleAutomation(pool, { triggeredBy = 'scheduler', triggeredByUserId = null } = {}) {
  if (!isAutomationEnabled()) {
    return { skipped: true, reason: 'AI_ARTICLE_AUTOMATION_ENABLED is not true' };
  }

  // Daily cap check, before acquiring the lock (cheap early exit).
  const [[{ todayCount }]] = await pool.execute(
    `SELECT COUNT(*) AS todayCount FROM posts
     WHERE generation_source = 'ai' AND created_at >= CURDATE()`
  );
  const maxPerDay = getMaxPerDay();
  if (todayCount >= maxPerDay) {
    return { skipped: true, reason: `Daily cap reached (${todayCount}/${maxPerDay})` };
  }

  const runId = await acquireRunLock(pool, 'article_generation', triggeredBy, triggeredByUserId);
  if (runId === null) {
    return { skipped: true, reason: 'Another article_generation run is already in progress' };
  }

  try {
    // Topic discovery
    const preferredCategories = (process.env.AI_ARTICLE_PREFERRED_CATEGORIES || '')
      .split(',').map((c) => c.trim()).filter(Boolean);

    const topicResult = await discoverTopic(pool, { preferredCategories });
    if (!topicResult) {
      await completeRun(pool, runId, {
        status: 'failed', itemsProcessed: 1, errorCount: 1,
        errorMessage: 'Could not find a non-duplicate topic after max attempts',
      });
      return { success: false, runId, reason: 'no_unique_topic' };
    }
    const { topic, category } = topicResult;

    // Generation
    let article;
    try {
      article = await generateArticle(pool, {
        topic,
        category,
        model: process.env.AI_MODEL,
        timeoutMs: parseInt(process.env.AI_API_TIMEOUT_MS || '60000', 10),
        maxRetries: parseInt(process.env.AI_API_MAX_RETRIES || '2', 10),
      });
    } catch (genError) {
      console.error('[ArticleAutomation] Generation failed:', genError.message);
      await recordTopicOutcome(pool, { topic, category, outcome: 'rejected_other', automationRunId: runId });
      await completeRun(pool, runId, {
        status: 'failed', itemsProcessed: 1, errorCount: 1, errorMessage: genError.message,
      });
      return { success: false, runId, reason: 'generation_failed', error: genError.message };
    }

    // Sanitize the AI-generatedHTML
    article.content = sanitizeHtml(article.content || '', CONTENT_SANITIZE_OPTIONS);

    //Validation
    const validationErrors = validateArticleData(article, {
      minWords: parseInt(process.env.AI_ARTICLE_MIN_WORDS || '1200', 10),
    });
    if (validationErrors.length > 0) {
      await recordTopicOutcome(pool, { topic, category, outcome: 'rejected_other', automationRunId: runId });
      await completeRun(pool, runId, {
        status: 'failed', itemsProcessed: 1, itemsRejected: 1, errorCount: 1,
        errorMessage: `Validation failed: ${validationErrors.join('; ')}`,
      });
      return { success: false, runId, reason: 'validation_failed', errors: validationErrors };
    }

    // Slug uniqueness
    const baseSlug = generateSlug(article.suggested_slug || article.title);
    const slug = await ensureUniqueSlug(pool, baseSlug);

    // Featured image generation
    let featuredImage = null;
    let featuredImagePublicId = null;
    let featuredImageAlt = null;
    let imageGenerationStatus;
    let imageGenerationError = null;
    let forcePendingReview = false;

    if (process.env.IMAGE_GENERATION_ENABLED === 'true') {
      try {
        const image = await generateFeaturedImage(article.featured_image, slug, article.title);
        featuredImage = image.url;
        featuredImagePublicId = image.publicId;
        featuredImageAlt = image.altText;
        imageGenerationStatus = 'ok';
      } catch (imageError) {
        console.error('[ArticleAutomation] Image generation failed:', imageError.message);
        imageGenerationError = imageError.message;

        if (isImageRequiredForPublish()) {
          imageGenerationStatus = 'failed';
          forcePendingReview = true;
        } else {
          featuredImage = FALLBACK_FEATURED_IMAGE;
          imageGenerationStatus = 'fallback_used';
        }
      }
    } else {
      featuredImage = FALLBACK_FEATURED_IMAGE;
      imageGenerationStatus = 'fallback_used';
    }

    // Resolve category and author
    const [categoryRows] = await pool.execute(
      'SELECT id FROM categories WHERE name = ? LIMIT 1',
      [article.category || category]
    );
    const categoryId = categoryRows[0]?.id || null;
    if (!categoryId) {
      await recordTopicOutcome(pool, { topic, category, outcome: 'rejected_other', automationRunId: runId });
      await completeRun(pool, runId, {
        status: 'failed', itemsProcessed: 1, itemsRejected: 1, errorCount: 1,
        errorMessage: `No matching category found for "${article.category || category}"`,
      });
      return { success: false, runId, reason: 'unknown_category' };
    }

    const [authorRows] = await pool.execute('SELECT id FROM authors LIMIT 1');
    const authorId = authorRows[0]?.id || null;

    // Determine status
    const requireReview = process.env.AI_ARTICLE_REVIEW_REQUIRED !== 'false';
    const status = (!forcePendingReview && !requireReview && isAutoPublishEnabled()) ? 'published' : 'pending_review';

    // Insert
    const [insertResult] = await pool.execute(
      `INSERT INTO posts (
        title, slug, excerpt, content, featured_image, featured_image_public_id,
        featured_image_alt, featured_image_spec, author_id, category_id, status,
        meta_title, meta_description, keywords, og_title, og_description, tags,
        generation_source, ai_model, automation_run_id, prompt_version, source_references,
        generation_status, image_generation_status, image_generation_attempts,
        image_generation_error, topic_key, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai', ?, ?, ?, ?, 'ok', ?, 1, ?, ?, ?)`,
      [
        article.title, slug, article.excerpt, article.content, featuredImage,
        featuredImagePublicId, featuredImageAlt,
        article.featured_image ? JSON.stringify(article.featured_image) : null,
        authorId, categoryId, status,
        article.meta_title, article.meta_description, article.keywords || null,
        article.og_title || article.meta_title, article.og_description || article.meta_description,
        JSON.stringify(article.tags || []),
        process.env.AI_MODEL || 'claude-sonnet-4-5-20250929', runId, 'v1',
        JSON.stringify(article.sources || []),
        imageGenerationStatus, imageGenerationError,
        normalizeTopicKey(topic),
        status === 'published' ? new Date() : null,
      ]
    );

    const postId = insertResult.insertId;
    await recordTopicOutcome(pool, { topic, category, outcome: 'generated', postId, automationRunId: runId });

    // Cache invalidation + sitemap
    if (status === 'published') {
      await purgeSsrCache({ slug });
      try {
        await submitSitemapToSearchEngines();
      } catch (sitemapError) {
        console.warn('[ArticleAutomation] Sitemap submission failed (non-fatal):', sitemapError.message);
      }
    }

    await completeRun(pool, runId, {
      status: 'success', itemsProcessed: 1, itemsCreated: 1,
      itemsPublished: status === 'published' ? 1 : 0,
      metadata: { topic, category, slug, status, postId },
    });

    return { success: true, runId, postId, slug, status };
  } catch (error) {
    console.error('[ArticleAutomation] Unexpected error:', error);
    await completeRun(pool, runId, {
      status: 'failed', itemsProcessed: 1, errorCount: 1, errorMessage: error.message,
    }).catch(() => {});
    return { success: false, runId, reason: 'unexpected_error', error: error.message };
  }
}

