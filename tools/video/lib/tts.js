// 씬 내레이션 → 음성 파일. 제공자 4종을 같은 인터페이스로 감싼다.
//   edge  : Edge 읽어주기 엔드포인트 (키 불필요, Azure 뉴럴 음성과 동일 — 기본값)
//   sapi  : 윈도 내장 System.Speech (완전 오프라인, 네트워크 차단 환경 폴백)
//   azure : Azure Speech REST (정식 키 필요 — 운영·상용 납품용)
//   file  : 직접 녹음/촬영한 파일을 그대로 쓴다 (합성하지 않고 길이만 잰다)
//
// azure 는 키가 없거나 만료·쿼터 소진이면 자동으로 edge 로 내려간다 (아래 UNAVAILABLE_FALLBACK).
// 요금 때문에 키가 끊겨도 영상 제작이 멈추지 않는다 — 목소리 id 가 같아 결과물도 거의 같다.
//
// file 제공자가 이 파이프라인의 핵심 확장점이다. 씬마다 한 컷씩 찍은 영상을 넣으면
// 음성은 그 파일에서 나오고, 같은 파일이 인물 PiP 영상으로도 쓰인다 (compose.js의 presenter).
// 대본이 바뀌지 않은 씬은 manifest 해시로 건너뛴다 (반복 실행이 잦은 작업이라 캐시가 중요하다).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AD_DIR, ensureDir, mediaDuration, readJson, run, tryRun, writeJson } from './util.js';

// 녹음 파일로 받아들이는 확장자 — 영상 파일도 오디오 트랙만 뽑아 쓴다.
const VOICE_EXTS = ['wav', 'mp3', 'm4a', 'aac', 'flac', 'mp4', 'mov', 'mkv'];

