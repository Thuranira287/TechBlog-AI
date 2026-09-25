const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.AI_API_TIMEOUT_MS || '60000', 10);
const DEFAULT_MAX_RETRIES = parseInt(process.env.AI_API_MAX_RETRIES || '2', 10);

class ClaudeServiceError extends Error {
  constructor(message, { retryable = false, cause = null } = {}) {
    super(message);
    this.name = 'ClaudeServiceError';
    this.retryable = retryable;
    this.cause = cause;
  }
}

function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new ClaudeServiceError(
      'ANTHROPIC_API_KEY is not configured on the server',
      { retryable: false }
    );
  }
  return key;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  if (status === 429) return true; // rate limited
  if (status >= 500 && status < 600) return true; // transient server error
  return false;
}

export async function callClaude({
  system,
  prompt,
  maxTokens = 4096,
  temperature = 0.7,
  model = DEFAULT_MODEL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
}) {
  const apiKey = getApiKey();
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        const retryable = isRetryableStatus(response.status);

        // Never log the API key or full request; log status + a trimmed
        // body for diagnosis only.
        console.error(
          `[ClaudeService] HTTP ${response.status} (attempt ${attempt + 1}/${maxRetries + 1}): ${bodyText.slice(0, 300)}`
        );

        if (!retryable || attempt === maxRetries) {
          throw new ClaudeServiceError(
            `Claude API returned HTTP ${response.status}`,
            { retryable }
          );
        }

        lastError = new ClaudeServiceError(`HTTP ${response.status}`, { retryable: true });
        await sleep(2 ** attempt * 1000); // 1s, 2s, 4s...
        continue;
      }

      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === 'text');

      if (!textBlock || !textBlock.text) {
        throw new ClaudeServiceError('Claude response contained no text block', { retryable: false });
      }

      return {
        text: textBlock.text,
        model: data.model,
        stopReason: data.stop_reason,
        usage: data.usage || {},
      };
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof ClaudeServiceError && !error.retryable) {
        throw error;
      }

      const isAbort = error.name === 'AbortError';
      const isNetwork = error.name === 'TypeError'; // fetch network failure

      if ((isAbort || isNetwork) && attempt < maxRetries) {
        console.warn(
          `[ClaudeService] ${isAbort ? 'Timeout' : 'Network error'} (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`
        );
        lastError = error;
        await sleep(2 ** attempt * 1000);
        continue;
      }

      if (isAbort) {
        throw new ClaudeServiceError('Claude API request timed out', { retryable: true, cause: error });
      }
      if (isNetwork) {
        throw new ClaudeServiceError('Claude API network error', { retryable: true, cause: error });
      }

      throw error;
    }
  }

  throw lastError || new ClaudeServiceError('Claude API call failed after retries', { retryable: true });
}

export async function callClaudeForJSON(opts) {
  const { validate, ...claudeOpts } = opts;

  const jsonSystemSuffix = `
IMPORTANT: Respond with ONLY a single valid JSON object. No markdown code fences, no preamble, no explanation before or after. The response must be parseable by JSON.parse() as-is.`;

  const result = await callClaude({
    ...claudeOpts,
    system: `${claudeOpts.system}\n${jsonSystemSuffix}`,
  });

  let cleaned = result.text.trim();
  // Strip markdown fences if the model added them despite instructions.
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new ClaudeServiceError(
      `Claude did not return valid JSON: ${err.message}`,
      { retryable: false }
    );
  }

  if (validate) {
    const validationError = validate(parsed);
    if (validationError) {
      throw new ClaudeServiceError(
        `Claude JSON failed validation: ${validationError}`,
        { retryable: false }
      );
    }
  }

  return { data: parsed, model: result.model, usage: result.usage };
}

export { ClaudeServiceError };