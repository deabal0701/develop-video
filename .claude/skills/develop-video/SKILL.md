---
name: develop-video
description: 실행 중인 프로젝트 화면을 Playwright로 조작·녹화하고 TTS 내레이션·자막·모션그래픽을 얹어 완성 영상(mp4)을 만든다. 홍보영상·사용 매뉴얼·기능 데모·릴리스 노트 영상 등 용도에 맞춰 대본부터 합성까지 자동으로 처리한다. 찍을 앱 화면이 없는 영상(생애사·행사·소개)도 타이포 카드 + 사진(켄번즈) + 스톡 B롤로 만든다. "홍보영상 만들어줘", "사용법 영상", "데모 영상", "튜토리얼 영상", "제품 소개 영상", "쇼츠 만들어줘", "인생 이야기 영상" 같은 요청에 사용한다.
---

# 프로젝트 영상 제작

프로젝트의 **실제로 동작하는 화면**을 찍어 영상으로 만든다. 목적(홍보·매뉴얼·데모)에 따라 대본
구성과 연출만 달라지고, 파이프라인은 같다.

핵심 원칙은 **실화면이 가장 강한 증거**라는 것이다. AI로 만든 콘셉트 컷보다 제품이 실제로 돌아가는
화면이 설득력이 높다. 모션그래픽은 대체재가 아니라 도입·전환·강조에 쓰는 양념이다.

**찍을 화면이 없는 영상**(생애사·행사·일러스트 홍보)도 같은 파이프라인으로 만든다 — `scenes`를
비우면 녹화를 건너뛰고, 타이포 카드(`intro`·`chapter`·`stat`·`outro`) + 사진(`photo.html`, 켄번즈 줌)
+ 스톡 B롤(클립에 `file` 대신 `video`)을 이어 붙인다. 문법은 `references/authoring.md`의
"사진 구간"·"스톡 영상(B롤) 구간" 참조.

## 파이프라인

```
scenes.json → ① TTS 음성 → ② Playwright 화면 녹화 → ③ ffmpeg 합성 → out/<영상 id>/final/*.mp4 + *.srt
```

**오디오가 기준이다.** 음성을 먼저 만들어 길이를 재고 화면을 거기에 맞춘다.
**통짜로 찍고 나중에 자른다.** 씬 경계만 기록해 두면 길이가 다른 버전을 재촬영 없이 뽑는다.

## 진행 순서

### 1. 요구사항 확정

사용자 요청에서 아래를 정한다. **불분명하면 AskUserQuestion으로 묻되, 기본값으로 진행 가능하면 묻지 않는다.**

| 항목 | 기본값 | 비고 |
|---|---|---|
| 용도 | 요청에서 판단 | 홍보 / 매뉴얼 / 데모 |
| 목소리 성별 | 여성 | `--gender male|female` |
| 언어 | ko | `--lang ko|en|ja|zh` |
| 쇼츠(세로) | 홍보=포함, 매뉴얼=제외 | `--no-shorts` / `--only-shorts` |
| 길이 | 홍보 30초, 매뉴얼 제한 없음 | |

### 2. 프로젝트 파악

**추측하지 말고 저장소를 읽는다.**

- 제품 이름·한 줄 설명·실제 기능: `README.md`, 랜딩 페이지 문구, 설계 문서
- 개발 서버 실행법과 포트: `package.json` scripts, `docker-compose*.yml`, README
- 화면 경로: 라우터 파일 (`router/*`, `App.tsx`, `pages/`, `routes/`)
- 조작할 셀렉터: 해당 화면 컴포넌트에서 `id`, `data-testid`, 버튼 텍스트를 **실제로 확인**
- 브랜드 색·글꼴: 디자인 토큰 파일 (`tokens.css`, `tailwind.config.*`, `theme.*`)

내레이션에 **없는 기능이나 검증되지 않은 수치를 쓰지 않는다.** 저장소에 근거가 있는 문구만 쓴다.

### 3. 스캐폴딩

스킬의 `scripts/`와 `templates/motion/`을 프로젝트로 복사한다 (기본 위치 `tools/video/`).

