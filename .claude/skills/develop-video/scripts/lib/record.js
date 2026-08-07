// Playwright로 앱을 실제 조작하며 한 번에 통짜 녹화하고, 씬 경계 타임라인을 남긴다.
//
// 왜 씬별로 따로 찍지 않는가: 컨텍스트를 씬마다 새로 만들면 로그인·위저드 진행 상태가 날아간다.
// 통짜로 찍고 경계 시각만 기록해 두면 나중에 ffmpeg으로 자유롭게 잘라 15초/30초 버전을 뽑을 수 있다.
//
// 씬 길이는 max(내레이션 길이 + hold, 실제 조작에 걸린 시간)이다. 조작이 더 오래 걸리면
// 영상을 자르는 대신 음성 쪽에 무음을 덧대므로(compose.js) 화면이 문장 도중에 끊기지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, resolvePlaywright, sleep, writeJson } from './util.js';

// Playwright는 실제로 촬영할 때 찾는다 — 최상단에서 부르면 import 만으로 죽어서, 브라우저가
// 필요 없는 경로(`--only tts`, 모션 전용 영상)까지 같이 막힌다. motion.js 도 같은 이유다.

// 녹화 시작 시점과 1번 씬 시작 사이의 여유 — 첫 프레임이 흰 화면으로 찍히는 것을 막는다.
const LEAD_IN_MS = 1200;

// Playwright 녹화에는 마우스 커서가 찍히지 않는다. 광고에서 클릭이 보이지 않으면 조작이
// 전달되지 않으므로 가짜 커서를 오버레이로 그린다.
const CURSOR_BOOTSTRAP = `
(() => {
  const ID = '__ad-cursor';
  const mount = () => {
    if (document.getElementById(ID)) return document.getElementById(ID);
    const el = document.createElement('div');
    el.id = ID;
    el.style.cssText = [
      'position:fixed', 'left:0', 'top:0', 'width:20px', 'height:20px',
      'margin:-10px 0 0 -10px', 'border-radius:9999px',
      'background:rgba(99,102,241,.25)', 'border:2px solid rgba(79,70,229,.95)',
      'box-shadow:0 2px 12px rgba(15,23,42,.35)', 'z-index:2147483647',
      'pointer-events:none', 'opacity:0',
      'transition:transform .5s cubic-bezier(.22,.61,.36,1), opacity .3s',
    ].join(';');
    (document.body || document.documentElement).appendChild(el);
    return el;
  };
  window.__adCursorTo = (x, y) => {
    const el = mount();
    el.style.opacity = '1';
    el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  };
  window.__adCursorClick = () => {
    const el = mount();
    const ring = document.createElement('div');
    ring.style.cssText = el.style.cssText
      .replace('opacity:0', 'opacity:.9')
      .replace(/transition:[^;]+;?/, '');
    ring.style.transform = el.style.transform;
    ring.style.background = 'transparent';
    ring.style.animation = '__adRipple .6s ease-out forwards';
    (document.body || document.documentElement).appendChild(ring);
    setTimeout(() => ring.remove(), 700);
  };
  window.__adHighlight = (sel, ms) => {
    const target = document.querySelector(sel);
    if (!target) return;
    const r = target.getBoundingClientRect();
    const box = document.createElement('div');
    box.style.cssText = [
      'position:fixed', 'left:' + (r.left - 6) + 'px', 'top:' + (r.top - 6) + 'px',
      'width:' + (r.width + 12) + 'px', 'height:' + (r.height + 12) + 'px',
      'border:3px solid rgba(79,70,229,.95)', 'border-radius:12px',
      'box-shadow:0 0 0 9999px rgba(15,23,42,.28)', 'z-index:2147483646',
      'pointer-events:none', 'animation:__adPulse 1.2s ease-in-out infinite',
    ].join(';');
    (document.body || document.documentElement).appendChild(box);
    setTimeout(() => box.remove(), ms);
  };
  if (!document.getElementById('__ad-cursor-style')) {
    const style = document.createElement('style');
    style.id = '__ad-cursor-style';
    style.textContent =
      '@keyframes __adRipple{from{opacity:.9;scale:1}to{opacity:0;scale:3.2}}' +
      '@keyframes __adPulse{0%,100%{opacity:1}50%{opacity:.45}}' +
      '*{cursor:none !important}';
    (document.head || document.documentElement).appendChild(style);
  }
})();
`;

async function moveCursorTo(page, selector, timeout) {
  const box = await page.locator(selector).first().boundingBox({ timeout });
  if (!box) return null;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(([px, py]) => window.__adCursorTo?.(px, py), [x, y]);
  await page.mouse.move(x, y);
  await sleep(550); // 커서 이동 트랜지션이 끝나고 나서 클릭해야 화면에 조작이 보인다
  return { x, y };
}

