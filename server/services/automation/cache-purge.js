const FRONTEND_URL = process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app';

export async function purgeSsrCache({ slug, categorySlug } = {}) {
  const secret = process.env.CACHE_PURGE_SECRET;
  if (!secret) {
    console.warn('[CachePurge] CACHE_PURGE_SECRET not configured, skipping purge');
    return { skipped: true };
  }
  if (!slug && !categorySlug) return { skipped: true };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${FRONTEND_URL}/internal/purge-cache`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-purge-secret': secret,
      },
      body: JSON.stringify({ slug, categorySlug }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[CachePurge] Non-OK response: ${response.status}`);
      return { success: false, status: response.status };
    }

    return { success: true, ...(await response.json()) };
  } catch (error) {
    // Never let a cache purge failure bubble up and fail a publish.
    console.warn('[CachePurge] Request failed (non-fatal):', error.message);
    return { success: false, error: error.message };
  }
}