```bash
mkdir -p tools/video
cp -r <skill>/scripts/build.js <skill>/scripts/check-tts.js <skill>/scripts/lib tools/video/
cp -r <skill>/templates/motion tools/video/
cp <skill>/templates/package.json tools/video/          # "type": "module" — 없으면 구형 Node에서 import가 안 돈다
cp <skill>/templates/.env.sample tools/video/          # 키를 쓸 때만 .env 로 복사해 채운다
npm --prefix tools/video i -D playwright && npx playwright install chromium   # 저장소에 이미 있으면 생략
```

키는 `.env`에서 읽는다(`tools/video/.env` → 상위 → 저장소 루트 순, 셸 환경변수가 우선).
`.env.sample`만 커밋하고 `.env`는 커밋하지 않는다. **기본 경로(edge)는 키가 아예 필요 없다** —
`.env`는 Azure를 쓸 때만 만든다.

**대본을 쓰기 전에 파이프라인부터 한 번 돌린다.** 앱도 대본도 없이 20초 만에 끝나고,
ffmpeg·Playwright·TTS·자막·워터마크가 전부 도는지 확인된다. 여기서 막히면 대본을 아무리 잘 써도 소용없다.

```bash
cp <skill>/templates/scenes.selftest.json tools/video/
node tools/video/check-tts.js                                        # 소리부터
node tools/video/build.js --scenes tools/video/scenes.selftest.json  # out/selftest/final/ 에 2개
```

**이 스킬은 프로젝트에 묶여 있지 않다.** 스크립트는 저장소 이름·경로를 하나도 모르고, 필요한 것은
ffmpeg · Playwright · edge-tts뿐이다. 다른 저장소에 그대로 복사해 위 명령만 실행하면 동작한다
(단, 기본값이 한국어다 — 다른 언어는 `--lang`, 자막 글꼴은 `render.subtitleFont`로 바꾼다).

`.gitignore`에 산출물을 추가한다.

```
/tools/video/out/
/tools/video/presenter/
.env
!.env.sample
```

### 4. 대본 작성

용도에 맞는 템플릿을 `tools/video/scenes.json`으로 복사하고 **대괄호 부분을 전부 실제 값으로 채운다**.

- 홍보: `templates/scenes.promo.json`
- 매뉴얼: `templates/scenes.manual.json`

**템플릿은 골격만 준다. 실제로 돌려서 나온 값은 `examples/`에 있다** — 대본을 쓰기 전에 읽는다.

- [`examples/ttalkak-slide-promo.md`](examples/ttalkak-slide-promo.md) — 한 번 촬영해 변형 5종을 뽑은
  홍보영상 기록. 씬별 실측 길이("15초 버전"이 왜 19.9초인지), 약한 씬을 모션으로 갈아 끼우는 법,
  프레임 두 장(16:9에서 헤드라인이 앱을 가린 사례 · 9:16에서 같은 문구가 안 가리는 이유),
  조정값과 `optional` 판단 기준. 대본 원본은 `examples/ttalkak-slide-promo.scenes.json`.

**혼자서는 정할 수 없는 수치**(`zoom`·`focusX`·`focusY`·`padY`·`crop`·`subtitleMargin`·`rate`)는
예제 값에서 출발한다. 기본값은 대개 틀리고, 예제 값은 최소한 한 번은 눈으로 확인된 값이다.

**화면에 항상 있는 것 두 가지** — 어떤 용도·어떤 변형이든 예외 없다.

- **자막**: 말이 있는 모든 구간(씬·모션)에 항상 굽는다. 끄는 스위치는 없다. 길어서 한 화면에
  안 들어가면 잘리지 않고 여러 장으로 나뉜다. `.srt` 사이드카도 같은 내용으로 함께 나간다.
- **워터마크**: 첫 프레임부터 끝 프레임까지, 기본 **오른쪽 위**. 반투명 판 없이 글자만 얹는다.
  `render.watermark.text`를 **반드시 채운다**(비면 합성 때 경고가 뜨고 표기가 빠진다).
  세로 변형은 `watermarkMargin: 0.075`로 내려 유튜브 상단 UI를 피한다.

