import test from 'node:test';
import assert from 'node:assert/strict';
import { requestOrigin, checkRequestOrigin } from '../lib/origin.mjs';

test('Vercel derives HTTPS origin from the accessed domain when APP_URL is absent', () => {
  for (const host of ['plixroot.vercel.app', 'plixroot-git-preview-team.vercel.app', 'hair.example.com']) {
    const req = { method: 'POST', headers: { host, origin: 'https://' + host } };
    assert.equal(requestOrigin(req, { VERCEL: '1' }), 'https://' + host);
    assert.doesNotThrow(() => checkRequestOrigin(req, { VERCEL: '1' }));
    req.headers.origin = 'https://attacker.example';
    assert.throws(() => checkRequestOrigin(req, { VERCEL: '1' }), { status: 403 });
    delete req.headers.origin;
    assert.throws(() => checkRequestOrigin(req, { VERCEL: '1' }), { status: 403 });
  }
});
test('explicit origin overrides are validated and remain restrictive', () => {
  const req = { method: 'POST', headers: { host: 'preview.vercel.app', origin: 'https://preview.vercel.app' } };
  const env = { VERCEL: '1', APP_URL: 'https://plixroot.vercel.app/' };
  assert.equal(requestOrigin(req, env), 'https://plixroot.vercel.app');
  assert.throws(() => checkRequestOrigin(req, env), { status: 403 });
  for (const APP_URL of ['invalid', 'http://localhost:3000', 'https://plixroot.vercel.app/path', 'https://user:pass@plixroot.vercel.app']) {
    assert.throws(() => requestOrigin(req, { VERCEL: '1', APP_URL }), { status: 503 });
  }
});
test('hostname checks reject unsafe origins and ignore untrusted forwarded hosts locally', () => {
  for (const host of ['good.com/evil', 'user@good.com', 'good.com,evil.com', 'good.com\\evil.com', '', undefined]) {
    assert.throws(() => requestOrigin({ headers: { host } }, { VERCEL: '1' }), { status: 400 });
  }
  assert.equal(requestOrigin({ headers: { host: 'localhost:3000', 'x-forwarded-host': 'evil.example' } }, {}), 'http://localhost:3000');
});
