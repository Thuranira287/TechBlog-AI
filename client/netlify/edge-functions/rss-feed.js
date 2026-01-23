export default async (request, context) => {
  const posts = await fetch('https://techblogai-backend.onrender.com/api/posts/recent?limit=20')
    .then(r => r.json());
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TechBlog AI</title>
    <description>AI and technology insights</description>
    <link>https://aitechblogs.netlify.app</link>
    <atom:link href="https://aitechblogs.netlify.app/rss.xml" rel="self" type="application/rss+xml"/>
    ${posts.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(post.excerpt)}</description>
      <link>https://aitechblogs.netlify.app/post/${post.slug}</link>
      <guid>https://aitechblogs.netlify.app/post/${post.slug}</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>
    </item>
    `).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;',
    "'": '&apos;', '"': '&quot;'
  })[c]);
}

export const config = { path: "/rss.xml" };