용도별 연출 차이는 이렇다.

**홍보** — 첫 5초에 결과물이 보여야 한다(스킵 버튼이 뜨는 시점). 씬은 짧게, 수치는 뱃지로 강조.
16:9는 `captions: false`(상단 헤드라인만 끈다 — 자막과 중복되고 앱 헤더를 가린다), 세로는 caption 유지.

**매뉴얼** — 단계마다 `chapter.html` 카드를 넣어 "지금 몇 번째"를 계속 알린다. `hold`를 길게 잡아
따라 할 시간을 준다. 클릭 전에 `highlight`로 어디를 누르는지 먼저 보여준다. 인물 PiP·BGM은 끈다.

셀렉터가 확실하지 않은 액션에는 **반드시 `"optional": true`를 붙인다.** 없으면 셀렉터 하나가
30초를 먹고 영상을 망친다.

자세한 문법과 함정은 `references/authoring.md`를 읽는다.

### 5. 앱 기동 후 실행

먼저 **소리가 나오는지부터 확인한다.** 30분짜리 촬영을 마치고 TTS에서 막히는 것만큼 아까운 게 없다.

```bash
node tools/video/check-tts.js            # .env·ffmpeg·제공자별 실제 합성까지 한 번에 점검
node tools/video/check-tts.js --keep     # 만든 샘플을 남긴다 (ffplay로 목소리 비교)
```

그다음 개발 서버를 띄우고 **응답을 확인한 뒤**(포트가 밀릴 수 있다 — 로그의 실제 주소를 쓴다) 실행한다.

```bash
node tools/video/build.js                              # 전체
node tools/video/build.js --base-url http://localhost:5175
node tools/video/build.js --gender male --no-shorts
node tools/video/build.js --only tts                   # 목소리만 (톤 고를 때)
node tools/video/build.js --only compose               # 자막·모션만 (재촬영 없음)
node tools/video/build.js --variant <id>               # 특정 변형만
node tools/video/build.js --headed                     # 브라우저를 띄워 놓고 촬영 (디버깅)
node tools/video/build.js --scenes tools/video/scenes.manual.json   # 대본 골라 쓰기
node tools/video/build.js --project release-2025-08    # 출력 폴더 이름 지정 (아래 참조)
```

### 6. 검증 — 눈으로 확인한다

**만들고 끝내지 않는다.** 프레임을 뽑아 실제로 본다. 뽑은 프레임은 그 영상의 `frames/`에 둔다 —
"봤다"는 말보다 남은 파일이 낫고, 다음에 고칠 때 이전 상태와 견줄 수 있다.

```bash
cd tools/video/out/<영상 id>
ffmpeg -v error -y -ss <초> -i final/<변형>.mp4 -frames:v 1 -vf scale=960:-1 frames/<변형>-t<초>.png
```

확인할 것: 셀렉터가 맞아 의도한 화면이 찍혔는가 · 문구가 UI를 가리지 않는가 · 세로 변형에서
자막이 유튜브 UI 영역(하단 330px·우측 160px)을 벗어났는가 · 로딩 스켈레톤이 찍히지 않았는가.

**밝은 화면 한 장·어두운 화면 한 장을 반드시 뽑아 오른쪽 위를 본다.** 워터마크가 두 배경 모두에서
읽히고, 회색 판때기 없이 글자만 얹혀 있어야 한다. 말이 있는 구간이면 자막도 함께 보여야 한다.

**무엇을 보고 판단하는지는 `examples/`의 프레임 두 장이 그대로 보여 준다** — 같은 시각을 16:9와
9:16에서 뽑아 놓았고, 16:9 쪽은 실제로 헤드라인이 앱 UI를 덮은 상태다. 뽑은 프레임을 그것과 견준다.

싱크는 음성 시작 시각으로 확인한다(`references/authoring.md` 참조). 오차가 일정하면 정상,
점점 커지면 드리프트다.

