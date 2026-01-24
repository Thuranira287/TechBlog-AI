import fetch from "node-fetch";

export async function handler() {
  const res = await fetch("https://techblogai-backend.onrender.com/sitemap.xml");
  const text = await res.text();
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/xml" },
    body: text
  };
}