export function findVoiceFile(dir, id) {
  for (const ext of VOICE_EXTS) {
    const file = path.join(dir, `${id}.${ext}`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

let pythonRunner = null;

// edge-tts는 PATH의 실행 파일일 수도, 파이썬 모듈일 수도 있다 — 처음 한 번만 탐색한다.
async function resolveEdgeRunner() {
  if (pythonRunner) return pythonRunner;
  const candidates = [
    ['edge-tts', []],
    ['py', ['-m', 'edge_tts']],
    ['python', ['-m', 'edge_tts']],
    ['python3', ['-m', 'edge_tts']],
  ];
  for (const [cmd, prefix] of candidates) {
    if (await tryRun(cmd, [...prefix, '--version'])) {
      pythonRunner = { cmd, prefix };
      return pythonRunner;
    }
  }
  throw new Error(
    'edge-tts를 찾지 못했습니다. `pip install edge-tts` 후 다시 실행하거나 --provider sapi 를 쓰세요.'
  );
}

async function synthEdge({ text, file, voice, rate, volume, pitch }) {
  const { cmd, prefix } = await resolveEdgeRunner();
  await run(cmd, [
    ...prefix,
    '--voice',
    voice,
    '--rate',
    rate,
    '--volume',
    volume,
    '--pitch',
    pitch,
    '--text',
    text,
    '--write-media',
    file,
  ]);
}

// PowerShell 인용 문제를 피하려고 대본을 파일로 넘긴다.
async function synthSapi({ text, file, voice, rate }) {
  const txt = `${file}.txt`;
  fs.writeFileSync(txt, text, 'utf8');
  const script = [
    'Add-Type -AssemblyName System.Speech',
    '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    `$v = '${voice.replace(/'/g, "''")}'`,
    'if ($v) { try { $s.SelectVoice($v) } catch { } }',
    `$s.Rate = ${Math.round(Number.parseFloat(rate) / 10) || 0}`,
    `$s.SetOutputToWaveFile('${file.replace(/'/g, "''")}')`,
    `$s.Speak([IO.File]::ReadAllText('${txt.replace(/'/g, "''")}', [Text.Encoding]::UTF8))`,
    '$s.Dispose()',
  ].join('; ');
  await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', script]);
  fs.rmSync(txt, { force: true });
}

// "이 제공자는 지금 통째로 못 쓴다"는 뜻의 에러 — 대본이나 씬 문제가 아니므로 폴백 대상이다.
function unavailable(message) {
  const err = new Error(message);
  err.unavailable = true;
  return err;
}

// 키 자체가 죽은 상태로 보는 응답 코드. 401 잘못된/만료된 키 · 402 결제 필요 ·
// 403 구독 정지·쿼터 소진 · 429 한도 초과. 그 밖(400 잘못된 SSML 등)은 대본 문제라 그대로 던진다.
const AZURE_DEAD_STATUS = new Set([401, 402, 403, 429]);

// 응답 코드로 이미 판정이 끝난 에러 — 다시 보내도 결과가 같으므로 재시도 대상이 아니다.
function fatal(message) {
  const err = new Error(message);
  err.azureFatal = true;
  return err;
}

// 한 번의 시도를 여기서 끊는다. 두지 않으면 undici 기본값(300초)까지 매달린다 —
// 실제로 헤더만 오고 본문이 멈춘 채 5분을 버티다 대본 전체가 무너진 적이 있다.
const AZURE_TIMEOUT_MS = 45_000;
const AZURE_ATTEMPTS = 3;

async function synthAzure({ text, file, voice, rate, pitch }) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    throw unavailable(
      'AZURE_SPEECH_KEY / AZURE_SPEECH_REGION 이 없습니다 (.env.sample 을 .env 로 복사해 채우세요)'
    );
  }
  const lang = voice.split('-').slice(0, 2).join('-');
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">` +
    `<voice name="${voice}"><prosody rate="${rate}" pitch="${pitch}">` +
    `${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}` +
    `</prosody></voice></speak>`;

  let lastError;
  for (let attempt = 1; attempt <= AZURE_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          'User-Agent': 'develop-video',
        },
        body: ssml,
        signal: AbortSignal.timeout(AZURE_TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = (await res.text()).slice(0, 500);
        if (AZURE_DEAD_STATUS.has(res.status)) {
          throw unavailable(`Azure TTS ${res.status} — 키 만료·결제·쿼터 문제로 보입니다: ${body}`);
        }
        throw fatal(`Azure TTS ${res.status}: ${body}`);
      }
      // 본문을 끝까지 받는 것까지가 한 번의 시도다. 여기서 멈추는 경우가 실제로 있어
      // 예전에는 이 줄이 try 밖에 있다가 잡히지 않은 채로 빌드를 통째로 죽였다.
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (err) {
      if (err.unavailable || err.azureFatal) throw err;
      lastError = err;
      if (attempt < AZURE_ATTEMPTS) {
        process.stdout.write(
          `  ! Azure TTS 응답이 끊겼습니다 (${attempt}/${AZURE_ATTEMPTS}) — 다시 시도합니다: ${err.message}\n`
        );
      }
    }
  }
  // 리전 주소가 틀렸거나 망이 막힌 경우 — 남은 구간도 결과가 같으므로 제공자째로 내린다.
  throw unavailable(`Azure TTS 연결 실패 (${AZURE_ATTEMPTS}회 시도): ${lastError.message}`);
}


// 목소리는 언어 × 성별로 고른다. voice에 정확한 id를 직접 쓰면 그쪽이 우선한다.
// (edge-tts `--list-voices`로 더 많은 후보를 볼 수 있다.)
const VOICE_TABLE = {
  ko: { female: 'ko-KR-SunHiNeural', male: 'ko-KR-InJoonNeural' },
  en: { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural' },
  ja: { female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural' },
  zh: { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunxiNeural' },
};

export function resolveVoice(voiceConfig = {}) {
  if (voiceConfig.voice) return voiceConfig.voice;
  const table = VOICE_TABLE[voiceConfig.lang ?? 'ko'] ?? VOICE_TABLE.ko;
  return table[voiceConfig.gender ?? 'female'] ?? table.female;
}

const PROVIDERS = {
  edge: { synth: synthEdge, ext: 'mp3' },
  sapi: { synth: synthSapi, ext: 'wav' },
  azure: { synth: synthAzure, ext: 'mp3' },
};

export const PROVIDER_LIST = Object.keys(PROVIDERS);

// 폴백 없이 지정한 제공자로 딱 한 번 합성한다 — 점검(check-tts.js)에서 쓴다.
// 씬 파이프라인과 달리 여기서는 "어느 제공자가 살아 있는가"를 있는 그대로 봐야 하므로 폴백이 없다.
export function synthDirect(name, args) {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`알 수 없는 TTS 제공자: ${name} (${PROVIDER_LIST.join('|')})`);
  return provider.synth(args);
}

// 키가 필요한 제공자가 죽었을 때 대신 쓸 제공자.
// azure → edge 는 "무료 등급으로 내려간다"에 가깝다. edge-tts 는 Edge 브라우저의 읽어주기
// 엔드포인트로, 키 없이 같은 Azure 뉴럴 음성(ko-KR-SunHiNeural …)을 쓴다. 목소리 id 가 같으니
// scenes.json 을 한 줄도 안 고치고 이어서 만든다. 확장자도 둘 다 mp3 라 캐시 경로가 어긋나지 않는다.
// (다만 azure 전용 커스텀 보이스는 edge 에 없다 — 그때는 edge-tts 가 이름을 못 찾고 그대로 실패한다.)
const UNAVAILABLE_FALLBACK = { azure: 'edge' };

// 한 번 죽은 제공자는 실행이 끝날 때까지 죽은 것으로 둔다 — 씬마다 401 을 다시 맞지 않는다.
// build.js 가 씬·엔드카드·모션을 나눠 호출하므로 이 상태는 모듈 수준에 둔다.
const degraded = new Map();

export function activeProvider(name) {
  return degraded.get(name) ?? name;
}

async function synthWithFallback(name, args, { allowFallback = true } = {}) {
  const active = activeProvider(name);
  try {
    return await PROVIDERS[active].synth(args);
  } catch (err) {
    const next = UNAVAILABLE_FALLBACK[active];
    if (!err.unavailable || !next || !allowFallback) throw err;
    degraded.set(name, next);
    process.stdout.write(`  ! ${active} 사용 불가 → ${next}(키 불필요)로 전환합니다\n    ${err.message}\n`);
    return PROVIDERS[next].synth(args);
  }
}

/**
 * 씬별 음성을 만들고 실제 길이를 되돌려준다.
 * 영상은 이 길이에 맞춰 촬영되므로 이 단계가 파이프라인의 기준선이다.
 */
export async function synthesizeScenes(scenes, voiceConfig, dirs, { force = false } = {}) {
  const useFile = voiceConfig.provider === 'file';
  const synthName = useFile ? voiceConfig.fallback : voiceConfig.provider;
  const provider = synthName ? PROVIDERS[synthName] : null;
  if (synthName && !provider) {
    throw new Error(`알 수 없는 TTS 제공자: ${synthName} (edge|sapi|azure|file)`);
  }
  if (!useFile && !provider) {
    throw new Error(`알 수 없는 TTS 제공자: ${voiceConfig.provider} (edge|sapi|azure|file)`);
  }
  const dir = ensureDir(dirs.audio);
  const manifestFile = path.join(dir, 'manifest.json');
  const manifest = !force && fs.existsSync(manifestFile) ? readJson(manifestFile) : {};

  // file 제공자: 직접 녹음/촬영한 파일을 그대로 쓴다. 없는 씬은 fallback으로 합성해
  // 일부만 먼저 찍어 두고 나머지는 TTS로 메우는 식의 제작이 가능하다.
  const voiceDir = voiceConfig.dir
    ? path.resolve(AD_DIR, voiceConfig.dir)
    : path.join(AD_DIR, 'presenter');

  const results = [];
  for (const scene of scenes) {
    if (useFile) {
      const recorded = findVoiceFile(voiceDir, scene.id);
      if (recorded) {
        results.push({
          ...scene,
          audioFile: recorded,
          audioDuration: await mediaDuration(recorded),
          recorded: true,
        });
        continue;
      }
      if (!voiceConfig.fallback) {
        throw new Error(
          `녹음 파일이 없습니다: ${path.join(voiceDir, scene.id)}.{${VOICE_EXTS.join('|')}}\n` +
            `일부만 찍었다면 voice.fallback을 "edge"로 두면 나머지는 TTS로 채웁니다.`
        );
      }
    }

    // 폴백이 걸린 뒤에는 그쪽 확장자를 쓴다 (azure→edge 는 둘 다 mp3 라 실제로는 같다).
    const file = path.join(dir, `${scene.id}.${PROVIDERS[activeProvider(synthName)].ext}`);
    const hash = crypto
      .createHash('sha1')
      .update(JSON.stringify([scene.narration, voiceConfig]))
      .digest('hex')
      .slice(0, 12);
    const cached = manifest[scene.id];

    if (cached?.hash === hash && fs.existsSync(file)) {
      results.push({ ...scene, audioFile: file, audioDuration: cached.duration, cached: true });
      continue;
    }
    await synthWithFallback(
      synthName,
      {
        text: scene.narration,
        file,
        voice: resolveVoice(voiceConfig),
        rate: voiceConfig.rate ?? '+0%',
        volume: voiceConfig.volume ?? '+0%',
        pitch: voiceConfig.pitch ?? '+0Hz',
      },
      // voice.strict: true 로 두면 폴백 없이 그대로 실패한다 — 납품본 목소리를 반드시
      // azure 로 맞춰야 해서 조용히 바뀌면 안 되는 경우에 쓴다.
      { allowFallback: !voiceConfig.strict }
    );
    const duration = await mediaDuration(file);
    manifest[scene.id] = { hash, duration };
    results.push({ ...scene, audioFile: file, audioDuration: duration, cached: false });
  }

  writeJson(manifestFile, manifest);
  return results;
}
