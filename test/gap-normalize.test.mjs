// Focused tests for Career Gap's response normalization
// (js/gap-normalize.js). Run with: node --test test/
//
// No framework/dependency — Node's built-in test runner, consistent
// with this project's zero-build (no npm) architecture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { gapToText, gapToStringArray, gapNormalizeRoadmap } = require('../js/gap-normalize.js');

test('gapToText: plain string passes through', () => {
  assert.equal(gapToText('AWS Certified Developer'), 'AWS Certified Developer');
});

test('gapToText: never produces "[object Object]" for an object', () => {
  const out = gapToText({ name: 'AWS Certified Developer', reason: 'matches JD requirement' });
  assert.equal(out, 'AWS Certified Developer');
  assert.ok(!out.includes('[object'));
});

test('gapToText: falls back to any string/number fields when no preferred key exists', () => {
  const out = gapToText({ foo: 'Terraform', bar: 3 });
  assert.equal(out, 'Terraform — 3');
  assert.ok(!out.includes('[object'));
});

test('gapToText: object with no usable fields returns empty string, not "[object Object]"', () => {
  assert.equal(gapToText({ nested: { a: 1 } }), '');
});

test('gapToText: null/undefined become empty string', () => {
  assert.equal(gapToText(null), '');
  assert.equal(gapToText(undefined), '');
});

test('gapToText: array of strings joins with ", "', () => {
  assert.equal(gapToText(['Terraform', 'Kubernetes']), 'Terraform, Kubernetes');
});

test('gapToStringArray: certifications present as plain strings pass through', () => {
  assert.deepEqual(
    gapToStringArray(['AWS Certified Developer', 'HashiCorp Terraform Associate']),
    ['AWS Certified Developer', 'HashiCorp Terraform Associate']
  );
});

test('gapToStringArray: quick wins as objects normalize to readable strings', () => {
  const out = gapToStringArray([
    { title: 'Add a metric to your latest role' },
    { name: 'Pin a project post' },
  ]);
  assert.deepEqual(out, ['Add a metric to your latest role', 'Pin a project post']);
  assert.ok(out.every(s => !s.includes('[object')));
});

test('gapToStringArray: absent/empty input returns [] (graceful empty state, not a crash)', () => {
  assert.deepEqual(gapToStringArray(undefined), []);
  assert.deepEqual(gapToStringArray(null), []);
  assert.deepEqual(gapToStringArray([]), []);
  assert.deepEqual(gapToStringArray(''), []);
});

test('gapToStringArray: legacy single-string response is wrapped, not dropped', () => {
  assert.deepEqual(gapToStringArray('AWS Certified Developer'), ['AWS Certified Developer']);
});

test('gapNormalizeRoadmap: roadmap present as the documented array shape renders correctly', () => {
  const out = gapNormalizeRoadmap([
    { phase: 'Weeks 1-4', focus: 'Terraform fundamentals', actions: ['Complete the tutorial'], resources: ['HashiCorp Learn'] },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].phase, 'Weeks 1-4');
  assert.equal(out[0].focus, 'Terraform fundamentals');
  assert.deepEqual(out[0].actions, ['Complete the tutorial']);
  assert.deepEqual(out[0].resources, ['HashiCorp Learn']);
});

test('gapNormalizeRoadmap: nested action/resource objects normalize instead of "[object Object]"', () => {
  const out = gapNormalizeRoadmap([{
    phase: 'Weeks 1-4',
    focus: 'Terraform fundamentals',
    actions: [{ text: 'Complete the official tutorial' }],
    resources: [{ name: 'HashiCorp Learn', url: 'https://...' }],
  }]);
  assert.deepEqual(out[0].actions, ['Complete the official tutorial']);
  assert.deepEqual(out[0].resources, ['HashiCorp Learn']);
});

test('gapNormalizeRoadmap: roadmap wrapped as {phases:[...]} is unwrapped, not treated as absent', () => {
  const out = gapNormalizeRoadmap({
    phases: [{ phase: 'Weeks 1-4', focus: 'Terraform fundamentals', actions: [], resources: [] }],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].focus, 'Terraform fundamentals');
});

test('gapNormalizeRoadmap: roadmap genuinely absent renders as an empty array (real empty state)', () => {
  assert.deepEqual(gapNormalizeRoadmap(undefined), []);
  assert.deepEqual(gapNormalizeRoadmap(null), []);
  assert.deepEqual(gapNormalizeRoadmap([]), []);
});

test('gapNormalizeRoadmap: malformed phase entries (plain strings) do not crash', () => {
  const out = gapNormalizeRoadmap(['Learn Terraform basics']);
  assert.equal(out.length, 1);
  assert.equal(out[0].focus, 'Learn Terraform basics');
  assert.deepEqual(out[0].actions, []);
});

test('gapNormalizeRoadmap: a phase with no focus/actions/resources is dropped, not rendered blank', () => {
  const out = gapNormalizeRoadmap([{ phase: 'Weeks 1-4' }]);
  assert.deepEqual(out, []);
});
