import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTopicKey,
  topicSimilarity,
  DUPLICATE_TOPIC_THRESHOLD,
  generateSlug,
  computeJobFingerprint,
  isSafePublicUrl,
  validateArticleData,
  validateJobData,
} from './utils.js';

//topic duplicate detection
test('normalizeTopicKey strips stopwords, case, and punctuation', () => {
  const a = normalizeTopicKey('How to Build REST APIs in Node.js (2026 Guide)');
  const b = normalizeTopicKey('The Ultimate Guide to Building REST APIs with Node.js');
  // Both should reduce to overlapping significant-word sets
  assert.ok(a.includes('rest'));
  assert.ok(a.includes('apis'));
  assert.ok(b.includes('rest'));
  assert.ok(b.includes('apis'));
});

test('topicSimilarity flags near-duplicate topics above threshold', () => {
  const sim = topicSimilarity(
    'How to Build REST APIs in Node.js',
    'Building REST APIs with Node.js: A Complete Guide'
  );
  assert.ok(sim >= DUPLICATE_TOPIC_THRESHOLD, `expected similarity >= ${DUPLICATE_TOPIC_THRESHOLD}, got ${sim}`);
});

test('topicSimilarity does not flag genuinely different topics', () => {
  const sim = topicSimilarity(
    'How to Build REST APIs in Node.js',
    'Best Practices for Kubernetes Cluster Security'
  );
  assert.ok(sim < DUPLICATE_TOPIC_THRESHOLD, `expected similarity < ${DUPLICATE_TOPIC_THRESHOLD}, got ${sim}`);
});

test('topicSimilarity handles empty strings without throwing', () => {
  assert.equal(topicSimilarity('', ''), 0);
  assert.equal(topicSimilarity('Something', ''), 0);
});

// slug generation

test('generateSlug produces a clean, url-safe slug', () => {
  assert.equal(
    generateSlug('How to Build REST APIs in Node.js (2026 Guide)!'),
    'how-to-build-rest-apis-in-nodejs-2026-guide'
  );
});

test('generateSlug collapses repeated separators and trims edges', () => {
  assert.equal(generateSlug('  --Multiple   Spaces--  '), 'multiple-spaces');
});

test('generateSlug handles empty input', () => {
  assert.equal(generateSlug(''), '');
  assert.equal(generateSlug(null), '');
});

// job fingerprinting
test('computeJobFingerprint is stable for identical input', () => {
  const input = { company: 'Acme Corp', title: 'Backend Engineer', location: 'Remote', applicationUrl: 'https://acme.com/jobs/1' };
  assert.equal(computeJobFingerprint(input), computeJobFingerprint(input));
});

test('computeJobFingerprint collapses the same job from two sources with formatting differences', () => {
  const fpA = computeJobFingerprint({
    company: 'Acme Corp.',
    title: 'Backend Engineer',
    location: 'Remote (US)',
    applicationUrl: 'https://acme.com/jobs/1',
  });
  const fpB = computeJobFingerprint({
    company: 'acme corp',
    title: 'backend  engineer',
    location: 'remote us',
    applicationUrl: 'https://acme.com/jobs/1',
  });
  assert.equal(fpA, fpB);
});

test('computeJobFingerprint differs for genuinely different jobs', () => {
  const fpA = computeJobFingerprint({ company: 'Acme', title: 'Backend Engineer', location: 'Remote', applicationUrl: 'https://acme.com/1' });
  const fpB = computeJobFingerprint({ company: 'Acme', title: 'Frontend Engineer', location: 'Remote', applicationUrl: 'https://acme.com/2' });
  assert.notEqual(fpA, fpB);
});

test('computeJobFingerprint returns a 64-char hex string', () => {
  const fp = computeJobFingerprint({ company: 'A', title: 'B', location: 'C', applicationUrl: 'https://x.com' });
  assert.match(fp, /^[a-f0-9]{64}$/);
});

// URL safety 
test('isSafePublicUrl accepts normal https URLs', () => {
  assert.equal(isSafePublicUrl('https://example.com/jobs/123'), true);
});

test('isSafePublicUrl rejects non-http(s) schemes', () => {
  assert.equal(isSafePublicUrl('ftp://example.com'), false);
  assert.equal(isSafePublicUrl('file:///etc/passwd'), false);
  assert.equal(isSafePublicUrl('javascript:alert(1)'), false);
});

test('isSafePublicUrl rejects localhost and private/internal addresses (SSRF guard)', () => {
  assert.equal(isSafePublicUrl('http://localhost/admin'), false);
  assert.equal(isSafePublicUrl('http://127.0.0.1:5000/api'), false);
  assert.equal(isSafePublicUrl('http://169.254.169.254/latest/meta-data/'), false); // cloud metadata endpoint
  assert.equal(isSafePublicUrl('http://192.168.1.1/'), false);
  assert.equal(isSafePublicUrl('http://10.0.0.5/'), false);
});

