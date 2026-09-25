import cron from 'node-cron';
import { runArticleAutomation } from './article-automation.service.js';
import { runJobDiscovery, expireStaleJobs } from './job-discovery.service.js';

const inFlight = { article: false, jobDiscovery: false, jobExpiration: false };

async function acquireJobDiscoveryLock(pool) {
  const [running] = await pool.execute(
    `SELECT id FROM automation_runs WHERE type = 'job_discovery' AND status = 'running'
     AND started_at > (NOW() - INTERVAL 30 MINUTE)`
  );
  if (running.length > 0) return null;
  const [result] = await pool.execute(
    `INSERT INTO automation_runs (type, status, triggered_by) VALUES ('job_discovery', 'running', 'scheduler')`
  );
  return result.insertId;
}

async function completeJobDiscoveryRun(pool, runId, totals, error = null) {
  await pool.execute(
    `UPDATE automation_runs SET status = ?, completed_at = NOW(), items_processed = ?,
      items_published = ?, items_rejected = ?, error_count = ?, error_message = ?, metadata = ?
     WHERE id = ?`,
    [
      error ? 'failed' : 'success',
      totals?.discovered || 0, totals?.published || 0, totals?.rejected || 0,
      error ? 1 : (totals?.failed || 0), error?.message || null,
      totals ? JSON.stringify(totals) : null,
      runId,
    ]
  );
}

async function tickArticleAutomation(pool) {
  if (inFlight.article) {
    return { skipped: true, reason: 'Already running in this process' };
  }
  inFlight.article = true;
  try {
    const result = await runArticleAutomation(pool, { triggeredBy: 'scheduler' });
    console.log('[Scheduler] article_generation tick:', JSON.stringify(result));
    return result;
  } catch (error) {
    // The service itself already catches and records failures to
    // automation_runs; this catch is a last-resort net so a bug in the
    // service can never crash the scheduler (and therefore the server).
    console.error('[Scheduler] Unexpected error in article automation tick:', error);
    return { success: false, reason: 'unexpected_error', error: error.message };
  } finally {
    inFlight.article = false;
  }
}

async function tickJobDiscovery(pool) {
  if (inFlight.jobDiscovery) {
    return { skipped: true, reason: 'Already running in this process' };
  }
  inFlight.jobDiscovery = true;
  const runId = await acquireJobDiscoveryLock(pool).catch((err) => {
    console.error('[Scheduler] Failed to acquire job_discovery lock:', err.message);
    return null;
  });
  if (runId === null) {
    inFlight.jobDiscovery = false;
    return { skipped: true, reason: 'Another job_discovery run is already in progress' };
  }
  try {
    const totals = await runJobDiscovery(pool, { runId });
    await completeJobDiscoveryRun(pool, runId, totals);
    console.log('[Scheduler] job_discovery tick:', JSON.stringify(totals));
    return { success: true, runId, ...totals };
  } catch (error) {
    console.error('[Scheduler] job_discovery tick failed:', error);
    await completeJobDiscoveryRun(pool, runId, null, error).catch(() => {});
    return { success: false, runId, error: error.message };
  } finally {
    inFlight.jobDiscovery = false;
  }
}

async function tickJobExpiration(pool) {
  if (inFlight.jobExpiration) {
    return { skipped: true, reason: 'Already running in this process' };
  }
  inFlight.jobExpiration = true;
  try {
    const result = await expireStaleJobs(pool);
    if (result.expired > 0) {
      console.log(`[Scheduler] job_expiration tick: expired ${result.expired} job(s)`);
    }
    return { success: true, ...result };
  } catch (error) {
    console.error('[Scheduler] job_expiration tick failed:', error);
    return { success: false, error: error.message };
  } finally {
    inFlight.jobExpiration = false;
  }
}

export function startScheduler(pool) {
  if (process.env.AI_ARTICLE_AUTOMATION_ENABLED === 'true') {
    const articleSchedule = process.env.AI_ARTICLE_CRON || '0 8,16 * * *'; // 8am and 4pm by default
    cron.schedule(articleSchedule, () => tickArticleAutomation(pool));
    console.log(`[Scheduler] Article automation scheduled: "${articleSchedule}"`);
  } else {
    console.log('[Scheduler] Article automation is disabled (AI_ARTICLE_AUTOMATION_ENABLED != true)');
  }

  const jobDiscoverySchedule = process.env.JOB_DISCOVERY_CRON || '0 */3 * * *'; // every 3 hours by default
  cron.schedule(jobDiscoverySchedule, () => tickJobDiscovery(pool));
  console.log(`[Scheduler] Job discovery scheduled: "${jobDiscoverySchedule}"`);

  const jobExpirationSchedule = process.env.JOB_EXPIRATION_CRON || '0 */6 * * *';
  cron.schedule(jobExpirationSchedule, () => tickJobExpiration(pool));
  console.log(`[Scheduler] Job expiration scheduled: "${jobExpirationSchedule}"`);
}

// Exposed
export { tickArticleAutomation, tickJobDiscovery, tickJobExpiration };
