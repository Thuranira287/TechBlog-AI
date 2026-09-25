import { callClaudeForJSON } from './claude.service.js';
import { validateJobData } from '../automation/utils.js';

const NORMALIZER_SYSTEM_PROMPT = `You are a data normalization system for job listings. You are given raw, messy job posting text extracted from a source feed, and you must extract structured fields from it.

ABSOLUTE RULE: If a field is not explicitly present in the source text, you MUST return null for it. Do not estimate, infer, or guess a value for any field the source doesn't state - this includes salary, experience level, remote/hybrid/onsite status, and deadline. A missing salary must be returned as null, never as an invented range or a typical-market estimate. This rule has no exceptions.

You may lightly normalize formatting (e.g. "Remote" / "REMOTE" / "100% remote" all map to "remote"), but you may not add information that isn't present in the source.

Do not copy large verbatim blocks of the source description - write a concise original summary (2-4 sentences) that preserves the essential requirements and responsibilities, but do not reproduce the source's exact wording at length.`;

export async function normalizeJob(rawJob) {
  const prompt = `Raw job listing data:
${JSON.stringify(rawJob, null, 2)}

Return a JSON object with exactly this shape (null for anything not explicitly present in the source):
{
  "title": "string",
  "company_name": "string",
  "location": "string or null",
  "remote_type": "\\"remote\\" | \\"hybrid\\" | \\"onsite\\" | null",
  "job_type": "\\"full-time\\" | \\"part-time\\" | \\"contract\\" | \\"internship\\" | null",
  "experience_level": "string or null - e.g. \\"entry\\", \\"mid\\", \\"senior\\" - only if source states it",
  "salary_min": "number or null",
  "salary_max": "number or null",
  "salary_currency": "string or null - e.g. \\"USD\\"",
  "description": "string - concise original summary, 2-4 sentences",
  "requirements": "string or null - concise, not verbatim",
  "responsibilities": "string or null - concise, not verbatim",
  "qualifications": "string or null",
  "skills": ["array", "of", "strings"],
  "category": "string - best-fit category",
  "tags": ["array", "of", "lowercase", "tags"],
  "deadline": "ISO date string or null - only if source explicitly states an application deadline"
}`;

  const { data } = await callClaudeForJSON({
    system: NORMALIZER_SYSTEM_PROMPT,
    prompt,
    maxTokens: 2000,
    temperature: 0.2, // low temperature: this is extraction, not creative writing
    validate: (parsed) => {
      if (!parsed.title || !parsed.company_name) {
        return 'title or company_name missing from normalized output';
      }
      return null;
    },
  });

  return data;
}

export function validateNormalizedJob(normalized, rawJobText) {
  const errors = validateJobData({
    ...normalized,
    application_url: normalized.application_url || rawJobText?.application_url,
  });

  const haystack = (typeof rawJobText === 'string' ? rawJobText : JSON.stringify(rawJobText || {})).toLowerCase();

  if (normalized.salary_min != null || normalized.salary_max != null) {
    const mentionsSalary = /salary|compensation|pay|\$|usd|kes|eur|gbp/.test(haystack);
    if (!mentionsSalary) {
      console.warn('[JobNormalizer] Salary present in output but no salary-related text found in source - nulling out (likely hallucination)');
      normalized.salary_min = null;
      normalized.salary_max = null;
      normalized.salary_currency = null;
    }
  }

  return errors;
}
