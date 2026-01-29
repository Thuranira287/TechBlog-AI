# TechBlog AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/Thuranira287/TechBlog-AI)](https://github.com/Thuranira287/TechBlog-AI/commits/main)

## Overview

**TechBlog AI** is a modern technology and AI-focused blogging platform that delivers curated articles, tutorials, and news. The platform is built with a **React frontend** and a **Node.js/Express backend**, with **MySQL** for data storage. It includes **SEO-friendly server-side rendering** for posts, AI-optimized content previews, and optimized performance for low-spec devices.

The platform aims to provide:

- Fast, responsive category and post pages
- AI-ready content previews for indexing
- Rich metadata (OpenGraph, Twitter Cards, JSON-LD schemas)
- User-friendly navigation and search

## Features

### Frontend
- React + Tailwind CSS for responsive UI
- React Router for seamless navigation
- Client-side API calls for posts, categories, and search
- Skeleton loaders for improved UX during API fetch
- SEO integration using `react-helmet-async`
- Ads placeholders (Google AdSense compatible)
- Breadcrumb navigation for better site hierarchy

### Backend
- Node.js + Express REST API
- MySQL database with optimized indexing
- Cursor and offset-based pagination
- Category, post, and author endpoints
- Full-text search on posts (`title`, `content`, `excerpt`)
- Edge SSR function for bots and AI crawlers
- Metadata optimization for SEO and social sharing
- CORS and security headers for safe content delivery

### SEO & Performance
- Server-Side Rendering (SSR) for posts
- JSON-LD schemas for Articles, Breadcrumbs, and Blog
- OpenGraph and Twitter Card metadata
- Canonical URLs and robots directives
- Caching headers for improved performance

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express, MySQL |
| Hosting / Deployment | Netlify (frontend), Render (backend) |
| SEO & SSR | Edge Functions, JSON-LD, OpenGraph, Twitter Cards |
| Tools | VSCode, Postman, Git/GitHub, npm |

---

## Installation & Setup

### Prerequisites
- Node.js v18+ and npm
- MySQL database
- Git

### Clone Repository
```bash
git clone https://github.com/Thuranira287/TechBlog-AI.git
cd TechBlog-AI
Backend Setup
cd backend
npm install
Configure .env file with database credentials:

DB_HOST=your_host
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
PORT=5000
Run backend:

npm run dev
Frontend Setup
cd ../frontend
npm install
npm run dev
Open browser: http://localhost:5173 (Vite default port)

API Endpoints
Posts
GET /api/posts → List all posts

GET /api/posts/:slug → Get single post

GET /api/posts/category/:categorySlug → Get posts by category

Categories
GET /api/categories → List all categories

Authors
GET /api/authors → List authors

GET /api/authors/:id → Get author details

SEO & SSR Notes
Posts SSR: Edge function pre-renders HTML for bots (Google, GPT bots, etc.)

Category pages: Currently client-side, can be migrated to SSR for faster indexing

JSON-LD schemas: Article, Breadcrumb, Blog

OpenGraph & Twitter Cards: Dynamic metadata for each post

License
This project is licensed under the MIT License.

Contribution
Contributions are welcome! Please open an issue or submit a pull request.

Bug reports: Clearly describe the problem and steps to reproduce.

Feature requests: Suggest improvements or new features with use cases.

Pull requests: Follow existing code style and include descriptive commit messages.

Contact
GitHub: Thuranira287

Website: https://aitechblogs.netlify.app

Email: your-email@example.com

Acknowledgements
Inspired by modern tech blogs and AI content platforms

Open-source projects and tutorials on React + Node.js integration

Tailwind CSS documentation for styling and responsive design

### Site URL

Visit the site at (https://aitechblogs.netlify.app).