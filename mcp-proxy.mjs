import { readFileSync } from 'fs';

const SERVER_URL = process.argv[2];
if (!SERVER_URL) {
  process.stderr.write('Usage: node mcp-proxy.mjs <mcp-url>\n');
  process.exit(1);
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
};

async function handleLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const message = JSON.parse(trimmed);
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(message),
    });
    if (res.status === 202) return;
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    if (contentType.includes('text/event-stream')) {
      for (const l of text.split('\n')) {
        if (l.startsWith('data: ')) process.stdout.write(l.slice(6) + '\n');
      }
    } else {
      process.stdout.write(text + '\n');
    }
  } catch (e) {
    process.stderr.write(`mcp-proxy error: ${e.message}\n`);
  }
}

let buffer = '';
let pending = Promise.resolve();

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    pending = pending.then(() => handleLine(line));
  }
});

process.stdin.on('end', async () => {
  if (buffer.trim()) {
    await handleLine(buffer);
  }
  await pending;
  process.exit(0);
});
