const assert = require('node:assert/strict');
const test = require('node:test');

const { buildCliArgs, shouldTreatAsExecutionError } = require('../out/cli/args.js');

test('buildCliArgs keeps file path as plain argument', () => {
  const args = buildCliArgs("/tmp/a'b.UKE", 'json');
  assert.deepEqual(args, ['--preview', '--format=json', "/tmp/a'b.UKE"]);
});

test('shouldTreatAsExecutionError when exit code is non-zero', () => {
  assert.equal(shouldTreatAsExecutionError(1), true);
  assert.equal(shouldTreatAsExecutionError(0), false);
});
