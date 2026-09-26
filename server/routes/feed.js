import { Router } from 'express';
import {pool} from '../config/db.js';

const router = Router();
 
router.get('/rss.xml', async (req, res) => {
  try {
    const baseUrl =
      process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app';

    const [posts] = await pool.execute(
      `
      SELECT 
        slug,
        title,
        excerpt,
        published_at,
        updated_at
      FROM posts
      WHERE status = 'published'
      ORDER BY published_at DESC
      LIMIT 50
      `
    );

    const lastBuildDate = posts.length
      ? new Date(posts[0].updated_at || posts[0].published_at).toUTCString()
      : new Date().toUTCString();

    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>TechBlog AI</title>
  <link>${baseUrl}</link>
  <description>Latest AI and technology posts</description>
  <language>en-US</language>

  <atom:link href="${baseUrl}/rss.xml"
             rel="self"
             type="application/rss+xml" />

  <lastBuildDate>${lastBuildDate}</lastBuildDate>
  <ttl>60</ttl>`;

    for (const post of posts) {
      const postUrl = `${baseUrl}/post/${post.slug}`;
      const pubDate = new Date(
        post.published_at || post.updated_at
      ).toUTCString();

      rss += `
  <item>
    <title><![CDATA[${post.title}]]></title>
    <link>${postUrl}</link>
    <guid isPermaLink="true">${postUrl}</guid>
    <pubDate>${pubDate}</pubDate>
    <description><![CDATA[${
      post.excerpt || 'Read the full article on TechBlog AI.'
    }]]></description>
  </item>`;
    }

    rss += `
</channel>
</rss>`;

    res.set({
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'all',
    });

    res.send(rss);
  } catch (err) {
    console.error('RSS generation error:', err);
    res.status(500).send('Failed to generate RSS feed');
  }
});

// Jobs feed 
router.get('/jobs-feed.xml', async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app';

    const [jobs] = await pool.execute(
      `SELECT id, title, company_name, location, job_type, description, posted_at, updated_at
       FROM job_listings
       WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at >= CURDATE())
       ORDER BY posted_at DESC
       LIMIT 50`
    );

    const lastBuildDate = jobs.length
      ? new Date(jobs[0].updated_at || jobs[0].posted_at).toUTCString()
      : new Date().toUTCString();

    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>TechBlog AI Jobs</title>
  <link>${baseUrl}/jobs</link>
  <description>Latest technology job listings on TechBlog AI</description>
  <language>en-US</language>

  <atom:link href="${baseUrl}/jobs-feed.xml"
             rel="self"
             type="application/rss+xml" />

  <lastBuildDate>${lastBuildDate}</lastBuildDate>
  <ttl>60</ttl>`;

    for (const job of jobs) {
      const jobUrl = `${baseUrl}/jobs/${job.id}`;
      const pubDate = new Date(job.posted_at || job.updated_at).toUTCString();
      const titleLine = `${job.title} at ${job.company_name}`;

      rss += `
  <item>
    <title><![CDATA[${titleLine}]]></title>
    <link>${jobUrl}</link>
    <guid isPermaLink="true">${jobUrl}</guid>
    <pubDate>${pubDate}</pubDate>
    <description><![CDATA[${
      [job.location, job.job_type].filter(Boolean).join(' - ') || 'View full details on TechBlog AI.'
    }]]></description>
  </item>`;
    }

    rss += `
</channel>
</rss>`;

    res.set({
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'all',
    });

    res.send(rss);
  } catch (err) {
    console.error('Jobs feed generation error:', err);
    res.status(500).send('Failed to generate jobs feed');
  }
});

export default router;
