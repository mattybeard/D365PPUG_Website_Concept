import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';

export default defineConfig({
  plugins: [react(), {
    name: 'static-page-development',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = request.url ?? '/';
        const pathname = new URL(url, 'http://localhost').pathname;
        if (pathname.startsWith('/@') || pathname.startsWith('/src/') || pathname.startsWith('/node_modules/') || pathname.includes('.')) return next();
        try {
          const route = pathname.endsWith('/') ? pathname : `${pathname}/`;
          const [dataModule, serverModule] = await Promise.all([
            server.ssrLoadModule('/scripts/page-data.ts'),
            server.ssrLoadModule('/src/entry-server.tsx'),
          ]);
          const { content, events } = await dataModule.loadContent();
          const data = dataModule.pageData(route, content, events);
          const template = await server.transformIndexHtml(url, await readFile('index.html', 'utf8'));
          const html = dataModule.documentHtml(template, data, serverModule.render(data));
          response.statusCode = data.page || data.event ? 200 : 404;
          response.setHeader('Content-Type', 'text/html');
          response.end(html);
        } catch (error) {
          next(error);
        }
      });
    },
  }],
  build: { manifest: true },
});