async function doAction(page, action, baseUrl) {
  // optional 액션은 짧게 끊는다 — 없는 요소를 기다리다 씬 길이가 통째로 늘어나면 광고가 망가진다.
  const timeout = (action.timeout ?? (action.optional ? 3 : 20)) * 1000;

  if (action.goto !== undefined) {
    const url = action.goto.startsWith('http') ? action.goto : baseUrl + action.goto;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(CURSOR_BOOTSTRAP);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    return;
  }
  if (action.wait !== undefined) return sleep(action.wait * 1000);
  if (action.waitFor !== undefined) {
    await page.locator(action.waitFor).first().waitFor({ state: 'visible', timeout });
    return;
  }
  if (action.hover !== undefined) {
    await moveCursorTo(page, action.hover, timeout);
    await page.locator(action.hover).first().hover({ timeout }).catch(() => {});
    return;
  }
  if (action.click !== undefined) {
    await moveCursorTo(page, action.click, timeout);
    await page.evaluate(() => window.__adCursorClick?.());
    await page.locator(action.click).first().click({ timeout });
    return;
  }
  if (action.type !== undefined) {
    await moveCursorTo(page, action.type, timeout);
    await page.evaluate(() => window.__adCursorClick?.());
    await page.locator(action.type).first().click({ timeout });
    await page.locator(action.type).first().type(action.text, { delay: action.delay ?? 55 });
    return;
  }
  if (action.press !== undefined) {
    await page.keyboard.press(action.press);
    return;
  }
  if (action.scroll !== undefined) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), action.scroll);
    await sleep((action.duration ?? 1.2) * 1000);
    return;
  }
  if (action.highlight !== undefined) {
    await page.evaluate(
      ([sel, ms]) => window.__adHighlight?.(sel, ms),
      [action.highlight, (action.duration ?? 2) * 1000]
    );
    await sleep(300);
    return;
  }
  throw new Error(`알 수 없는 액션: ${JSON.stringify(action)}`);
}

/**
 * 씬 목록대로 앱을 조작하며 녹화한다.
 * @returns {{videoFile:string, leadIn:number, scenes:Array<{id:string,start:number,end:number}>}}
 */
export async function recordTake(scenes, config, dirs, { headed = false, baseUrl } = {}) {
  // Playwright가 뱉는 임시 webm은 work/ 에 받는다 — 통짜 원본(raw/take.webm)이 있는 폴더를
  // 비우면 안 되기 때문이다. 촬영이 끝나면 파일 하나만 raw/ 로 옮긴다.
  const videoDir = path.join(dirs.work, 'playwright');
  fs.rmSync(videoDir, { recursive: true, force: true });
  ensureDir(videoDir);

  const size = { width: config.width, height: config.height };
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({
    headless: !headed,
    args: [`--window-size=${size.width},${size.height}`, '--force-device-scale-factor=1'],
  });
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    reducedMotion: 'no-preference',
    recordVideo: { dir: videoDir, size },
    ...(config.storageState && fs.existsSync(config.storageState)
      ? { storageState: config.storageState }
      : {}),
  });
  await context.addInitScript(CURSOR_BOOTSTRAP);

  const timeline = [];
  let leadIn = 0;
  let videoFile = '';

  try {
    const page = await context.newPage();
    const pageCreatedAt = Date.now();

    // 리드인: 첫 씬의 시작 화면을 미리 띄워 두고 잠시 쉰다.
    const first = scenes[0]?.actions?.find((a) => a.goto !== undefined);
    await doAction(page, { goto: first?.goto ?? '/' }, baseUrl);
    await sleep(LEAD_IN_MS);

    const takeStart = Date.now();
    leadIn = (takeStart - pageCreatedAt) / 1000;

    for (const scene of scenes) {
      const sceneStart = Date.now();
      const start = (sceneStart - takeStart) / 1000;
      for (const action of scene.actions ?? []) {
        // optional: 백엔드·AI가 붙지 않은 환경에서도 촬영이 끊기지 않게 한다.
        try {
          await doAction(page, action, baseUrl);
        } catch (error) {
          if (!action.optional) throw error;
          process.stdout.write(`    (건너뜀) ${Object.keys(action)[0]}: ${error.message.split('\n')[0]}\n`);
        }
      }
      const targetMs = (scene.audioDuration + (scene.hold ?? 0.6)) * 1000;
      const elapsed = Date.now() - sceneStart;
      if (elapsed < targetMs) await sleep(targetMs - elapsed);

      const end = (Date.now() - takeStart) / 1000;
      timeline.push({ id: scene.id, start, end, overran: elapsed > targetMs });
      process.stdout.write(
        `  · ${scene.id.padEnd(6)} ${(end - start).toFixed(2)}s` +
          `${elapsed > targetMs ? '  (조작이 내레이션보다 김 — 음성에 무음을 덧댐)' : ''}\n`
      );
    }

    await sleep(600); // 마지막 프레임이 잘리지 않도록 여유
    const video = page.video();
    await context.close();
    videoFile = path.join(ensureDir(dirs.raw), 'take.webm');
    fs.rmSync(videoFile, { force: true });
    fs.renameSync(await video.path(), videoFile);
  } finally {
    await browser.close().catch(() => {});
  }

  const take = { videoFile, leadIn, width: size.width, height: size.height, scenes: timeline };
  writeJson(path.join(dirs.raw, 'timeline.json'), take);
  return take;
}
