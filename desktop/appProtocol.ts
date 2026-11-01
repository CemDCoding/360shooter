// Own app protocol for the desktop shell (AP-121, PE-149): the game is loaded from
// app://game/ instead of file:// or a port. The fixed origin keeps localStorage (save game)
// in the app profile (%APPDATA%\360shooter) across restarts. Only files below dist/ are
// served, everything else is a 404. No Electron import here, so the logic is testable in Node.
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, sep } from 'node:path';

export const APP_SCHEME = 'app';
export const APP_HOST = 'game';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
export const APP_START_URL = `${APP_ORIGIN}/index.html`;

/** Privileges for protocol.registerSchemesAsPrivileged (standard and secure, PE-149). */
export const APP_SCHEME_PRIVILEGES = {
  standard: true,
  secure: true,
  supportFetchAPI: true,
  corsEnabled: true,
  stream: true,
} as const;

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

export function mimeType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Maps an app:// URL to a file path below distDir. Returns null for foreign schemes or hosts,
 * undecodable paths, NUL bytes, `.`/`..` segments (also encoded), drive letters or other
 * colons and anything that would end up outside distDir. `/` maps to index.html.
 * Whether the path is an existing file is checked by the caller (folders → 404).
 */
export function resolveAppPath(distDir: string, requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (url.protocol !== `${APP_SCHEME}:` || url.host !== APP_HOST) return null;
  if (url.username !== '' || url.password !== '') return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;

  const segments = decoded.split(/[\\/]+/).filter((s) => s.length > 0);
  if (segments.length === 0) segments.push('index.html');
  for (const s of segments) {
    if (s === '.' || s === '..' || s.includes(':')) return null;
  }

  const full = join(distDir, ...segments);
  const rel = relative(distDir, full);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null;
  return full;
}

/** Allowed request URLs of the window: own scheme, data:/blob:, devtools: only in development. */
export function isAllowedRequestUrl(requestUrl: string, allowDevtools: boolean): boolean {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return false;
  }
  if (url.protocol === `${APP_SCHEME}:`) return url.host === APP_HOST;
  if (url.protocol === 'data:' || url.protocol === 'blob:') return true;
  if (url.protocol === 'devtools:') return allowDevtools;
  return false;
}

/** sha256 hashes of inline <script> blocks, so the CSP needs no 'unsafe-inline' for scripts. */
export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const attrs = m[1] ?? '';
    const body = m[2] ?? '';
    if (/\bsrc\s*=/i.test(attrs) || body.length === 0) continue;
    hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return hashes;
}

/** Content-Security-Policy without external sources (§5 Electron hardening). */
export function contentSecurityPolicy(scriptHashes: readonly string[] = []): string {
  const self = `'self' ${APP_ORIGIN}`;
  return [
    "default-src 'none'",
    `script-src ${[self, ...scriptHashes].join(' ')}`,
    `style-src ${self} 'unsafe-inline'`,
    `img-src ${self} data: blob:`,
    `media-src ${self} data: blob:`,
    `font-src ${self} data:`,
    `connect-src ${self} data: blob:`,
    `manifest-src ${self}`,
    `worker-src ${self} blob:`,
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export interface AppRequest {
  readonly url: string;
  readonly method: string;
}

function textResponse(status: number, text: string, extra: Record<string, string> = {}): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

/** Protocol handler body: only GET/HEAD, only existing files below distDir, else 404/405. */
export async function handleAppRequest(request: AppRequest, distDir: string): Promise<Response> {
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return textResponse(405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
  }
  const filePath = resolveAppPath(distDir, request.url);
  if (filePath === null) return textResponse(404, 'Not Found');

  let data: Buffer;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return textResponse(404, 'Not Found');
    data = await readFile(filePath);
  } catch {
    return textResponse(404, 'Not Found');
  }

  const type = mimeType(filePath);
  const headers: Record<string, string> = {
    'Content-Type': type,
    'Content-Length': String(data.byteLength),
    'X-Content-Type-Options': 'nosniff',
  };
  if (type.startsWith('text/html')) {
    headers['Content-Security-Policy'] = contentSecurityPolicy(
      inlineScriptHashes(data.toString('utf8')),
    );
  }
  return new Response(method === 'HEAD' ? null : new Uint8Array(data), { status: 200, headers });
}
