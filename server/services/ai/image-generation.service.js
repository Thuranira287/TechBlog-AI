const DEFAULT_TIMEOUT_MS = parseInt(process.env.IMAGE_GENERATION_TIMEOUT_MS || '90000', 10);
const DEFAULT_MAX_RETRIES = parseInt(process.env.IMAGE_GENERATION_MAX_RETRIES || '2', 10);

class ImageGenerationError extends Error {
  constructor(message, { retryable = false, cause = null } = {}) {
    super(message);
    this.name = 'ImageGenerationError';
    this.retryable = retryable;
    this.cause = cause;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

function roundToMultipleOf32(n) {
  return Math.max(256, Math.round(n / 32) * 32);
}

async function generateWithFalAi({ prompt, negativePrompt, width, height, timeoutMs, maxRetries }) {
  const apiKey = process.env.IMAGE_GENERATION_API_KEY;
  if (!apiKey) {
    throw new ImageGenerationError('IMAGE_GENERATION_API_KEY is not configured on the server', { retryable: false });
  }

  const model = process.env.IMAGE_GENERATION_MODEL || 'fal-ai/flux/dev';
  const endpoint = `https://fal.run/${model}`;

  const body = {
    prompt,
    image_size: {
      width: roundToMultipleOf32(width || 1280),
      height: roundToMultipleOf32(height || 720),
    },
    num_images: 1,
    output_format: 'jpeg',
    // Flux's built-in safety filter; belt-and-suspenders alongside our own
    // prompt-writing rules (no real people, no logos, no copyrighted
    // characters) enforced in article-generator.service.js's prompt.
    enable_safety_checker: true,
  };
  if (negativePrompt) {
    body.negative_prompt = negativePrompt;
  }

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        const retryable = isRetryableStatus(response.status);
        console.error(`[ImageGeneration] fal.ai HTTP ${response.status} (attempt ${attempt + 1}/${maxRetries + 1}): ${bodyText.slice(0, 300)}`);

        if (!retryable || attempt === maxRetries) {
          throw new ImageGenerationError(`fal.ai returned HTTP ${response.status}`, { retryable });
        }
        lastError = new ImageGenerationError(`HTTP ${response.status}`, { retryable: true });
        await sleep(2 ** attempt * 1500);
        continue;
      }

      const data = await response.json();
      const image = (data.images || [])[0];

      if (!image || !image.url) {
        throw new ImageGenerationError('fal.ai response contained no image', { retryable: false });
      }
      if (data.has_nsfw_concepts && data.has_nsfw_concepts[0]) {
        throw new ImageGenerationError('fal.ai flagged the generated image as NSFW - rejecting', { retryable: false });
      }

      return { url: image.url, width: image.width || body.image_size.width, height: image.height || body.image_size.height };
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof ImageGenerationError && !error.retryable) throw error;

      const isAbort = error.name === 'AbortError';
      const isNetwork = error.name === 'TypeError';

      if ((isAbort || isNetwork) && attempt < maxRetries) {
        console.warn(`[ImageGeneration] ${isAbort ? 'Timeout' : 'Network error'} (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
        lastError = error;
        await sleep(2 ** attempt * 1500);
        continue;
      }

      if (isAbort) throw new ImageGenerationError('fal.ai request timed out', { retryable: true, cause: error });
      if (isNetwork) throw new ImageGenerationError('fal.ai network error', { retryable: true, cause: error });
      throw error;
    }
  }

  throw lastError || new ImageGenerationError('fal.ai call failed after retries', { retryable: true });
}

const PROVIDERS = {
  fal: generateWithFalAi,
  falai: generateWithFalAi, // accept either spelling in env config
};

export async function generateImage({ prompt, negativePrompt, width, height, timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES }) {
  if (process.env.IMAGE_GENERATION_ENABLED !== 'true') {
    throw new ImageGenerationError('Image generation is disabled (IMAGE_GENERATION_ENABLED != true)', { retryable: false });
  }

  const providerName = (process.env.IMAGE_GENERATION_PROVIDER || 'fal').toLowerCase();
  const provider = PROVIDERS[providerName];

  if (!provider) {
    throw new ImageGenerationError(
      `Unknown IMAGE_GENERATION_PROVIDER "${providerName}" - supported: ${Object.keys(PROVIDERS).join(', ')}`,
      { retryable: false }
    );
  }

  if (!prompt || prompt.trim().length < 10) {
    throw new ImageGenerationError('Image prompt is missing or too short', { retryable: false });
  }

  return provider({ prompt, negativePrompt, width, height, timeoutMs, maxRetries });
}

export { ImageGenerationError };

