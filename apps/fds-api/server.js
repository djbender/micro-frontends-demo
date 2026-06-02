import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { validateManifest, selectVersion, djb2 } from '@demo/contracts';

const PORT = 5006;
const MANIFEST_PATH = path.resolve(process.env.ADMIN_MANIFEST_PATH ?? '../../apps/shell/public/discovery.local.json');
const SHELL_ORIGIN = 'http://localhost:5000';

function computeBucket(versions, userToken) {
  if (userToken === 'default') return 1;
  if (userToken === 'canary') return 100;
  return djb2(userToken + versions.map(v => v.url).join('|'));
}

function readManifest() {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw);
}

function resolveManifest(manifest, token) {
  const resolvedMfes = {};
  let lastBucket = null;

  for (const [name, versions] of Object.entries(manifest.microFrontends)) {
    const bucket = computeBucket(versions, token);
    lastBucket = bucket;
    const picked = selectVersion(versions, token);
    resolvedMfes[name] = [picked];
  }

  return { microFrontends: resolvedMfes, schema: manifest.schema, bucket: lastBucket };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method !== 'GET' || url.pathname !== '/microFrontends') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const token = url.searchParams.get('token') || '';

  try {
    const manifest = readManifest();
    const { valid, error } = validateManifest(manifest);
    if (!valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error }));
      return;
    }

    const resolved = resolveManifest(manifest, token);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': SHELL_ORIGIN,
      'Access-Control-Expose-Headers': 'X-Traffic-Bucket',
      'X-Traffic-Bucket': String(resolved.bucket),
    });
    res.end(JSON.stringify(resolved));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`fds-api listening on port ${PORT}`);
});
