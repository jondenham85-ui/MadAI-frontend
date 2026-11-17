const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../services/auth.ts'), 'utf8');
const expression = source.match(/const publicHealth = ([^;]+);/)?.[1] || 'false';
const publicHealth = new Function('path', 'options', `return (${expression});`);
for (const [route, method, expected] of [
  ['/health', undefined, true], ['/health', 'GET', true], ['/health', 'HEAD', true], ['/health', 'get', true],
  ['/health', 'POST', false], ['/health', 'DELETE', false], ['/synth', 'GET', false], ['/tasks', 'POST', false],
  ['/auth/me', 'GET', false], ['/health?extra=1', 'GET', false], ['/health/', 'GET', false], ['/auth/health', 'GET', false],
]) {
  test(`${method || 'default GET'} ${route}: public health exemption is ${expected}`, () => {
    assert.equal(publicHealth(route, { method }), expected);
  });
}
test('the exemption guards browser session lookup without removing protected-route checks', () => {
  assert.match(source, /if \(typeof window !== 'undefined' && !publicHealth\) \{/);
  assert.ok(source.includes("if (!token) throw new ApiError(401"));
  assert.ok(source.includes("requestHeaders.set('Authorization', `Bearer ${accessToken}`)"));
  assert.ok(source.includes('if (response.status === 401 && token && auth)'));
});
