import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  APP_START_URL,
  contentSecurityPolicy,
  handleAppRequest,
  inlineScriptHashes,
  isAllowedRequestUrl,
  mimeType,
  resolveAppPath,
} from '../../desktop/appProtocol';
import { distDir } from '../../desktop/paths';

const DIST = join(tmpdir(), 'ap121-dist-fixed');

describe('distDir', () => {
  it('points to dist/ below the app path', () => {
    expect(distDir(join('x', 'app.asar'))).toBe(join('x', 'app.asar', 'dist'));
  });
  it('rejects an empty app path', () => {
    expect(() => distDir('')).toThrow();
  });
});

describe('resolveAppPath (AP-121)', () => {
  it('maps a normal file below dist/', () => {
    expect(resolveAppPath(DIST, 'app://game/assets/sprites/a.png')).toBe(
      join(DIST, 'assets', 'sprites', 'a.png'),
    );
    expect(resolveAppPath(DIST, APP_START_URL)).toBe(join(DIST, 'index.html'));
  });

  it('maps the root to index.html and ignores query and hash', () => {
    expect(resolveAppPath(DIST, 'app://game/')).toBe(join(DIST, 'index.html'));
    expect(resolveAppPath(DIST, 'app://game/index.html?x=1#y')).toBe(join(DIST, 'index.html'));
  });

  it('never leaves dist/ with .. segments', () => {
    // The URL parser already folds plain dot segments at the root: they stay inside dist/.
    expect(resolveAppPath(DIST, 'app://game/../secret.txt')).toBe(join(DIST, 'secret.txt'));
    expect(resolveAppPath(DIST, 'app://game/assets/../../secret.txt')).toBe(
      join(DIST, 'secret.txt'),
    );
    expect(resolveAppPath(DIST, 'app://game/a/..%2f..%2fsecret.txt')).toBeNull();
    expect(resolveAppPath(DIST, 'app://game/a/..%5c..%5csecret.txt')).toBeNull();
  });

  it('rejects encoded %2e%2e traversal', () => {
    expect(resolveAppPath(DIST, 'app://game/%2e%2e/secret.txt')).toBe(join(DIST, 'secret.txt'));
    expect(resolveAppPath(DIST, 'app://game/%2E%2E%2Fsecret.txt')).toBeNull();
    expect(resolveAppPath(DIST, 'app://game/assets/%2e%2e%2f%2e%2e%2fsecret.txt')).toBeNull();
    // Double encoding is decoded once only: a literal folder name inside dist/.
    expect(resolveAppPath(DIST, 'app://game/%252e%252e/secret.txt')).toBe(
      join(DIST, '%2e%2e', 'secret.txt'),
    );
  });

  it('rejects absolute paths, drive letters, NUL and bad encodings', () => {
    expect(resolveAppPath(DIST, 'app://game/C:/Windows/win.ini')).toBeNull();
    expect(resolveAppPath(DIST, 'app://game/C%3A%5CWindows%5Cwin.ini')).toBeNull();
    expect(resolveAppPath(DIST, 'app://game/index.html%00.png')).toBeNull();
    expect(resolveAppPath(DIST, 'app://game/%E0%A4%A')).toBeNull();
    const r = resolveAppPath(DIST, 'app://game//etc/passwd');
    expect(r).toBe(join(DIST, 'etc', 'passwd'));
  });

  it('rejects foreign schemes and hosts', () => {
    expect(resolveAppPath(DIST, 'file:///C:/Windows/win.ini')).toBeNull();
    expect(resolveAppPath(DIST, 'https://example.com/index.html')).toBeNull();
    expect(resolveAppPath(DIST, 'app://other/index.html')).toBeNull();
    expect(resolveAppPath(DIST, 'app://user:pw@game/index.html')).toBeNull();
    expect(resolveAppPath(DIST, 'not a url')).toBeNull();
  });
});

