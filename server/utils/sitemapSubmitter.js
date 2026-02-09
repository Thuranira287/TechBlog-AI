import https from "https";

let lastPing = 0;
const PING_INTERVAL = 60 * 1000;

// Submit sitemap to Google & Bing //regular AND AI 
export async function submitSitemapToSearchEngines() {
  const now = Date.now();

  if (now - lastPing < PING_INTERVAL) {
    console.log("⏳ Sitemap ping skipped (rate-limited)");
    return [{ skipped: true }];
  }

  lastPing = now;
  const baseUrl = process.env.FRONTEND_URL || "https://aitechblogs.netlify.app";
  
  // Submit sitemaps
  const sitemaps = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap-ai.xml`
  ];

  const searchEngines = [
    { name: "Google", url: "https://www.google.com/ping?sitemap=" },
    { name: "Bing", url: "https://www.bing.com/ping?sitemap=" },
  ];

  const results = [];

  for (const sitemap of sitemaps) {
    const encodedSitemap = encodeURIComponent(sitemap);
    
    for (const engine of searchEngines) {
      await new Promise((resolve) => {
        https
          .get(engine.url + encodedSitemap, (res) => {
            results.push({
              sitemap: sitemap.includes('ai') ? 'AI Sitemap' : 'Main Sitemap',
              engine: engine.name,
              success: res.statusCode === 200,
              status: res.statusCode,
            });
            resolve();
          })
          .on("error", (err) => {
            console.error(`Error pinging ${engine.name}:`, err.message);
            resolve();
          });
      });
    }
  }

  console.log(' Sitemap submission results:', results);
  return results;
}

// Submit single URL via IndexNow
export async function submitUrlToIndexNow(url) {
  const apiKey = process.env.INDEXNOW_API_KEY;

  if (!apiKey) return { success: false, reason: "No API key" };

  const payload = JSON.stringify({
    host: "aitechblogs.netlify.app",
    key: apiKey,
    keyLocation: `https://aitechblogs.netlify.app/e5a87ec5960d4731872eaf123214d831.txt`,
    urlList: [url],
  });

  return new Promise((resolve) => {
    const req = https.request(
      "https://api.indexnow.org/indexnow",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        resolve({
          success: res.statusCode === 200 || res.statusCode === 202,
          status: res.statusCode,
        });
      }
    );

    req.on("error", () => resolve({ success: false }));
    req.write(payload);
    req.end();
  });
}
