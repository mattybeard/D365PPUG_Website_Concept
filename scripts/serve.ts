import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = path.resolve('dist');
const config = JSON.parse(await readFile(path.join(root, 'staticwebapp.config.json'), 'utf8')) as {
  routes: { route: string; redirect?: string; statusCode?: number; headers?: Record<string, string> }[];
  globalHeaders: Record<string, string>;
};
const flag = process.argv.indexOf('--port');
const port = flag === -1 ? 4173 : Number(process.argv[flag + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port');
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    let pathname: string;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { response.writeHead(400).end('Invalid URL'); return; }
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`) && file !== root) { response.writeHead(403).end('Forbidden'); return; }
    const route = config.routes.find(route => route.route.endsWith('*') ? pathname.startsWith(route.route.slice(0, -1)) : route.route === pathname);
    if (route?.redirect) { response.writeHead(route.statusCode ?? 301, { location: route.redirect }).end(); return; }
    let resolved = file;
    let status = 200;
    try {
      if ((await stat(file)).isDirectory()) resolved = path.join(file, 'index.html');
      await stat(resolved);
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
      resolved = path.join(root, '404.html');
      status = 404;
    }
    const body = await readFile(resolved);
    const compressed = /\bgzip\b/.test(request.headers['accept-encoding'] ?? '');
    response.writeHead(status, {
      ...config.globalHeaders, ...route?.headers,
      'content-type': mime[path.extname(resolved)] ?? 'application/octet-stream',
      'content-length': compressed ? gzipSync(body).length : body.length,
      ...(compressed ? { 'content-encoding': 'gzip' } : {}),
      vary: 'Accept-Encoding',
    });
    response.end(request.method === 'HEAD' ? undefined : compressed ? gzipSync(body) : body);
  } catch (error) {
    console.error('Preview request failed:', error);
    response.writeHead(500).end('Preview request failed');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Static preview ready at http://127.0.0.1:${port}`));
