import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PHONE_SERVER_PORT,
  PhoneServerError,
  isAllowedSender,
  listLanAddresses,
  phoneContentSecurityPolicy,
  resolveRequestPath,
  startPhoneServer,
  type PhoneServer,
} from '../../desktop/phoneServer';

interface RawResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

/** Sends the request target unchanged (no URL normalisation) to 127.0.0.1. */
function send(port: number, path: string, method = 'GET'): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}

function listenOn(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen({ port, host: '0.0.0.0' }, () => resolve(s));
  });
}

let root: string;
let secretFile: string;

beforeAll(() => {
  const base = mkdtempSync(join(tmpdir(), 'ap122-'));
  root = join(base, 'dist');
  mkdirSync(join(root, 'assets', 'sub'), { recursive: true });
  writeFileSync(
    join(root, 'index.html'),
    '<!doctype html><title>t</title><script>window.x=1</script><script src="/assets/a.js"></script>',
  );
  writeFileSync(join(root, 'assets', 'a.js'), 'console.log(1);');
  writeFileSync(join(root, 'assets', 'b.css'), 'body{}');
  writeFileSync(join(root, 'assets', 'c.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  writeFileSync(join(root, 'assets', 'd.json'), '{}');
  writeFileSync(join(root, 'manifest.webmanifest'), '{}');
  writeFileSync(join(root, 'assets', 'e.mp3'), 'x');
  writeFileSync(join(root, 'assets', 'f.ogg'), 'x');
  writeFileSync(join(root, 'assets', 'g.wav'), 'x');
  writeFileSync(join(root, 'assets', 'h.woff2'), 'x');
  writeFileSync(join(root, 'assets', 'sub', 'i.png'), 'x');
  secretFile = join(base, 'secret.txt');
  writeFileSync(secretFile, 'SECRET');
});

afterAll(() => {
  rmSync(join(root, '..'), { recursive: true, force: true });
});

describe('isAllowedSender (PE-148)', () => {
  it.each([
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.254',
    '192.168.0.1',
    '192.168.178.20',
    '127.0.0.1',
    '127.5.6.7',
    '::1',
    '::ffff:192.168.1.5',
    '::FFFF:10.1.2.3',
    '::ffff:127.0.0.1',
  ])('allows private or loopback %s', (addr) => {
    expect(isAllowedSender(addr)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.15.255.255',
    '172.32.0.1',
    '192.169.0.1',
    '11.0.0.1',
    '169.254.1.1',
    '100.64.0.1',
    '0.0.0.0',
    '255.255.255.255',
    '::ffff:8.8.8.8',
    '2001:db8::1',
    'fe80::1',
    'fc00::1',
    '::',
    '192.168.1',
    '192.168.1.256',
    'localhost',
    '',
    undefined,
    null,
  ])('rejects public, other or malformed %s', (addr) => {
    expect(isAllowedSender(addr)).toBe(false);
  });
});

describe('listLanAddresses', () => {
  const base = { netmask: '255.255.255.0', mac: '00:00:00:00:00:00', cidr: null };
  it('returns only private IPv4 of non-internal interfaces, sorted and unique', () => {
    const result = listLanAddresses({
      lo: [{ ...base, address: '127.0.0.1', family: 'IPv4', internal: true }],
      wlan: [
        { ...base, address: '192.168.178.20', family: 'IPv4', internal: false },
        { ...base, address: 'fe80::1', family: 'IPv6', internal: false, scopeid: 1 },
        { ...base, address: 'fd00::1', family: 'IPv6', internal: false, scopeid: 0 },
      ],
      eth: [
        { ...base, address: '10.0.0.5', family: 'IPv4', internal: false },
        { ...base, address: '93.184.216.34', family: 'IPv4', internal: false },
        { ...base, address: '169.254.10.10', family: 'IPv4', internal: false },
        { ...base, address: '100.64.1.1', family: 'IPv4', internal: false },
      ],
      vpn: [
        { ...base, address: '172.20.0.2', family: 'IPv4', internal: false },
        { ...base, address: '172.32.0.2', family: 'IPv4', internal: false },
        { ...base, address: '10.0.0.5', family: 'IPv4', internal: false },
      ],
      down: undefined,
    } as never);
    expect(result).toEqual(['10.0.0.5', '172.20.0.2', '192.168.178.20']);
  });

  it('works with the real interfaces and only lists private IPv4', () => {
    for (const ip of listLanAddresses()) {
      expect(isAllowedSender(ip)).toBe(true);
      expect(ip.startsWith('127.')).toBe(false);
    }
  });
});

describe('resolveRequestPath', () => {
  it('maps / to index.html and normal files below root', () => {
    expect(resolveRequestPath(root, '/')).toBe(join(root, 'index.html'));
    expect(resolveRequestPath(root, '/assets/a.js?v=1#x')).toBe(join(root, 'assets', 'a.js'));
  });

  it.each([
    '/../secret.txt',
    '/assets/../../secret.txt',
    '/%2e%2e/secret.txt',
    '/%2E%2E/secret.txt',
    '/assets/%2e%2e%2f%2e%2e%2fsecret.txt',
    '/..%2fsecret.txt',
    '/..%5csecret.txt',
    '/..\\secret.txt',
    '/assets\\..\\..\\secret.txt',
    '/C:/Windows/win.ini',
    '/C%3A%5CWindows%5Cwin.ini',
    '//etc/passwd',
    '/%2f%2fserver/share',
    '/\\\\server\\share',
    '/index.html%00.png',
    '/index.html::$DATA',
    '/%E0%A4%A',
    '/CON',
    '/assets/nul.txt',
    'http://evil.example/index.html',
    '*',
    '',
    undefined,
  ])('rejects %s', (target) => {
    expect(resolveRequestPath(root, target)).toBeNull();
  });
});

describe('phoneContentSecurityPolicy', () => {
  it('has no external sources', () => {
    const csp = phoneContentSecurityPolicy(["'sha256-abc'"]);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self' 'sha256-abc'");
    expect(csp).not.toMatch(/https?:|\*/);
    expect(csp).not.toContain("'unsafe-eval'");
  });
});

describe('startPhoneServer', () => {
  let server: PhoneServer;

  beforeAll(async () => {
    server = await startPhoneServer({ root, port: 0 });
  });

  afterAll(async () => {
    await server.stop();
  });

  it('uses port 8360 by default', () => {
    expect(PHONE_SERVER_PORT).toBe(8360);
  });

  it('lists only private LAN URLs with the bound port', () => {
    expect(server.port).toBeGreaterThan(0);
    for (const url of server.addresses) {
      const m = /^http:\/\/(\d+\.\d+\.\d+\.\d+):(\d+)$/.exec(url);
      expect(m).not.toBeNull();
      expect(isAllowedSender(m![1])).toBe(true);
      expect(Number(m![2])).toBe(server.port);
    }
  });

  it('serves index.html for / to a private (loopback) sender with security headers', async () => {
    const res = await send(server.port, '/');
    expect(res.status).toBe(200);
    expect(res.body).toContain('<title>t</title>');
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cache-control']).toBe('no-cache');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/);
    expect(csp).not.toMatch(/https?:/);
  });

  it.each([
    ['/assets/a.js', 'text/javascript; charset=utf-8'],
    ['/assets/b.css', 'text/css; charset=utf-8'],
    ['/assets/c.png', 'image/png'],
    ['/assets/d.json', 'application/json; charset=utf-8'],
    ['/manifest.webmanifest', 'application/manifest+json; charset=utf-8'],
    ['/assets/e.mp3', 'audio/mpeg'],
    ['/assets/f.ogg', 'audio/ogg'],
    ['/assets/g.wav', 'audio/wav'],
    ['/assets/h.woff2', 'font/woff2'],
  ])('serves %s as %s', async (path, type) => {
    const res = await send(server.port, path);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(type);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBeUndefined();
  });

  it('answers HEAD with headers but without body', async () => {
    const res = await send(server.port, '/assets/a.js', 'HEAD');
    expect(res.status).toBe(200);
    expect(res.headers['content-length']).toBe(String('console.log(1);'.length));
    expect(res.body).toBe('');
  });

  it.each(['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])('rejects %s with 405', async (method) => {
    const res = await send(server.port, '/index.html', method);
    expect(res.status).toBe(405);
    expect(res.headers['allow']).toBe('GET, HEAD');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it.each([
    '/../secret.txt',
    '/%2e%2e/secret.txt',
    '/%2e%2e%2fsecret.txt',
    '/..%5csecret.txt',
    '/..\\secret.txt',
    '/assets/..\\..\\secret.txt',
    '/C:/Windows/win.ini',
    '//etc/passwd',
    '/missing.js',
    '/assets',
    '/assets/',
    '/assets/sub/',
  ])('answers %s with 404 and never leaks files or listings', async (path) => {
    const res = await send(server.port, path);
    expect(res.status).toBe(404);
    expect(res.body).toBe('Not Found');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });

  it('rejects absolute-form request targets with 404', async () => {
    const res = await send(server.port, `http://127.0.0.1:${server.port}/index.html`);
    expect(res.status).toBe(404);
  });

  it('does not expose files outside root even by their absolute path', async () => {
    const res = await send(server.port, '/' + encodeURIComponent(secretFile));
    expect(res.status).toBe(404);
    expect(res.body).not.toContain('SECRET');
  });
});

describe('startPhoneServer: port handling and stop', () => {
  it('rejects a busy port with port-in-use and does not crash', async () => {
    const blocker = await listenOn(0);
    const address = blocker.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    try {
      const err = await startPhoneServer({ root, port }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(PhoneServerError);
      expect((err as PhoneServerError).code).toBe('port-in-use');
    } finally {
      await new Promise<void>((r) => blocker.close(() => r()));
    }
  });

  it('closes the port on stop so a second start on the same port works', async () => {
    const first = await startPhoneServer({ root, port: 0 });
    const port = first.port;
    expect((await send(port, '/')).status).toBe(200);
    await first.stop();
    await first.stop();
    await expect(send(port, '/')).rejects.toThrow();

    const second = await startPhoneServer({ root, port });
    try {
      expect(second.port).toBe(port);
      expect((await send(port, '/')).status).toBe(200);
    } finally {
      await second.stop();
    }
  });

  it('rejects invalid options', () => {
    expect(() => startPhoneServer({ root: '' })).toThrow(TypeError);
    expect(() => startPhoneServer({ root: 'relative/dist' })).toThrow(TypeError);
    expect(() => startPhoneServer({ root, port: 70000 })).toThrow(TypeError);
    expect(() => startPhoneServer({ root, port: 1.5 })).toThrow(TypeError);
  });
});
