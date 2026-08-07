// TTS 연결 점검 — 영상을 만들기 전에 "지금 이 환경에서 어느 제공자로 소리가 나오는가"를 확인한다.
// 대본 없이 짧은 한 문장을 실제로 합성해 보므로, 키·리전·네트워크·edge-tts 설치까지 한 번에 걸린다.
//
//   node tools/video/check-tts.js                  전체 점검 (edge · sapi · azure)
//   node tools/video/check-tts.js --provider azure  하나만
//   node tools/video/check-tts.js --lang en --gender male
//   node tools/video/check-tts.js --keep            생성된 mp3를 지우지 않는다 (목소리 들어볼 때)
//
// 키 값은 절대 찍지 않는다 — 길이와 앞 4글자만 보여 준다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir, envFiles, loadEnv, mediaDuration, parseArgs, tryRun } from './lib/util.js';
import { PROVIDER_LIST, resolveVoice, synthDirect } from './lib/tts.js';

const args = parseArgs();
const lang = args.lang ?? 'ko';
const gender = args.gender ?? 'female';
const voice = resolveVoice({ lang, gender, ...(args.voice ? { voice: args.voice } : {}) });
const text = args.text ?? { ko: '연결 테스트입니다.', en: 'Connection test.', ja: '接続テストです。', zh: '连接测试。' }[lang] ?? '연결 테스트입니다.';

const mask = (v) => (v ? `${v.slice(0, 4)}… (${v.length}자)` : '(없음)');
const ok = (s) => `  OK   ${s}`;
const bad = (s) => `  실패 ${s}`;

// ── 1. .env ───────────────────────────────────────────────────────────────────
process.stdout.write('[1] .env\n');
const found = envFiles();
if (!found.length) process.stdout.write('  (없음 — 셸 환경변수만 씁니다)\n');
for (const f of found) process.stdout.write(`  · ${path.relative(process.cwd(), f)}\n`);
const applied = loadEnv();
for (const { file, count } of applied) {
  process.stdout.write(`    → ${path.relative(process.cwd(), file)} 에서 ${count}개 적용\n`);
}
process.stdout.write(`  AZURE_SPEECH_KEY    ${mask(process.env.AZURE_SPEECH_KEY)}\n`);
process.stdout.write(`  AZURE_SPEECH_REGION ${process.env.AZURE_SPEECH_REGION || '(없음)'}\n`);

// ── 2. 외부 도구 ──────────────────────────────────────────────────────────────
process.stdout.write('\n[2] 외부 도구\n');
for (const [label, cmd, argv] of [
  ['ffmpeg', 'ffmpeg', ['-version']],
  ['ffprobe', 'ffprobe', ['-version']],
]) {
  const res = await tryRun(cmd, argv);
  process.stdout.write(res ? ok(`${label}  ${res.out.split('\n')[0].slice(0, 60)}`) + '\n' : bad(`${label} — PATH에 없습니다`) + '\n');
}

// ── 3. 제공자별 실제 합성 ─────────────────────────────────────────────────────
// 씬 파이프라인(synthesizeScenes)을 그대로 쓰지 않고 제공자를 직접 부른다 —
// 여기서는 폴백이 끼면 안 된다. 어느 제공자가 살아 있는지를 있는 그대로 봐야 한다.
const targets = args.provider ? [args.provider] : PROVIDER_LIST;
const dir = ensureDir(path.join(os.tmpdir(), 'develop-video-check'));

process.stdout.write(`\n[3] 합성 (${lang}/${gender} · ${voice})\n    "${text}"\n`);
const results = [];
for (const name of targets) {
  const file = path.join(dir, `check-${name}.${name === 'sapi' ? 'wav' : 'mp3'}`);
  fs.rmSync(file, { force: true });
  const started = process.hrtime.bigint();
  try {
    await synthDirect(name, {
      text,
      file,
      // sapi는 윈도에 설치된 음성 이름만 받는다 — 뉴럴 id를 주면 무시하고 기본 목소리로 읽는다.
      voice: name === 'sapi' ? (args.voice ?? '') : voice,
      rate: '+0%',
      volume: '+0%',
      pitch: '+0Hz',
    });
    const took = Number(process.hrtime.bigint() - started) / 1e9;
    const duration = await mediaDuration(file);
    const bytes = fs.statSync(file).size;
    process.stdout.write(ok(`${name.padEnd(5)} ${duration.toFixed(2)}s · ${(bytes / 1024).toFixed(0)}KB · ${took.toFixed(1)}s 걸림`) + '\n');
    results.push({ name, file, duration });
  } catch (err) {
    process.stdout.write(bad(`${name.padEnd(5)} ${String(err.message).split('\n')[0]}`) + '\n');
  }
}

// ── 4. 판정 ───────────────────────────────────────────────────────────────────
process.stdout.write('\n[4] 판정\n');
const live = new Set(results.map((r) => r.name));
if (live.has('azure')) {
  process.stdout.write('  azure 사용 가능 — --provider azure 로 쓸 수 있습니다.\n');
} else if (targets.includes('azure')) {
  process.stdout.write('  azure 사용 불가 — --provider azure 로 실행해도 edge로 자동 전환됩니다.\n');
}
if (live.has('edge')) {
  process.stdout.write('  edge 사용 가능 — 기본 경로가 살아 있습니다(키 불필요).\n');
} else {
  process.stdout.write('  edge 사용 불가 — `pip install edge-tts` 또는 네트워크를 확인하세요.\n');
}
if (!live.size) {
  process.stdout.write('  쓸 수 있는 제공자가 없습니다. 영상을 만들 수 없습니다.\n');
  process.exit(1);
}

if (args.keep) {
  process.stdout.write('\n생성된 파일 (ffplay로 들어 보세요)\n');
  for (const r of results) process.stdout.write(`  ffplay -autoexit -nodisp "${r.file}"\n`);
} else {
  for (const r of results) fs.rmSync(r.file, { force: true });
}
