import { defineConfig, loadEnv } from 'vite';
import { websites } from './src/websites.js';
import { createGithubService } from './server/github.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GITHUB_');
  const service = createGithubService({ sites: websites, token: env.GITHUB_TOKEN || '' });
  function middleware(req, res, next) {
    if (req.url?.split('?')[0] !== '/api/github') return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(JSON.stringify({ error: 'GET 요청만 지원합니다.' })); }
    service.get().then(data => res.end(JSON.stringify(data))).catch(() => {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'GitHub 연결을 잠시 사용할 수 없어요.' }));
    });
  }
  return { plugins: [{ name: 'webwave-github-api', configureServer(server) { server.middlewares.use(middleware); }, configurePreviewServer(server) { server.middlewares.use(middleware); } }] };
});
