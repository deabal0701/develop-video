// 모션그래픽 구간 — HTML/CSS 애니메이션을 프레임 단위로 굽어 광고 중간에 끼워 넣는다.
//
// 인트로·전환 카드·수치 강조처럼 "찍을 실물이 없는" 구간을 웹 기술로 만든다. 앱 화면 녹화와
// 같은 Playwright를 쓰지만 대상이 로컬 HTML이라는 점만 다르다.
//
// 녹화(recordVideo)가 아니라 프레임을 한 장씩 찍는 이유: 헤드리스 녹화는 프레임이 불규칙하게
// 빠져 결과물의 타임라인이 실시간과 어긋난다. 2~3초짜리 짧은 구간에서는 그 오차가 그대로
// "애니메이션이 잘렸다"로 나타난다. Web Animations API로 `currentTime`을 직접 밀어 가며
// 찍으면 프레임이 정확히 대응하고, 같은 입력이면 항상 같은 결과가 나온다.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AD_DIR, ensureDir, resolvePlaywright, run } from './util.js';

const { chromium } = resolvePlaywright();

// html·문구가 바뀌지 않았으면 다시 굽지 않는다 — 프레임 캡처는 비싼 단계다.
function isFresh(source, output) {
  if (!fs.existsSync(output)) return false;
  return fs.statSync(output).mtimeMs >= fs.statSync(source).mtimeMs;
}

/**
 * HTML 한 장을 duration 초짜리 mp4로 굽는다.
 * params는 질의 문자열로 넘어가고 페이지가 `location.search`에서 읽는다 — 같은 템플릿을
 * 문구만 바꿔 여러 번 쓰기 위한 장치다(챕터 카드, 수치 강조 등).
 * @returns {string} 만들어진 클립 경로
 */
export async function renderMotionClip({
  file,
  duration,
  width,
  height,
  fps,
  dirs,
  id,
  force,
  params,
}) {
  const source = path.resolve(AD_DIR, file);
  if (!fs.existsSync(source)) throw new Error(`모션 파일이 없습니다: ${source}`);

  const query = new URLSearchParams(params ?? {}).toString();
  // 같은 템플릿이라도 문구가 다르면 다른 결과물이다 — 파일명에 해시를 넣어 캐시를 분리한다.
  const stamp = query ? `-${crypto.createHash('sha1').update(query).digest('hex').slice(0, 8)}` : '';
  const output = path.join(ensureDir(dirs.motion), `${id}${stamp}-${width}x${height}.mp4`);
  if (!force && isFresh(source, output)) return output;

  const frameDir = path.join(dirs.work, `frames-${id}`);
  fs.rmSync(frameDir, { recursive: true, force: true });
  ensureDir(frameDir);

  const browser = await chromium.launch({
    headless: true,
    // file:// 에서 웹폰트를 읽으려면 필요하다 (Pretendard를 frontend/public에서 그대로 쓴다).
    args: ['--allow-file-access-from-files', '--force-device-scale-factor=1'],
  });

  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const url = `file://${source.replace(/\\/g, '/')}${query ? `?${query}` : ''}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready).catch(() => {});

    const frames = Math.max(1, Math.round(duration * fps));
    for (let i = 0; i < frames; i += 1) {
      await page.evaluate((ms) => {
        for (const animation of document.getAnimations()) {
          animation.pause();
          animation.currentTime = ms;
        }
      }, (i / fps) * 1000);
      await page.screenshot({ path: path.join(frameDir, `f${String(i).padStart(5, '0')}.png`) });
    }

    await run('ffmpeg', [
      ...['-hide_banner', '-loglevel', 'error', '-y'],
      ...['-framerate', String(fps), '-i', path.join(frameDir, 'f%05d.png')],
      ...['-vf', `scale=${width}:${height},setsar=1`],
      ...['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p'],
      output,
    ]);
  } finally {
    await browser.close().catch(() => {});
  }

  fs.rmSync(frameDir, { recursive: true, force: true });
  return output;
}

/** 변형이 쓸 모션 구간 목록을 정리한다 (변형별 제외 지원). */
export function motionClipsFor(motion, variantId) {
  if (!motion || motion.enabled === false) return [];
  return (motion.clips ?? []).filter(
    (clip) => clip.enabled !== false && (!clip.variants || clip.variants.includes(variantId))
  );
}
