# TechBlog AI

**TechBlog AI** is a modern blog platform focused on AI and web development tutorials, guides, and insights. It uses a React frontend with server-side rendering (SSR) via Netlify Edge Functions and fetches content from a backend API, providing fast performance and SEO-friendly pages. The platform supports dynamic post rendering, meta tags for social sharing, and a clean, responsive design.  

---

## Features

- Dynamic blog post rendering using SSR
- SEO-friendly meta tags and Open Graph support
- Responsive design for desktop and mobile
- Bot detection for serving optimized previews
- SPA hydration for human users

---

## Technologies Used

- **Frontend:** React, Tailwind CSS  
- **Backend:** Node.js / API (fetching posts)  
- **Hosting / SSR:** Netlify Edge Functions  
- **SEO / Social Sharing:** Open Graph, Twitter Cards  

---

## Getting Started

1. **Clone the repository**

```bash
git clone https://github.com/Thuranira287/TechBlog-AI.git
cd TechBlog-AI
Install dependencies

npm install
Run locally

npm run dev
Open in browser

http://localhost:8888
Project Structure
client/             # React frontend
  ├─ assets/        # JS and CSS bundles
  ├─ netlify/       # Edge functions (ssr-router, rss-feed)
  └─ index.html
Contributing
Contributions are welcome. Please fork the repository and submit a pull request with your improvements.

License
This project is open-source under the MIT License.