test('isSafePublicUrl rejects malformed input without throwing', () => {
  assert.equal(isSafePublicUrl(''), false);
  assert.equal(isSafePublicUrl(null), false);
  assert.equal(isSafePublicUrl('not a url'), false);
});

// article validation 
test('validateArticleData accepts a well-formed article', () => {
  const errors = validateArticleData({
    title: 'A Genuinely Long Enough Article Title',
    content: '<p>' + 'word '.repeat(1300) + '</p>',
    excerpt: 'A reasonable excerpt describing the article.',
    category: 'Web Development',
    tags: ['node', 'apis'],
    meta_title: 'Meta title',
    meta_description: 'Meta description',
    suggested_slug: 'a-genuinely-long-enough-article-title',
    featured_image: {
      subject: 'Node.js REST API patterns',
      visual_concept: 'Abstract server architecture diagram',
      style: 'clean editorial technology aesthetic',
    },
  }, { minWords: 1200 });
  assert.deepEqual(errors, []);
});

test('validateArticleData rejects short content', () => {
  const errors = validateArticleData({
    title: 'A Genuinely Long Enough Article Title',
    content: '<p>Too short.</p>',
    excerpt: 'A reasonable excerpt.',
    category: 'Web Development',
    tags: ['node'],
    meta_title: 'x',
    meta_description: 'y',
    suggested_slug: 'slug',
    featured_image: { subject: 's', visual_concept: 'v', style: 'st' },
  }, { minWords: 1200 });
  assert.ok(errors.some((e) => e.includes('word')));
});

test('validateArticleData rejects placeholder/fabrication artifacts', () => {
  const errors = validateArticleData({
    title: 'A Genuinely Long Enough Article Title',
    content: '<p>' + 'word '.repeat(1300) + '[insert statistic here]</p>',
    excerpt: 'A reasonable excerpt.',
    category: 'Web Development',
    tags: ['node'],
    meta_title: 'x',
    meta_description: 'y',
    suggested_slug: 'slug',
    featured_image: { subject: 's', visual_concept: 'v', style: 'st' },
  }, { minWords: 1200 });
  assert.ok(errors.some((e) => e.includes('placeholder')));
});

test('validateArticleData rejects missing required fields', () => {
  const errors = validateArticleData({});
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes('title')));
  assert.ok(errors.some((e) => e.includes('content')));
});

test('validateArticleData rejects a missing featured_image spec', () => {
  const errors = validateArticleData({
    title: 'A Genuinely Long Enough Article Title',
    content: '<p>' + 'word '.repeat(1300) + '</p>',
    excerpt: 'A reasonable excerpt.',
    category: 'Web Development',
    tags: ['node'],
    meta_title: 'x',
    meta_description: 'y',
    suggested_slug: 'slug',
  }, { minWords: 1200 });
  assert.ok(errors.some((e) => e.includes('featured_image spec is missing')));
});

test('validateArticleData rejects an incomplete featured_image spec', () => {
  const errors = validateArticleData({
    title: 'A Genuinely Long Enough Article Title',
    content: '<p>' + 'word '.repeat(1300) + '</p>',
    excerpt: 'A reasonable excerpt.',
    category: 'Web Development',
    tags: ['node'],
    meta_title: 'x',
    meta_description: 'y',
    suggested_slug: 'slug',
    featured_image: { subject: 'Only a subject, missing the rest' },
  }, { minWords: 1200 });
  assert.ok(errors.some((e) => e.includes('featured_image.visual_concept')));
  assert.ok(errors.some((e) => e.includes('featured_image.style')));
});

// job validation 
test('validateJobData accepts a well-formed job with nulled-out unknown fields', () => {
  const errors = validateJobData({
    title: 'Backend Engineer',
    company_name: 'Acme Corp',
    application_url: 'https://acme.com/jobs/1',
    salary_min: null,
    salary_max: null,
    experience_level: null,
  });
  assert.deepEqual(errors, []);
});

test('validateJobData rejects missing application_url', () => {
  const errors = validateJobData({ title: 'Backend Engineer', company_name: 'Acme Corp' });
  assert.ok(errors.some((e) => e.includes('application_url')));
});

test('validateJobData rejects an unsafe application_url', () => {
  const errors = validateJobData({
    title: 'Backend Engineer',
    company_name: 'Acme Corp',
    application_url: 'http://localhost/apply',
  });
  assert.ok(errors.some((e) => e.includes('application_url')));
});

test('validateJobData rejects salary_min greater than salary_max', () => {
  const errors = validateJobData({
    title: 'Backend Engineer',
    company_name: 'Acme Corp',
    application_url: 'https://acme.com/jobs/1',
    salary_min: 100000,
    salary_max: 50000,
  });
  assert.ok(errors.some((e) => e.includes('salary_min')));
});

test('validateJobData rejects an already-past deadline', () => {
  const errors = validateJobData({
    title: 'Backend Engineer',
    company_name: 'Acme Corp',
    application_url: 'https://acme.com/jobs/1',
    deadline: '2020-01-01',
  });
  assert.ok(errors.some((e) => e.includes('deadline')));
});

