import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt } from './image-prompt.js';

test('buildPrompt includes subject, visual concept, style, composition, color direction', () => {
  const spec = {
    subject: 'AI code generation in 2026',
    visual_concept: 'A modern software-development workspace with abstract code structures',
    style: 'clean futuristic editorial technology aesthetic',
    composition: 'landscape 16:9, subject centered with breathing room',
    color_direction: 'cool blues and violets with a warm accent',
    negative_prompt: 'text, logos, watermark',
    brand_space: 'upper-right',
  };

  const prompt = buildPrompt(spec);

  assert.match(prompt, /AI code generation in 2026/);
  assert.match(prompt, /modern software-development workspace/);
  assert.match(prompt, /clean futuristic editorial technology aesthetic/);
  assert.match(prompt, /landscape 16:9/);
  assert.match(prompt, /cool blues and violets/);
  assert.match(prompt, /upper right/i);
});

test('buildPrompt always appends the safety suffix regardless of spec content', () => {
  const prompt = buildPrompt({
    subject: 'Cloud infrastructure',
    visual_concept: 'Server racks with glowing connections',
    style: 'minimalist',
  });

  assert.match(prompt, /No readable text or lettering/);
  assert.match(prompt, /No logos or brand marks/);
  assert.match(prompt, /No watermarks/);
  assert.match(prompt, /No real, identifiable people/);
  assert.match(prompt, /No copyrighted characters/);
});

test('buildPrompt handles a minimal spec (only required fields) without throwing', () => {
  const prompt = buildPrompt({
    subject: 'Kubernetes networking',
    visual_concept: 'Abstract network topology',
    style: 'editorial',
  });
  assert.ok(prompt.length > 0);
  assert.match(prompt, /Kubernetes networking/);
});

test('buildPrompt produces DIFFERENT prompts for different topics (not one generic prompt reused)', () => {
  const promptA = buildPrompt({ subject: 'AI code generation', visual_concept: 'x', style: 'y' });
  const promptB = buildPrompt({ subject: 'Kubernetes security', visual_concept: 'z', style: 'w' });
  assert.notEqual(promptA, promptB);
});

