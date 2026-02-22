const assert = require('node:assert/strict');
const test = require('node:test');

const { buildPreviewHtml } = require('../out/features/preview/view/page.js');

test('preview page contains CSP with font-src and nonce', () => {
  const html = buildPreviewHtml('<svg width="100"></svg>', 'test-nonce');
  assert.ok(html.includes('font-src *;'));
  assert.ok(html.includes("script-src 'nonce-test-nonce'"));
});
