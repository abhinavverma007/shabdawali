import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrigins, isAllowedOrigin } from '../src/origins.js';

test('parseOrigins trims, drops trailing slashes and empty entries', () => {
  assert.deepEqual(parseOrigins(' https://a.vercel.app/ , http://localhost:3000,, '), ['https://a.vercel.app', 'http://localhost:3000']);
  assert.deepEqual(parseOrigins(undefined), []);
});

test('exact origins match regardless of a trailing slash on either side', () => {
  const allowed = parseOrigins('https://shabdawali.vercel.app/');
  assert.ok(isAllowedOrigin('https://shabdawali.vercel.app', allowed));
  assert.ok(isAllowedOrigin('https://shabdawali.vercel.app/', allowed));
  assert.ok(!isAllowedOrigin('https://evil.example', allowed));
  assert.ok(!isAllowedOrigin('http://shabdawali.vercel.app', allowed), 'scheme must match');
  assert.ok(!isAllowedOrigin('https://shabdawali.vercel.app.evil.example', allowed));
});

test('a wildcard stands for exactly one subdomain label', () => {
  const allowed = parseOrigins('https://shabdawali-*.vercel.app');
  assert.ok(isAllowedOrigin('https://shabdawali-git-main-abhinav.vercel.app', allowed));
  assert.ok(isAllowedOrigin('https://shabdawali-1a2b3c.vercel.app', allowed));
  assert.ok(!isAllowedOrigin('https://other-project.vercel.app', allowed));
  assert.ok(!isAllowedOrigin('https://shabdawali-x.evil.example', allowed));
  assert.ok(!isAllowedOrigin('https://shabdawali-x.y.vercel.app', allowed), 'wildcard must not span dots');
  assert.ok(!isAllowedOrigin('https://shabdawali-x.vercel.app.evil.example', allowed));
});

test('requests with no Origin header (health checks, curl) are allowed; browsers always send one', () => {
  assert.ok(isAllowedOrigin(undefined, parseOrigins('https://a.app')));
});

test('with nothing configured, no browser origin is allowed', () => {
  assert.ok(!isAllowedOrigin('https://a.app', []));
});
