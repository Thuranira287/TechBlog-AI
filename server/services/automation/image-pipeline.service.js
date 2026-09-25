import { generateImage, ImageGenerationError } from '../ai/image-generation.service.js';
import { uploadGeneratedArticleImage } from '../../config/cloudinary.js';
import { buildPrompt, validateImageSpec, deriveAltText } from './image-prompt.js';

const MIN_VALID_IMAGE_BYTES = 5 * 1024; // reject anything suspiciously tiny (likely corrupted/empty)
const VALID_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function downloadAndValidateImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new ImageGenerationError(`Failed to download generated image: HTTP ${response.status}`, { retryable: true });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!VALID_CONTENT_TYPES.some((t) => contentType.includes(t))) {
      throw new ImageGenerationError(`Downloaded file has unexpected content-type: ${contentType}`, { retryable: false });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < MIN_VALID_IMAGE_BYTES) {
      throw new ImageGenerationError(`Downloaded image is suspiciously small (${buffer.length} bytes) - likely corrupted/empty`, { retryable: false });
    }

    return buffer;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof ImageGenerationError) throw error;
    if (error.name === 'AbortError') {
      throw new ImageGenerationError('Timed out downloading generated image', { retryable: true, cause: error });
    }
    throw new ImageGenerationError(`Failed to download generated image: ${error.message}`, { retryable: true, cause: error });
  }
}

export async function generateFeaturedImage(spec, slug, articleTitle, { attempt = 1 } = {}) {
  const specErrors = validateImageSpec(spec);
  if (specErrors.length > 0) {
    throw new ImageGenerationError(`Invalid image spec: ${specErrors.join('; ')}`, { retryable: false });
  }

  const prompt = buildPrompt(spec);
  const width = spec.recommended_width || 1280;
  const height = spec.recommended_height || 720;

  const generated = await generateImage({
    prompt,
    negativePrompt: spec.negative_prompt,
    width,
    height,
  });

  const buffer = await downloadAndValidateImage(generated.url);

  let uploadResult;
  try {
    uploadResult = await uploadGeneratedArticleImage(buffer, slug, { attempt });
  } catch (error) {
    // A Cloudinary "already exists" error
    throw new ImageGenerationError(`Cloudinary upload failed: ${error.message}`, { retryable: false, cause: error });
  }

  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    altText: deriveAltText(spec, articleTitle),
    width: uploadResult.width,
    height: uploadResult.height,
  };
}

