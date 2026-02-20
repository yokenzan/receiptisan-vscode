const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function repoPath(rel) {
  return path.join(__dirname, '..', rel);
}

test('view assets are not stored under src', () => {
  assert.equal(fs.existsSync(repoPath('src/templates')), false);
  assert.equal(fs.existsSync(repoPath('src/data-view.css')), false);
  assert.equal(fs.existsSync(repoPath('views/templates')), true);
  assert.equal(fs.existsSync(repoPath('views/styles/data-view.css')), false);
  assert.equal(fs.existsSync(repoPath('views/templates/styles/data-view.css.eta')), true);
});
