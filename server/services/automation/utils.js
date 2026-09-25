import crypto from 'crypto';

// Topic normalization / duplicate detection

const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'with',
  'how', 'what', 'why', 'is', 'are', 'your', 'you', 'guide', 'complete',
  'ultimate', 'best', 'top', '2024', '2025', '2026',
]);

export function normalizeTopicKey(text) {
  if (!text || typeof text !== 'string') return '';

  const words = text
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  return [...new Set(words)].sort().join(' ');
}

export function topicSimilarity(a, b) {
  const setA = new Set(normalizeTopicKey(a).split(' ').filter(Boolean));
  const setB = new Set(normalizeTopicKey(b).split(' ').filter(Boolean));

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const DUPLICATE_TOPIC_THRESHOLD = 0.6;

// Slug generation

export function generateSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

// Job fingerprinting

function normalizeForFingerprint(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

export function computeJobFingerprint({ company, title, location, applicationUrl }) {
  const normalized = [
    normalizeForFingerprint(company),
    normalizeForFingerprint(title),
    normalizeForFingerprint(location),
    normalizeForFingerprint(applicationUrl),
  ].join('|');

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// URL validation
const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local, including cloud metadata endpoints
  /^\[?::1\]?$/,
  /^\[?fc00:/i,
  /^\[?fe80:/i,
];

export function isSafePublicUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const hostname = parsed.hostname;
  if (PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname))) return false;

  return true;
}

// Article validation
export function validateArticleData(data, { minWords = 1200 } = {}) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return ['Article data is not an object'];
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 10) {
    errors.push('title is missing or too short');
  }
  if (data.title && data.title.length > 500) {
    errors.push('title exceeds 500 characters');
  }

  if (!data.content || typeof data.content !== 'string') {
    errors.push('content is missing');
  } else {
    const plainText = data.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.length === 0 ? 0 : plainText.split(' ').length;
    if (wordCount < minWords) {
      errors.push(`content is only ~${wordCount} words, below the ${minWords} minimum`);
    }
  }

  if (!data.excerpt || typeof data.excerpt !== 'string' || data.excerpt.trim().length < 20) {
    errors.push('excerpt is missing or too short');
  }

  if (!data.category || typeof data.category !== 'string') {
    errors.push('category is missing');
  }

  if (!Array.isArray(data.tags)) {
    errors.push('tags must be an array');
  }

  if (!data.meta_title || typeof data.meta_title !== 'string') {
    errors.push('meta_title is missing');
  }
  if (!data.meta_description || typeof data.meta_description !== 'string') {
    errors.push('meta_description is missing');
  }

  if (!data.suggested_slug || typeof data.suggested_slug !== 'string') {
    errors.push('suggested_slug is missing');
  }

  if (!data.featured_image || typeof data.featured_image !== 'object') {
    errors.push('featured_image spec is missing');
  } else {
    if (!data.featured_image.subject || typeof data.featured_image.subject !== 'string') {
      errors.push('featured_image.subject is missing');
    }
    if (!data.featured_image.visual_concept || typeof data.featured_image.visual_concept !== 'string') {
      errors.push('featured_image.visual_concept is missing');
    }
    if (!data.featured_image.style || typeof data.featured_image.style !== 'string') {
      errors.push('featured_image.style is missing');
    }
  }

  // Flag obvious placeholder/fabrication patterns Claude sometimes emits
  // despite instructions not to (e.g. "[insert statistic here]",
  // "Company X", "according to a 2024 study" with no source attached).
  const suspiciousPatterns = [
    /\[insert[^\]]*\]/i,
    /\bTODO\b/,
    /\blorem ipsum\b/i,
    /as an ai language model/i,
  ];
  if (data.content) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(data.content)) {
        errors.push(`content contains a placeholder/AI-disclosure artifact matching ${pattern}`);
      }
    }
  }

  return errors;
}

// Job validation
export function validateJobData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return ['Job data is not an object'];
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
    errors.push('title is missing or too short');
  }
  if (!data.company_name || typeof data.company_name !== 'string') {
    errors.push('company_name is missing');
  }
  if (!isSafePublicUrl(data.application_url)) {
    errors.push('application_url is missing or not a safe public URL');
  }
  if (data.source_url && !isSafePublicUrl(data.source_url)) {
    errors.push('source_url is present but not a safe public URL');
  }

  if (data.salary_min != null && data.salary_max != null && data.salary_min > data.salary_max) {
    errors.push('salary_min is greater than salary_max');
  }

  if (data.deadline) {
    const deadline = new Date(data.deadline);
    if (isNaN(deadline.getTime())) {
      errors.push('deadline is not a valid date');
    } else if (deadline.getTime() < Date.now()) {
      errors.push('deadline is already in the past');
    }
  }

  return errors;
}

