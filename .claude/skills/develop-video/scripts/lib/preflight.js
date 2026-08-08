// 대본을 굽기 전에 정적으로 훑어 "합성은 성공하는데 화면이 틀린" 결함을 잡는다.
//
// 이 파일이 있는 이유: 이 파이프라인의 실패는 대부분 **오류를 내지 않는다.** 없는 params 는
// 조용히 지워지고, 잘못 둔 wipe 는 무시되고, 소스보다 긴 B롤은 마지막 프레임에서 얼어붙는다.
// 전부 빌드가 "완료"를 찍은 뒤 프레임을 뽑아야 드러나는데, 한 번 굽는 데 수십 분이 든다.
// 그런데 판단에 필요한 자료(대본 JSON·템플릿 html·B롤 파일)는 **굽기 전에 이미 다 있다.**
// 그래서 1초짜리 검사로 30분을 아낀다.
//
// 규칙: 여기서 하는 일은 읽기와 계산뿐이다. 고치지 않는다 — 무엇이 왜 잘못됐는지만 말한다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** 템플릿이 실제로 받는 params 이름 — html 의 data-p 속성에서 그대로 읽는다. */
function templateKeys(file) {
  const html = fs.readFileSync(file, 'utf8');
  const keys = new Set();
  for (const m of html.matchAll(/data-p="([a-zA-Z][\w-]*)"/g)) keys.add(m[1]);
  return keys;
}

// _params.js 가 모든 템플릿에서 공통으로 처리하는 값들. data-p 로는 안 잡힌다.
const COMMON_PARAMS = new Set([
  'wipe', 'wipeAt', 'wipeColor', 'brand', 'brandSoft', 'bg', 'fg', 'font', 'fontUrl',
  'progress', // chapter.html 은 이것만 JS 로 직접 읽는다
]);

const probeDuration = (file) => {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
  ]).toString().trim();
  return Number(out) || 0;
};

/**
 * @returns {{level:'error'|'warn', clip:string, msg:string}[]}
 */
export function preflight({ config, motionDir, videoRoot, audioDurations = {} }) {
  const found = [];
  const clips = config.render?.motion?.clips ?? [];
  const say = (level, clip, msg) => found.push({ level, clip, msg });

  for (const clip of clips) {
    const params = clip.params ?? {};

    // ── 1. 없는 params 이름 — 조용히 사라진다 ──────────────────────────────
    // _params.js 는 값이 없는 data-p 요소를 **지운다**. 그래서 이름을 틀리면 오류가 아니라
    // "그 글자가 화면에서 빠진 채로" 완성된다. (실제로 stat.html 에 label·note 를 지어냈다가
    // 6장이 통째로 비었다.)
    if (clip.file) {
      const tpl = path.join(motionDir, clip.file);
      if (!fs.existsSync(tpl)) {
        say('error', clip.id, `템플릿이 없다: ${clip.file}`);
      } else {
        const known = templateKeys(tpl);
        for (const key of Object.keys(params)) {
          if (!known.has(key) && !COMMON_PARAMS.has(key)) {
            say('error', clip.id, `${clip.file} 이 받지 않는 params: "${key}" — 화면에서 조용히 빠진다`);
          }
        }
      }
    }

    // ── 2. wipe 를 params 밖에 둔 것 — 무시된다 ───────────────────────────
    // 템플릿에 닿는 것은 params 뿐이다. 최상위 wipe 는 (compose 가 옮겨 주기 전에는) 아무
    // 효과가 없었고, 흰 면이 그대로 떨어져 카드가 지워진 프레임이 남았다.
    if (clip.wipe !== undefined && params.wipe === undefined) {
      say('warn', clip.id, `wipe 가 params 밖에 있다 — params 안에 넣는 편이 확실하다`);
    }

    // ── 3. B롤이 소스보다 길어 마지막 프레임이 얼어붙는 것 ──────────────────
    // build.js 가 구간을 max(선언 duration, 음성+0.5) 로 늘리므로, 내레이션이 길면 선언값과
    // 무관하게 소스를 넘어선다. 넘어선 만큼 정지 화면이 된다.
    if (clip.video) {
      const src = path.resolve(videoRoot, clip.video);
      if (!fs.existsSync(src)) {
        say('error', clip.id, `B롤 파일이 없다: ${clip.video}`);
      } else {
        const spoken = audioDurations[clip.id] ?? 0;
        const real = Math.max(clip.duration ?? 0, spoken ? spoken + 0.5 : 0);
        const avail = probeDuration(src) - (clip.videoStart ?? 0);
        if (real > avail + 0.05) {
          say('error', clip.id,
            `구간 ${real.toFixed(1)}s > 쓸 수 있는 소스 ${avail.toFixed(1)}s ` +
            `— 마지막 ${(real - avail).toFixed(1)}s 가 정지 화면이 된다`);
        }
      }
    }

    // ── 4. 말은 있는데 화면이 없는 구간 ────────────────────────────────────
    if (!clip.file && !clip.video) say('error', clip.id, 'file 도 video 도 없다');
  }

  // ── 5. 워터마크 ─ 비면 표기가 통째로 빠진다 ─────────────────────────────
  if (!config.render?.watermark?.text) {
    say('warn', '(render)', 'watermark.text 가 비었다 — 표기 없이 나간다');
  }

  return found;
}

/** 사람이 읽는 형태로 찍고, 치명적 결함이 있으면 true 를 돌려준다. */
export function reportPreflight(found) {
  if (!found.length) {
    process.stdout.write('  이상 없음\n');
    return false;
  }
  for (const f of found) {
    const mark = f.level === 'error' ? '✗' : '·';
    process.stdout.write(`  ${mark} ${f.clip}: ${f.msg}\n`);
  }
  return found.some((f) => f.level === 'error');
}