describe('isAllowedRequestUrl', () => {
  it('allows only the own scheme, data: and blob:', () => {
    expect(isAllowedRequestUrl('app://game/assets/x.png', false)).toBe(true);
    expect(isAllowedRequestUrl('data:image/png;base64,AAAA', false)).toBe(true);
    expect(isAllowedRequestUrl('blob:app://game/1234', false)).toBe(true);
    expect(isAllowedRequestUrl('app://evil/x', false)).toBe(false);
    expect(isAllowedRequestUrl('https://example.com/', false)).toBe(false);
    expect(isAllowedRequestUrl('http://192.168.0.1:8360/', false)).toBe(false);
    expect(isAllowedRequestUrl('ws://localhost:1234/', false)).toBe(false);
    expect(isAllowedRequestUrl('file:///C:/x', false)).toBe(false);
    expect(isAllowedRequestUrl('garbage', false)).toBe(false);
  });
  it('allows devtools: only in development', () => {
    expect(isAllowedRequestUrl('devtools://devtools/bundled/x.html', true)).toBe(true);
    expect(isAllowedRequestUrl('devtools://devtools/bundled/x.html', false)).toBe(false);
  });
});

describe('content security policy', () => {
  it('has no external sources', () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/https?:|ws:|\*/);
    expect(csp).not.toMatch(/script-src[^;]*unsafe/);
  });
  it('hashes inline scripts and skips external ones', () => {
    const hashes = inlineScriptHashes(
      '<script>a()</script><script type="module" src="/x.js"></script><script>b()</script>',
    );
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).toMatch(/^'sha256-[A-Za-z0-9+/=]+'$/);
    expect(contentSecurityPolicy(hashes)).toContain(hashes[0]);
  });
  it('hashes like the HTML parser: CRLF and CR count as LF', () => {
    const lf = inlineScriptHashes('<script>\n  a();\n</script>');
    expect(inlineScriptHashes('<script>\r\n  a();\r\n</script>')).toEqual(lf);
    expect(inlineScriptHashes('<script>\r  a();\r</script>')).toEqual(lf);
  });
});

describe('mimeType', () => {
  it('knows the build file types', () => {
    expect(mimeType('a/index.html')).toMatch(/^text\/html/);
    expect(mimeType('a/x.JS')).toMatch(/^text\/javascript/);
    expect(mimeType('a/x.png')).toBe('image/png');
    expect(mimeType('a/x.wav')).toBe('audio/wav');
    expect(mimeType('a/x.unknown')).toBe('application/octet-stream');
  });
});

describe('handleAppRequest', () => {
  let root = '';
  let dist = '';

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'ap121-'));
    dist = join(root, 'dist');
    mkdirSync(join(dist, 'assets'), { recursive: true });
    writeFileSync(join(dist, 'index.html'), '<html><script>x()</script></html>');
    writeFileSync(join(dist, 'assets', 'a.png'), 'png');
    writeFileSync(join(root, 'secret.txt'), 'secret');
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('serves a normal file with type and nosniff', async () => {
    const res = await handleAppRequest({ url: 'app://game/assets/a.png', method: 'GET' }, dist);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await res.text()).toBe('png');
  });

  it('serves index.html with a CSP that allows its inline script', async () => {
    const res = await handleAppRequest({ url: APP_START_URL, method: 'GET' }, dist);
    expect(res.status).toBe(200);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain(inlineScriptHashes('<script>x()</script>')[0]);
  });

  it('answers HEAD without a body', async () => {
    const res = await handleAppRequest({ url: 'app://game/assets/a.png', method: 'HEAD' }, dist);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  it('returns 404 for folders, missing files and paths outside dist/', async () => {
    for (const url of [
      'app://game/assets',
      'app://game/assets/',
      'app://game/missing.png',
      'app://game/%2e%2e/secret.txt',
      'app://game/..%2fsecret.txt',
      'app://game/../secret.txt',
    ]) {
      const res = await handleAppRequest({ url, method: 'GET' }, dist);
      expect(res.status, url).toBe(404);
    }
  });

  it('rejects other methods with 405', async () => {
    const res = await handleAppRequest({ url: APP_START_URL, method: 'POST' }, dist);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD');
  });
});