### 7. 재생·보고

`ffplay -autoexit -x 1280 -y 720 out/<영상 id>/final/<변형>.mp4`로 직접 재생해 보여 준다.
(Windows 기본 연결 앱은 실행되지 않는 경우가 있다.)

산출물 위치(`out/<영상 id>/final/`)와 **남은 판단 사항**(BGM 음원, 카피 확정, 도메인 등)을
함께 보고한다.

## 필요한 것

| | 없으면 |
|---|---|
| ffmpeg / ffprobe | 필수. PATH에 있어야 한다 |
| Playwright | 프로젝트 어딘가에 설치. `npm i -D playwright && npx playwright install chromium` |
| edge-tts | `pip install edge-tts` — **API 키 불필요**. 없으면 `--provider sapi`(윈도 내장, 품질 낮음) |
| 실행 중인 앱 | 화면이 안 나온다. 백엔드가 없으면 로딩 스켈레톤이 찍힌다 |

TTS 제공자는 `edge`(기본) · `sapi`(오프라인) · `azure`(정식 키, `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`) ·
`file`(직접 녹음·촬영한 파일). **Azure Speech는 키 없이 못 쓴다** — 키 없는 경로는 edge-tts다.

**azure는 못 쓰게 되면 자동으로 edge로 내려간다.** 키가 비었거나 만료·결제 중단·쿼터 소진
(401·402·403·429)이면 경고 한 줄을 찍고 남은 씬을 전부 edge로 만든다. edge-tts는 Edge 브라우저의
읽어주기 엔드포인트라 **키 없이 같은 Azure 뉴럴 음성**을 쓰고 목소리 id(`ko-KR-SunHiNeural` 등)도
같아서, 요금 문제로 키가 끊겨도 `scenes.json`을 고치지 않고 영상이 그대로 나온다.
잘못된 SSML(400) 같은 대본 문제는 폴백하지 않고 그대로 실패한다.
납품본 목소리를 반드시 azure로 맞춰야 해서 조용히 바뀌면 안 되면 `voice.strict: true`로 끈다.

## 사람이 나오는 영상

씬마다 한 컷씩 찍어 `presenter/<씬id>.mp4`로 넣으면 **같은 파일이 음성과 인물 영상 양쪽으로** 쓰인다.

```json
"voice":     { "provider": "file", "dir": "presenter", "fallback": "edge" },
"presenter": { "enabled": true, "size": 0.22, "align": "bottom-right",
               "zoom": 0.6, "focusX": 0.4, "focusY": 0.05 }
```

`zoom`·`focus*`는 **거의 항상 조정이 필요하다** — 얼굴은 보통 화면 위쪽에 있어서 그냥 가운데를
자르면 원 안이 책상·가슴으로 찬다. 말하지 않는 컷은 사진(png/jpg)도 되며 느린 줌이 걸린다.

## 소재 (BGM · 인물 클립 · 사진 · B롤)

`assets/`에 받아 두고 여러 프로젝트에서 재사용한다. **파일 자체는 git에서 제외된다** —
무료 스톡은 "프로젝트에 사용"은 허용해도 소재 파일의 재배포는 대부분 금지하기 때문이다.
커밋되는 것은 목록(`assets/CATALOG.md`)과 받아오는 도구(`assets/fetch.js`)뿐이다.

```bash
node assets/fetch.js bgm   <직접링크> [파일명]   # assets/bgm/ 에 저장
node assets/fetch.js clip  <직접링크> [파일명]   # assets/presenter/ 에 저장
node assets/fetch.js photo <직접링크> [파일명]   # assets/photo/ — photo.html 배경
node assets/fetch.js broll <직접링크> [파일명]   # assets/broll/ — 클립 video 소스
node assets/fetch.js list
```

사진·B롤을 고를 때는 **직접 링크**가 필요하다 — Pexels·Pixabay 페이지에서 다운로드 버튼의 URL을
쓴다(검색 API는 키가 필요해서 붙이지 않았다). 소재 검색은 사람이 하고, 받는 것과 기록만 도구가 한다.

