import https from "https";

let lastPing = 0;
const PING_INTERVAL = 60 * 1000; // 1 minute

// Submit sitemap to Google & Bing
export async function submitSitemapToSearchEngines() {
  const now = Date.now();

  // Prevent excessive pings
  if (now - lastPing < PING_INTERVAL) {
    console.log("⏳ Sitemap ping skipped (rate-limited)");
    return [{ skipped: true }];
  }

  lastPing = now;

  const sitemapUrl = encodeURIComponent(
    `${process.env.FRONTEND_URL || "https://aitechblogs.netlify.app"}/sitemap.xml`
  );

  const searchEngines = [
    {
      name: "Google",
      url: `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    },
    {
      name: "Bing",
      url: `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
    },
  ];

  const results = [];

  for (const engine of searchEngines) {
    await new Promise((resolve) => {
      https
        .get(engine.url, (res) => {
          results.push({
            engine: engine.name,
            success: res.statusCode === 200,
            status: res.statusCode,
          });
          resolve();
        })
        .on("error", () => resolve());
    });
  }

  return results;
}

// Submit single URL via IndexNow (optional)
export async function submitUrlToIndexNow(url) {
  const apiKey = process.env.INDEXNOW_API_KEY;

  if (!apiKey) return { success: false, reason: "No API key" };

  const payload = JSON.stringify({
    host: "aitechblogs.netlify.app",
    key: apiKey,
    keyLocation: `https://aitechblogs.netlify.app/${apiKey}.txt`,
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
