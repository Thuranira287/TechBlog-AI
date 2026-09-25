export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secret = request.headers.get('x-purge-secret');
  if (!secret || secret !== Deno.env.get('CACHE_PURGE_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug, categorySlug } = body || {};

  if (!slug && !categorySlug) {
    return new Response(JSON.stringify({ error: 'slug or categorySlug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const purged = [];

  try {
    if (slug) {
      const postCache = await caches.open('post-cache');
      const deleted = await postCache.delete(`post-${slug}`);
      purged.push({ key: `post-${slug}`, deleted });
    }

    if (categorySlug) {
      const categoryCache = await caches.open('category-cache');
      for (let page = 1; page <= 5; page++) {
        const key = `category-${categorySlug}-page-${page}`;
        const deleted = await categoryCache.delete(key);
        purged.push({ key, deleted });
      }
    }

    return new Response(JSON.stringify({ success: true, purged }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PurgeCache] Error:', error.message);
    return new Response(JSON.stringify({ error: 'Purge failed', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/internal/purge-cache',
  onError: 'bypass',
};
