// API 강의 영상 촬영용 데모 서버. 의존성 없이 Node 내장 http 만 쓴다.
//
//   node tools/video/demo-api/server.js [--port 4310]
//
// 두 가지를 제공한다.
//   1. /            강의에서 조작할 API 콘솔 화면 (public/index.html)
//   2. /api/todos   실제로 도는 REST 엔드포인트 — 화면의 fetch 가 진짜로 여기에 붙는다
//
// 상태 코드 강의를 위해 일부러 실패하는 길을 남겨 둔다.
//   · 없는 id 조회        → 404
//   · 토큰 없이 생성      → 401
//   · title 없이 생성     → 400
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 4310);
const TOKEN = 'demo-token-2026';

// 촬영할 때마다 같은 화면이 나와야 한다 — 서버를 새로 띄우면 항상 이 상태에서 시작한다.
const seed = () => [
  { id: 1, title: '장보기', done: true, tags: ['생활'] },
  { id: 2, title: 'API 강의 대본 쓰기', done: false, tags: ['일'] },
  { id: 3, title: '러닝 5km', done: false, tags: ['운동'] },
];
let todos = seed();
let nextId = 4;

const json = (res, status, body, extra = {}) => {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'x-request-id': `req_${String(Date.now()).slice(-6)}`,
    ...extra,
  });
  res.end(text);
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ __invalid: true });
      }
    });
  });

const authorized = (req) => req.headers.authorization === `Bearer ${TOKEN}`;

async function api(req, res, url) {
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  if (parts[0] !== 'todos') {
    return json(res, 404, { error: 'not_found', message: `${url.pathname} 경로가 없습니다.` });
  }

  // /api/todos — 목록
  if (parts.length === 1) {
    if (req.method === 'GET') {
      const done = url.searchParams.get('done');
      const list = done === null ? todos : todos.filter((t) => String(t.done) === done);
      return json(res, 200, { count: list.length, items: list });
    }
    if (req.method === 'POST') {
      if (!authorized(req)) {
        return json(res, 401, {
          error: 'unauthorized',
          message: 'Authorization 헤더에 Bearer 토큰이 필요합니다.',
        });
      }
      const body = await readBody(req);
      if (body.__invalid) {
        return json(res, 400, { error: 'invalid_json', message: '본문이 올바른 JSON 이 아닙니다.' });
      }
      if (!body.title) {
        return json(res, 400, {
          error: 'validation_failed',
          message: 'title 은 필수입니다.',
          field: 'title',
        });
      }
      const todo = { id: nextId++, title: String(body.title), done: false, tags: body.tags ?? [] };
      todos.push(todo);
      return json(res, 201, todo, { location: `/api/todos/${todo.id}` });
    }
    return json(res, 405, { error: 'method_not_allowed', allow: 'GET, POST' }, { allow: 'GET, POST' });
  }

  // /api/todos/:id — 하나
  const id = Number(parts[1]);
  const found = todos.find((t) => t.id === id);

  if (req.method === 'GET') {
    if (!found) {
      return json(res, 404, { error: 'not_found', message: `id ${parts[1]} 인 할 일이 없습니다.` });
    }
    return json(res, 200, found);
  }
  if (req.method === 'DELETE') {
    if (!authorized(req)) {
      return json(res, 401, { error: 'unauthorized', message: 'Bearer 토큰이 필요합니다.' });
    }
    if (!found) return json(res, 404, { error: 'not_found' });
    todos = todos.filter((t) => t.id !== id);
    res.writeHead(204).end();
    return;
  }
  return json(res, 405, { error: 'method_not_allowed', allow: 'GET, DELETE' }, { allow: 'GET, DELETE' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/api')) {
    // 응답이 즉시 돌아오면 "요청이 갔다 왔다"는 게 화면에서 안 보인다. 강의용으로 살짝 늦춘다.
    setTimeout(() => api(req, res, url).catch(() => json(res, 500, { error: 'server_error' })), 260);
    return;
  }
  if (url.pathname === '/__reset') {
    todos = seed();
    nextId = 4;
    return json(res, 200, { ok: true });
  }

  const file = path.join(HERE, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!file.startsWith(path.join(HERE, 'public')) || !fs.existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
    return;
  }
  const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
  res.writeHead(200, { 'content-type': type }).end(fs.readFileSync(file));
});

server.listen(PORT, () => {
  process.stdout.write(`데모 API 서버 — http://localhost:${PORT}  (토큰: ${TOKEN})\n`);
});