허용 호스트(Mixkit·Pexels·Pixabay·Coverr)가 아니면 받지 않는다. 받은 뒤에는 출처와 라이선스를
`CATALOG.md`에 기록한다.

`scenes.json`에서 **영상 작업 폴더 기준 상대 경로**로 가리킨다.

```json
"bgm": "../../.claude/skills/develop-video/assets/bgm/<파일>.mp3",
"bgmGain": 0.18,
"bgmDucking": true
```

`bgmDucking`은 내레이션이 나올 때 배경음을 자동으로 눌러 준다(사이드체인). 일정 볼륨으로 깔면
말과 배경음이 같은 대역에서 싸워 대사가 묻힌다. 기본값은 켬.

**곡 선택은 사람이 한다.** 자동으로 고르지 말고 후보를 받아 `ffplay`로 들려주고 고르게 한다.
매뉴얼 영상은 BGM을 아예 빼거나 아주 낮게(0.08 안팎) 까는 편이 낫다.

## 지켜야 할 선

- **유튜브 등에서 영상을 내려받아 쓰지 않는다.** 이용약관 위반이고 저작권·초상권 문제가 된다.
  무료 스톡(Mixkit·Pexels·Pixabay)은 상업적 사용이 허용되며 다운로드도 정식으로 제공된다.
- **실존 인물의 얼굴을 동의 없이 쓰지 않는다.** 본인이거나 라이선스가 있는 소재여야 한다.
- **얼굴이 식별되는 스톡 인물을 특정 서사의 당사자로 쓰지 않는다.** "스무 살의 나"에 모델 사진을
  깔면 라이선스와 무관하게 보는 사람을 오해시킨다. 뒷모습·손·풍경·사물·실루엣을 쓴다.
- **BGM은 라이선스가 확인된 음원만.** 임의 음원은 수익화·노출에서 막힌다.
- **없는 기능을 내레이션에 넣지 않는다.** 광고 문구는 저장소에 근거가 있어야 한다.

## 산출물 — 영상 한 편이 폴더 하나

**영상 한 편(대본 하나)이 `out/<영상 id>/` 하나를 차지한다.** 한 저장소에서 홍보·매뉴얼·릴리스
노트를 같이 만들어도 서로 덮어쓰지 않고, 지난 영상을 다시 뽑을 때 그 폴더만 있으면 된다.

```
tools/video/out/
  <영상 id>/
    final/     <변형>.mp4   완성본 (H.264 High / yuv420p / AAC-LC / +faststart, -14 LUFS)
               <변형>.srt   자막 사이드카 (유튜브 업로드용)
    raw/       take.webm      통짜 원본 — 재합성에 쓰이므로 지우지 않는다
               timeline.json  씬 경계
    audio/     씬별 음성 + manifest.json   (TTS 캐시)
    motion/    모션·B롤 렌더 결과          (캐시)
    work/      ass·무음·마스크 등 중간물   (언제든 지워도 된다)
    frames/    검증용 프레임 캡처
```

**넘길 것은 `final/` 하나뿐이다.** `raw/`는 재촬영 없이 다시 합성하려면 필요하니 지우지 않는다.
용량이 급하면 `work/`부터 지운다 — 다음 실행에서 다시 만든다.

영상 id는 이 순서로 정해진다.

| 순서 | 출처 | 예 |
|---|---|---|
| 1 | `--project <id>` | `--project release-2025-08` → `out/release-2025-08/` |
| 2 | `scenes.json`의 `"id"` | `"id": "onboarding-manual"` |
| 3 | 대본 파일 이름 | `scenes.json` → `default`, `scenes.promo.json` → `promo` |

한글 이름도 그대로 폴더가 된다(`--project "사용 매뉴얼"` → `out/사용-매뉴얼/`). 공백·슬래시는
하이픈으로 바뀐다. 여러 편을 만들 때는 **대본 파일을 나누는 편이 낫다** — `scenes.promo.json`,
`scenes.manual.json`처럼 두면 id가 자동으로 갈리고 `--scenes`로 골라 쓴다.
