import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { discover, allowedTarget, verifyPageService, isApplicationRunning, inspectBundle } from './dist/discovery.js';
import { CDP, assertLoopback } from './dist/cdp.js';

const app = '/Applications/Antigravity.app';
const profile = join(homedir(), 'Library/Application Support/Antigravity');
const worldName = 'antigravity-zh-display';
const runtimeId = 'antigravity-zh-2350';
const [engine, raw] = await Promise.all([
  readFile(new URL('./engine.js', import.meta.url), 'utf8'),
  readFile(new URL('./dict.json', import.meta.url), 'utf8'),
]);
const dictionary = {schema: 1, version: runtimeId, entries: JSON.parse(raw)};
const sessions = new Map();
const failures = new Map();
let stopping = false;
let logged = 0;
function log(event) {
  if (logged++ < 32) console.log(`${new Date().toISOString()} ${event}`);
}
process.once('SIGTERM', () => { stopping = true; });
process.once('SIGINT', () => { stopping = true; });

async function getEndpoint() {
  // Do not opt into remote debugging in an already-running ordinary instance.
  const ordinary = process.argv[2] === 'already-running';
  const until = Date.now() + (ordinary ? 8000 : 22_000);
  do {
    const checked = await discover(app, profile);
    if (checked) return checked;
    await delay(400);
  } while (!stopping && Date.now() < until);
  return undefined;
}

async function targets(endpoint) {
  const response = await fetch(`http://127.0.0.1:${endpoint.port}/json/list`,
    { signal: AbortSignal.timeout(1800), redirect: 'error' });
  if (!response.ok) throw Error('endpoint unavailable');
  return await response.json();
}
function sourceFor(origin) {
  const boot = {
    origin, dictionary, runtimeId, conservative: false,
    shortcutEnabled: false, hudEnabled: false, translationEnabled: true,
    languageMode: 'zh', locale: 'zh-Hans'
  };
  // Run at document start so initially-created controls are localized too.
  // The reused engine checks paths again and never rewrites editor/chat content.
  return `if (window === window.top && location.origin === ${JSON.stringify(origin)}) {
    globalThis.__GRAVITYBOX_BOOT__ = {...${JSON.stringify(boot)}, path: location.pathname};
    ${engine}
  }; true`;
}

async function attach(target, endpoint) {
  const url = new URL(target.url);
  if (!allowedTarget(target) || !await verifyPageService(url.href, app)) return;
  const ws = assertLoopback(target.webSocketDebuggerUrl);
  if (Number(ws.port) !== endpoint.port || ws.search || ws.hash ||
      ws.pathname !== `/devtools/page/${target.id}`) return;
  const cdp = new CDP(ws.href);
  try {
    await cdp.connect();
    const tree = (await cdp.send('Page.getFrameTree')).frameTree.frame;
    const live = new URL(tree.url);
    if (live.origin !== url.origin || !allowedTarget({...target, url: live.href})) { cdp.close(); return; }
    const source = sourceFor(live.origin);
    const {identifier} = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {source, worldName});
    const {executionContextId} = await cdp.send('Page.createIsolatedWorld', {frameId: tree.id, worldName});
    await cdp.evaluate(source, executionContextId);
    sessions.set(target.id, {cdp, identifier, origin: live.origin});
    failures.delete(target.id);
    cdp.once('disconnected', () => { sessions.delete(target.id); });
    log('已接入官方窗口');
  } catch {
    cdp.close();
    failures.set(target.id, Date.now() + 8000);
  }
}

async function detach(session) {
  try {
    await session.cdp.send('Page.removeScriptToEvaluateOnNewDocument', {identifier: session.identifier});
    const frame = (await session.cdp.send('Page.getFrameTree')).frameTree.frame;
    if (new URL(frame.url).origin === session.origin) {
      const {executionContextId} = await session.cdp.send('Page.createIsolatedWorld', {frameId:frame.id, worldName});
      await session.cdp.evaluate('globalThis.__GRAVITYBOX_ENGINE_V1__?.dispose(); true', executionContextId);
    }
  } catch {} finally { session.cdp.close(); }
}

async function main() {
  // Version labels are informational: the signed bundle and verified live
  // loopback renderer determine whether we can attach.
  const fresh = await inspectBundle(app);
  if (fresh.legacyPatch) return 13;
  const endpoint = await getEndpoint();
  if (!endpoint) return process.argv[2] === 'already-running' ? 12 : 14;
  if (endpoint.legacyPatch) return 13;
  log(`已核验官方 App ${endpoint.appVersion} 与回环调试服务；继续使用官方资料`);
  let outages = 0;
  try {
    while (!stopping) {
      let list;
      try { list = await targets(endpoint); outages = 0; } catch {
        if (!await isApplicationRunning(app)) return 0;
        if (++outages > 6) return 14;
        await delay(1500);
        continue;
      }
      const live = new Set(list.map(target => target.id));
      for (const id of failures.keys()) if (!live.has(id)) failures.delete(id);
      for (const [id, session] of sessions) {
        if (!live.has(id)) { sessions.delete(id); session.cdp.close(); }
      }
      await Promise.all(list.filter(t => allowedTarget(t) && t.webSocketDebuggerUrl &&
        !sessions.has(t.id) && (!failures.has(t.id) || failures.get(t.id) < Date.now()))
        .slice(0, 16).map(target => attach(target, endpoint).catch(() => {})));
      await delay(1600);
    }
    return 0;
  } finally {
    await Promise.all([...sessions.values()].map(detach));
  }
}

try { process.exitCode = await main(); }
catch { log('启动或连接校验失败'); process.exitCode = 14; }
