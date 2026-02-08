const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = __dirname;
const previewPath = path.join(projectRoot, 'src', 'preview.ts');
const dataViewPath = path.join(projectRoot, 'src', 'data-view.ts');

test('preview CSP allows font-src for local fonts', () => {
  const content = fs.readFileSync(previewPath, 'utf8');
  assert.ok(
    content.includes('font-src *;'),
    'Expected CSP to include font-src * to allow local fonts',
  );
});

test('data-view SyntaxError includes stderr in CliError', () => {
  const content = fs.readFileSync(dataViewPath, 'utf8');
  assert.ok(
    content.includes('err instanceof SyntaxError'),
    'Expected SyntaxError handling in data-view',
  );
  assert.ok(
    content.includes('stderr: result?.stderr'),
    'Expected SyntaxError handler to include result.stderr',
  );
});
