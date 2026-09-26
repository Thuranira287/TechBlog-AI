import Parser from 'rss-parser';
import { normalizeJob, validateNormalizedJob } from '../ai/job-normalizer.service.js';
import { computeJobFingerprint, isSafePublicUrl } from './utils.js';
import { purgeSsrCache } from './cache-purge.js';

const rssParser = new Parser({ timeout: 15000 });

function formatSalaryRange(min, max, currency) {
  if (min == null && max == null) return null;
  const cur = currency || 'USD';
  if (min != null && max != null) return `${cur} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  if (min != null) return `${cur} ${min.toLocaleString()}+`;
  return `Up to ${cur} ${max.toLocaleString()}`;
}

async function fetchSourceItems(source) {
  if (!isSafePublicUrl(source.feed_url)) {
    throw new Error(`feed_url is not a safe public URL: ${source.feed_url}`);
  }

  if (source.source_type === 'rss') {
    const feed = await rssParser.parseURL(source.feed_url);
    return (feed.items || []).map((item) => ({
      raw: item,
      title: item.title,
      application_url: item.link,
      source_url: item.link,
      posted_at: item.pubDate || item.isoDate || null,
      description: item.contentSnippet || item.content || item.summary || '',
    }));
  }

  if (source.source_type === 'json_api') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(source.feed_url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.jobs || data.results || data.data || []);
      return items.map((item) => ({
        raw: item,
        title: item.title,
        application_url: item.url || item.application_url || item.link,
        source_url: item.url || item.application_url || item.link,
        posted_at: item.posted_at || item.date || item.created_at || null,
        description: item.description || item.summary || '',
      }));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`source_type "${source.source_type}" has no automated fetcher configured`);
}

async function processSource(pool, source, runId) {
  const stats = { sourceId: source.id, discovered: 0, duplicates: 0, published: 0, rejected: 0, failed: 0 };

  let items;
  try {
    items = await fetchSourceItems(source);
  } catch (error) {
    console.error(`[JobDiscovery] Source "${source.name}" fetch failed:`, error.message);
    await pool.execute(
      `UPDATE job_sources SET last_checked_at = NOW(), last_error = ?, consecutive_failures = consecutive_failures + 1 WHERE id = ?`,
      [error.message, source.id]
    );
    stats.failed = 1;
    return stats;
  }

  // Freshness
  const freshnessCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const freshItems = items.filter((item) => {
    if (!item.posted_at) return true; // no date info - process it, dedupe will still catch repeats
    const t = new Date(item.posted_at).getTime();
    return isNaN(t) || t >= freshnessCutoff;
  });

  for (const item of freshItems) {
    stats.discovered++;

    if (!item.title || !item.application_url || !isSafePublicUrl(item.application_url)) {
      stats.rejected++;
      continue;
    }

    // Normalize via Claude
    let normalized;
    try {
      normalized = await normalizeJob(item.raw);
    } catch (error) {
      console.error(`[JobDiscovery] Normalization failed for "${item.title}":`, error.message);
      stats.failed++;
      continue;
    }

    normalized.application_url = item.application_url;
    normalized.source_url = item.source_url;
    normalized.source_name = source.name;

    // Validate
    const validationErrors = validateNormalizedJob(normalized, item.raw);
    if (validationErrors.length > 0) {
      console.warn(`[JobDiscovery] Rejected "${item.title}": ${validationErrors.join('; ')}`);
      stats.rejected++;
      continue;
    }

    // Fingerprint dedupe
    const fingerprint = computeJobFingerprint({
      company: normalized.company_name,
      title: normalized.title,
      location: normalized.location,
      applicationUrl: normalized.application_url,
    });

    const [existing] = await pool.execute('SELECT id FROM job_listings WHERE fingerprint = ? LIMIT 1', [fingerprint]);
    if (existing.length > 0) {
      stats.duplicates++;
      continue;
    }

    // Determine status
    const autoPublish = process.env.AUTO_PUBLISH_JOBS === 'true';
    const status = (autoPublish && source.trusted) ? 'published' : 'pending_review';

    const salaryRange = formatSalaryRange(normalized.salary_min, normalized.salary_max, normalized.salary_currency);

    try {
      const [insertResult] = await pool.execute(
        `INSERT INTO job_listings (
          title, company_name, location, job_type, category, description, requirements,
          salary_range, salary_min, salary_max, salary_currency, application_url,
          expires_at, featured, is_active, status, source_id, source_url, source_name,
          remote_type, experience_level, responsibilities, qualifications, skills,
          fingerprint, discovered_at, automation_run_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          normalized.title, normalized.company_name, normalized.location || null,
          normalized.job_type || 'full-time', normalized.category || 'Software Engineering',
          normalized.description || '', normalized.requirements || null,
          salaryRange, normalized.salary_min ?? null, normalized.salary_max ?? null, normalized.salary_currency ?? null,
          normalized.application_url, normalized.deadline || null,
          status === 'published' ? 1 : 0, status,
          source.id, normalized.source_url, normalized.source_name,
          normalized.remote_type || null, normalized.experience_level || null,
          normalized.responsibilities || null, normalized.qualifications || null,
          JSON.stringify(normalized.skills || []),
          fingerprint, runId,
        ]
      );

      if (status === 'published') {
        stats.published++;
        purgeSsrCache({ jobId: insertResult.insertId }).catch(() => {});
      }
    } catch (error) {
      console.error(`[JobDiscovery] Insert failed for "${normalized.title}":`, error.message);
      stats.failed++;
    }
  }

  await pool.execute(
    `UPDATE job_sources SET last_checked_at = NOW(), last_success_at = NOW(), last_error = NULL, consecutive_failures = 0 WHERE id = ?`,
    [source.id]
  );

  return stats;
}

export async function runJobDiscovery(pool, { runId } = {}) {
  const [sources] = await pool.execute('SELECT * FROM job_sources WHERE enabled = TRUE');

  const totals = { sourcesChecked: 0, discovered: 0, duplicates: 0, published: 0, rejected: 0, failed: 0 };

  for (const source of sources) {
    const stats = await processSource(pool, source, runId);
    totals.sourcesChecked++;
    totals.discovered += stats.discovered;
    totals.duplicates += stats.duplicates;
    totals.published += stats.published;
    totals.rejected += stats.rejected;
    totals.failed += stats.failed;
  }
  return totals;
}

export async function expireStaleJobs(pool) {
  const [result] = await pool.execute(
    `UPDATE job_listings SET status = 'expired', is_active = FALSE
     WHERE expires_at IS NOT NULL AND expires_at < NOW()
     AND status IN ('published', 'approved') `
  );
  return { expired: result.affectedRows };
}
