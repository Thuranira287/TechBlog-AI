import { callClaude, callClaudeForJSON } from './claude.service.js';
import { normalizeTopicKey, topicSimilarity, DUPLICATE_TOPIC_THRESHOLD, generateSlug, validateArticleData } from '../automation/utils.js';

const TOPIC_POOLS = {
  'Artificial Intelligence': [
    'AI agent architectures', 'LLM fine-tuning approaches', 'retrieval-augmented generation',
    'AI model evaluation methods', 'prompt engineering patterns', 'AI safety practices for developers',
  ],
  'Web Development': [
    'modern CSS layout techniques', 'web performance optimization', 'browser API capabilities',
    'frontend build tooling', 'accessibility implementation patterns', 'progressive web apps',
  ],
  Technology: [
    'edge computing use cases', 'developer productivity tooling', 'API design patterns',
    'cloud cost optimization', 'observability practices', 'database indexing strategies',
  ],
};

export async function discoverTopic(pool, { preferredCategories } = {}) {
  const [existingPosts] = await pool.execute(
    `SELECT title FROM posts WHERE status IN ('published', 'pending_review', 'approved') ORDER BY created_at DESC LIMIT 200`
  );
  const [recentTopics] = await pool.execute(
    `SELECT raw_topic FROM generated_topics ORDER BY created_at DESC LIMIT 200`
  );

  const takenTitles = [
    ...existingPosts.map((p) => p.title),
    ...recentTopics.map((t) => t.raw_topic),
  ];

  const categories = preferredCategories && preferredCategories.length
    ? preferredCategories
    : Object.keys(TOPIC_POOLS);

  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const pool_ = TOPIC_POOLS[category] || TOPIC_POOLS.Technology;
    const seed = pool_[Math.floor(Math.random() * pool_.length)];

    // Ask Claude to propose a specific, concrete article title within this
    let candidateTitle;
    try {
      const result = await callClaude({
        system: 'You are a technology editor proposing a single specific, non-generic blog article title. Respond with ONLY the title text, nothing else - no quotes, no explanation.',
        prompt: `Propose one specific, concrete article title about "${seed}" (category: ${category}). Avoid generic phrasing like "Complete Guide to X" or "Everything You Need to Know About X". The title must be genuinely specific (e.g. a particular technique, comparison, or problem), not a broad overview.`,
        maxTokens: 100,
        temperature: 0.9,
      });
      candidateTitle = result.text.trim().replace(/^["']|["']$/g, '');
    } catch (err) {
      console.error('[ArticleGenerator] Topic proposal call failed:', err.message);
      continue;
    }

    if (!candidateTitle || candidateTitle.length < 10) continue;

    const isDuplicate = takenTitles.some(
      (existing) => topicSimilarity(candidateTitle, existing) >= DUPLICATE_TOPIC_THRESHOLD
    );

    if (!isDuplicate) {
      return { topic: candidateTitle, category };
    }

    console.log(`[ArticleGenerator] Rejected duplicate candidate topic: "${candidateTitle}"`);
    await recordTopicOutcome(pool, { topic: candidateTitle, category, outcome: 'rejected_duplicate' });
  }

  return null;
}

export async function recordTopicOutcome(pool, { topic, category, outcome, postId = null, automationRunId = null }) {
  await pool.execute(
    `INSERT INTO generated_topics (topic_key, raw_topic, category, outcome, post_id, automation_run_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [normalizeTopicKey(topic), topic, category || null, outcome, postId, automationRunId]
  );
}

const ARTICLE_SYSTEM_PROMPT = `You are a senior technical writer producing a factual, well-researched blog article for a technology publication.

STRICT RULES - violating any of these makes the article unusable:
1. Never fabricate statistics, survey results, or numeric claims. If you don't have a verifiable figure, describe the concept qualitatively instead of inventing a number.
2. Never fabricate quotations or attribute statements to real people, companies, or studies that you cannot ground.
3. Never invent named sources, papers, or citations. If you reference general industry knowledge, say so in general terms ("many teams report...") rather than fabricating a specific source.
4. Distinguish clearly between established fact and your own analysis/opinion - use phrasing like "in practice" or "a common approach is" for opinion/experience-based content.
5. Do not copy or closely paraphrase any specific existing published article - write original explanations and original examples.
6. Do not pad with repetitive AI-style filler phrases ("In today's fast-paced digital world...", "It's important to note that...", "In conclusion, it is clear that..."). Write directly.
7. Do not include any meta-commentary about being an AI, your knowledge cutoff, or your capabilities.

Structure: H1 title (via the title field, not inside content), a direct introduction, logically-ordered H2/H3 sections with concrete examples or code where genuinely useful, a conclusion. Include an FAQ section only if it adds real value beyond what the body already covers.

Content must be returned as clean semantic HTML (h2, h3, p, ul, ol, li, pre, code, blockquote) suitable for direct rendering - no markdown, no <html>/<body> wrapper tags.

You must also produce a featured_image spec derived from THIS SPECIFIC article's actual subject matter - never a generic, reusable-for-any-article description. It must describe: the article's specific subject, the concrete visual concept illustrating it, a professional editorial technology visual style, landscape composition, and a color direction. It must never request readable text, logos, watermarks, real identifiable people, or copyrighted characters in the image.`;

export async function generateArticle(pool, {
  topic,
  category,
  minWords = parseInt(process.env.AI_ARTICLE_MIN_WORDS || '1200', 10),
  targetWords = parseInt(process.env.AI_ARTICLE_TARGET_WORDS || '1800', 10),
  language = process.env.AI_ARTICLE_LANGUAGE || 'en',
  model,
  timeoutMs,
  maxRetries,
}) {
  const prompt = `Write an article on this topic: "${topic}"
Category: ${category}
Target length: approximately ${targetWords} words (minimum acceptable: ${minWords} words)
Language: ${language}

Return a JSON object with exactly this shape:
{
  "title": "string - the article title, can differ slightly from the topic if a better phrasing exists",
  "excerpt": "string - a 1-2 sentence summary, 20-200 characters",
  "content": "string - the full article body as semantic HTML, see structure rules",
  "category": "string - should be \\"${category}\\" unless the content clearly fits a more specific existing category better",
  "tags": ["array", "of", "3-6", "lowercase", "tag", "strings"],
  "keywords": "string - comma-separated SEO keywords",
  "meta_title": "string - under 60 characters",
  "meta_description": "string - under 160 characters",
  "og_title": "string",
  "og_description": "string",
  "suggested_slug": "string - lowercase-hyphenated, derived from the title",
  "estimated_word_count": number,
  "sources": ["array of {\\"title\\": string, \\"url\\": string} for any specific external sources actually referenced - empty array if none"],
  "featured_image": {
    "subject": "string - this article's specific subject, not generic",
    "visual_concept": "string - the concrete scene/imagery to depict",
    "style": "string - e.g. \\"clean futuristic editorial technology aesthetic\\"",
    "composition": "string - e.g. \\"landscape 16:9, subject with breathing room\\"",
    "color_direction": "string - a specific palette direction",
    "negative_prompt": "string - things to avoid visually, e.g. \\"text, logos, watermark, extra limbs\\"",
    "brand_space": "string - where clean uncluttered space should be left, e.g. \\"upper-right\\"",
    "aspect_ratio": "16:9",
    "recommended_width": 1280,
    "recommended_height": 720
  }
}`;

  const { data } = await callClaudeForJSON({
    system: ARTICLE_SYSTEM_PROMPT,
    prompt,
    maxTokens: 8000,
    temperature: 0.7,
    model,
    timeoutMs,
    maxRetries,
    validate: (parsed) => {
      const errors = validateArticleData(parsed, { minWords });
      return errors.length ? errors.join('; ') : null;
    },
  });

  if (!data.suggested_slug) {
    data.suggested_slug = generateSlug(data.title);
  }

  return data;
}
