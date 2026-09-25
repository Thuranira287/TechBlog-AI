const SAFETY_SUFFIX = 'Landscape editorial technology photography style. No readable text or lettering anywhere in the image. No logos or brand marks. No watermarks. No real, identifiable people - if a person appears, they must be clearly generic/illustrative, not a depiction of any real individual. No copyrighted characters.';

export function buildPrompt(spec) {
  const parts = [
    spec.subject,
    spec.visual_concept,
    spec.style ? `Style: ${spec.style}.` : null,
    spec.composition ? `Composition: ${spec.composition}.` : null,
    spec.color_direction ? `Color direction: ${spec.color_direction}.` : null,
    spec.brand_space ? `Leave clean, uncluttered visual space in the ${spec.brand_space.replace(/-/g, ' ')} area for potential text/logo overlay - do not place important subject matter there.` : null,
    SAFETY_SUFFIX,
  ].filter(Boolean);

  return parts.join(' ');
}

export function validateImageSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object') return ['featured_image spec is missing'];
  if (!spec.subject || typeof spec.subject !== 'string') errors.push('subject is missing');
  if (!spec.visual_concept || typeof spec.visual_concept !== 'string') errors.push('visual_concept is missing');
  if (!spec.style || typeof spec.style !== 'string') errors.push('style is missing');
  return errors;
}

export function deriveAltText(spec, articleTitle) {
  const base = spec.subject || articleTitle || 'Technology article illustration';
  return base.length > 150 ? base.slice(0, 147) + '...' : base;
}

