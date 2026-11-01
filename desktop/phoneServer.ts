// Phone server for the desktop shell (AP-122, PE-148): a small, hardened static server that
// serves the Vite build (dist/) into the home network so a phone in the same WLAN can play.
// Rules (PE-148, §5 "Handy-Server"): only incoming connections, only GET/HEAD, only files below
// root, protection against path tricks, answers only to private or loopback senders (else 403),
// no directory listing, security headers, fixed port 8360 (busy → typed error "port-in-use").
// No Electron import, so the logic is testable in Node; node:fs also reads from app.asar.
import { readFile, stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { isIPv4 } from 'node:net';
import { networkInterfaces } from 'node:os';
import { isAbsolute, join, relative, sep } from 'node:path';
import { inlineScriptHashes, mimeType } from './appProtocol.js';

export const PHONE_SERVER_PORT = 8360;
export const PHONE_SERVER_HOST = '0.0.0.0';

export type PhoneServerErrorCode = 'port-in-use' | 'start-failed';

export class PhoneServerError extends Error {
  readonly code: PhoneServerErrorCode;
  constructor(code: PhoneServerErrorCode, message: string) {
    super(message);
    this.name = 'PhoneServerError';
    this.code = code;
  }
}

export interface PhoneServerOptions {
  /** Absolute path of the build folder (dist/), see desktop/paths.ts. */
  readonly root: string;
  /** TCP port, default 8360 (PE-148). 0 picks a free port (tests only). */
  readonly port?: number;
}

export interface PhoneServer {
  /** URLs in the home network, e.g. http://192.168.178.20:8360 (only private IPv4). */
  readonly addresses: readonly string[];
  /** Port actually bound. */
  readonly port: number;
  /** Closes the port and all open connections. Safe to call more than once. */
  stop(): Promise<void>;
}

type InterfaceMap = ReturnType<typeof networkInterfaces>;

/** Parses a dotted IPv4 address into its four octets, or null. */
function ipv4Octets(address: string): [number, number, number, number] | null {
  if (!isIPv4(address)) return null;
  const parts = address.split('.').map(Number);
  if (parts.length !== 4) return null;
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

/** 10/8, 172.16/12, 192.168/16 (RFC 1918). */
function isRfc1918(octets: readonly number[]): boolean {
  const [a, b] = octets as [number, number];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/**
 * True if the sender may get an answer: private IPv4 (10/8, 172.16/12, 192.168/16), loopback
 * (127/8, ::1), also as IPv4-mapped IPv6 (::ffff:a.b.c.d). Everything else, including unknown
 * or malformed addresses, is false.
 */
export function isAllowedSender(remoteAddress: string | undefined | null): boolean {
  if (typeof remoteAddress !== 'string' || remoteAddress.length === 0) return false;
  let address = remoteAddress.toLowerCase();
  if (address === '::1' || address === '0:0:0:0:0:0:0:1') return true;
  if (address.startsWith('::ffff:')) address = address.slice('::ffff:'.length);
  const octets = ipv4Octets(address);
  if (octets === null) return false;
  return octets[0] === 127 || isRfc1918(octets);
}

/** Only private IPv4 addresses (RFC 1918) of active, non-internal interfaces, sorted, unique. */
export function listLanAddresses(interfaces: InterfaceMap = networkInterfaces()): string[] {
  const result = new Set<string>();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      // family is 'IPv4' in current Node; older versions used the number 4.
      const family: unknown = entry.family;
      if (entry.internal || (family !== 'IPv4' && family !== 4)) continue;
      const octets = ipv4Octets(entry.address);
      if (octets !== null && isRfc1918(octets)) result.add(entry.address);
    }
  }
  return [...result].sort();
}

const WINDOWS_DEVICE_NAME = /^(con|prn|aux|nul|com\d|lpt\d|conin\$|conout\$)(\..*)?$/i;

/**
 * Maps the request target (req.url) to a file path below root, or null (→ 404).
 * Only origin-form targets ("/..."), query and fragment are ignored. Rejects undecodable paths,
 * NUL bytes, `.`/`..` segments (also percent-encoded or with backslashes), colons (drive letters,
 * streams), Windows device names and anything that would end up outside root. `/` → index.html.
 * Whether the path is an existing file is checked by the caller (folders → 404, no listing).
 */
export function resolveRequestPath(root: string, requestTarget: string | undefined): string | null {
  if (typeof requestTarget !== 'string' || !requestTarget.startsWith('/')) return null;
  const rawPath = requestTarget.split(/[?#]/, 1)[0] ?? '';

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  // "//host/..." or "\\server\..." would be UNC-like absolute paths.
  if (/^[\\/]{2}/.test(decoded)) return null;

  const segments = decoded.split(/[\\/]+/).filter((s) => s.length > 0);
  if (segments.length === 0) segments.push('index.html');
  for (const s of segments) {
    if (s === '.' || s === '..' || s.includes(':') || WINDOWS_DEVICE_NAME.test(s)) return null;
  }

  const full = join(root, ...segments);
  const rel = relative(root, full);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null;
  return full;
}

/** Content-Security-Policy without external sources; only the own origin ('self'). */
export function phoneContentSecurityPolicy(scriptHashes: readonly string[] = []): string {
  return [
    "default-src 'none'",
    `script-src ${["'self'", ...scriptHashes].join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' data: blob:",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function baseHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': phoneContentSecurityPolicy(),
  };
}

function sendText(
  res: ServerResponse,
  status: number,
  text: string,
  isHead: boolean,
  extra: Record<string, string> = {},
): void {
  const body = Buffer.from(text, 'utf8');
  res.writeHead(status, {
    ...baseHeaders(),
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': String(body.byteLength),
    ...extra,
  });
  res.end(isHead ? undefined : body);
}

/** Request handler: sender (403) → method (405) → path (404) → file. */
export async function handlePhoneRequest(
  req: IncomingMessage,
  res: ServerResponse,
  root: string,
): Promise<void> {
  const method = (req.method ?? '').toUpperCase();
  const isHead = method === 'HEAD';
  if (!isAllowedSender(req.socket.remoteAddress)) {
    sendText(res, 403, 'Forbidden', isHead, { Connection: 'close' });
    return;
  }
  if (method !== 'GET' && !isHead) {
    sendText(res, 405, 'Method Not Allowed', false, { Allow: 'GET, HEAD' });
    return;
  }
  const filePath = resolveRequestPath(root, req.url);
  if (filePath === null) {
    sendText(res, 404, 'Not Found', isHead);
    return;
  }

  let data: Buffer;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      sendText(res, 404, 'Not Found', isHead);
      return;
    }
    data = await readFile(filePath);
  } catch {
    sendText(res, 404, 'Not Found', isHead);
    return;
  }

  const type = mimeType(filePath);
  const headers: Record<string, string> = {
    ...baseHeaders(),
    'Content-Type': type,
    'Content-Length': String(data.byteLength),
  };
  if (type.startsWith('text/html')) {
    headers['Content-Security-Policy'] = phoneContentSecurityPolicy(
      inlineScriptHashes(data.toString('utf8')),
    );
    headers['Cache-Control'] = 'no-cache';
  }
  res.writeHead(200, headers);
  res.end(isHead ? undefined : data);
}

function validateOptions(options: PhoneServerOptions): { root: string; port: number } {
  const root = options?.root;
  if (typeof root !== 'string' || root.length === 0 || !isAbsolute(root)) {
    throw new TypeError('startPhoneServer: root must be an absolute path');
  }
  const port = options.port ?? PHONE_SERVER_PORT;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new TypeError('startPhoneServer: port must be an integer between 0 and 65535');
  }
  return { root, port };
}

/**
 * Starts the phone server on 0.0.0.0:port. Rejects with PhoneServerError "port-in-use" if the
 * port is taken (no crash), "start-failed" for other listen errors.
 */
export function startPhoneServer(options: PhoneServerOptions): Promise<PhoneServer> {
  const { root, port } = validateOptions(options);

  const server = createServer((req, res) => {
    handlePhoneRequest(req, res, root).catch(() => {
      if (!res.headersSent) sendText(res, 500, 'Internal Server Error', false);
      else res.destroy();
    });
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 50;
  server.on('clientError', (_err, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    else socket.destroy();
  });

  return new Promise<PhoneServer>((resolve, reject) => {
    const onStartError = (err: NodeJS.ErrnoException): void => {
      server.close();
      if (err.code === 'EADDRINUSE') {
        reject(new PhoneServerError('port-in-use', `Port ${port} is already in use`));
      } else {
        reject(
          new PhoneServerError(
            'start-failed',
            `Phone server could not start (${err.code ?? 'unknown'})`,
          ),
        );
      }
    };
    server.once('error', onStartError);
    server.listen({ port, host: PHONE_SERVER_HOST, exclusive: true }, () => {
      server.off('error', onStartError);
      // Errors after start must not crash the app; the server keeps running or is stopped.
      server.on('error', () => undefined);
      const address = server.address();
      const boundPort = typeof address === 'object' && address !== null ? address.port : port;
      let stopped: Promise<void> | null = null;
      resolve({
        addresses: listLanAddresses().map((ip) => `http://${ip}:${boundPort}`),
        port: boundPort,
        stop(): Promise<void> {
          stopped ??= new Promise<void>((done) => {
            server.close(() => done());
            server.closeAllConnections();
          });
          return stopped;
        },
      });
    });
  });
}
