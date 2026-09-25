ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS featured_image_public_id VARCHAR(500) DEFAULT NULL
    COMMENT 'Cloudinary public_id of the generated image, needed for cleanup/regeneration',
  ADD COLUMN IF NOT EXISTS featured_image_alt VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS featured_image_spec JSON DEFAULT NULL
    COMMENT 'The structured {subject, visual_concept, style, composition, color_direction, negative_prompt, ...} spec Claude produced, kept so "Regenerate Featured Image" can rebuild the prompt without a new Claude call',
  ADD COLUMN IF NOT EXISTS image_generation_status ENUM('pending', 'ok', 'failed', 'fallback_used') DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS image_generation_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_generation_error TEXT DEFAULT NULL;

