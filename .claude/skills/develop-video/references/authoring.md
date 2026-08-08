# 대본·설정 작성 안내

`scenes.json` 하나가 영상 전체를 정의한다. 이 문서는 그 문법과, 만들면서 실제로 걸렸던 함정을 담는다.

## 파이프라인이 도는 순서

```
scenes.json → ① 음성(TTS) → ② 화면 녹화(Playwright) → ③ 합성(ffmpeg)
```

**오디오가 기준이다.** 먼저 음성을 만들어 실제 길이를 재고, 그 길이에 맞춰 화면을 촬영한다.
반대로 하면 씬마다 싱크를 손으로 맞춰야 한다.

**통짜로 찍고 나중에 자른다.** 씬마다 브라우저 컨텍스트를 새로 만들면 로그인·위저드 진행 상태가
날아간다. 한 번에 찍고 씬 경계 시각만 `out/<영상 id>/raw/timeline.json`에 남겨 두면, 합성 단계에서
씬을 골라 길이가 다른 버전을 재촬영 없이 뽑을 수 있다.

씬 길이 = `max(내레이션 길이 + hold, 실제 조작에 걸린 시간)`. 조작이 더 길면 영상을 자르는 대신
음성 뒤에 무음을 덧대므로 화면이 문장 도중에 끊기지 않는다.

**결과는 영상 한 편당 폴더 하나**(`out/<영상 id>/`)로 떨어진다 — `final/`(납품물) · `raw/`(통짜
원본·씬 경계) · `audio/`·`motion/`(캐시) · `work/`(중간물) · `frames/`(검증 캡처). id는
`--project` > `scenes.json`의 `"id"` > 대본 파일 이름 순으로 정해진다.

`scenes.json` 최상위에 쓸 수 있는 키 하나가 더 있다 — `"id"`. 대본 파일이 하나뿐이어도 이걸 적어
두면 출력 폴더 이름이 파일 이름에 끌려다니지 않는다.

## voice 블록

```json
"voice": { "provider": "edge", "lang": "ko", "gender": "female", "rate": "+8%" }
```

| 키 | 값 | 비고 |
|---|---|---|
| `provider` | `edge`(기본) · `azure` · `eleven` · `sapi` · `file` | 키가 죽으면 azure·eleven은 edge로 자동 전환 |
| `gender` · `lang` | `female`\|`male` · `ko`\|`en`\|`ja`\|`zh` | 제공자별 목소리 표에서 고른다 |
| `voice` | 목소리 이름/ID를 직접 지정 | edge·azure는 `ko-KR-SunHiNeural`, eleven은 `voice_id` |
| `rate` · `pitch` · `volume` | `"+8%"` · `"+0Hz"` | eleven은 pitch가 없고 rate만 speed 배율로 옮겨진다 |
| `strict` | `true`면 폴백 없이 실패 | 납품본 목소리를 고정해야 할 때 |
| `model` · `stability` · `similarity` | eleven 전용 | 기본 `eleven_multilingual_v2` · 0.5 · 0.75 |
| `fallback` | `file` 제공자에서 녹음이 없는 씬을 채울 제공자 | 보통 `"edge"` |

## 액션 문법

| 액션 | 예 | 비고 |
|---|---|---|
| `goto` | `{ "goto": "/new" }` | `baseUrl` 기준 상대 경로 |
| `click` | `{ "click": "button:has-text('저장')" }` | 가짜 커서가 이동 후 클릭 |
| `type` | `{ "type": "#topic", "text": "...", "delay": 55 }` | delay는 타자 간격(ms) |
| `waitFor` | `{ "waitFor": "text=완료", "timeout": 20 }` | 초 단위 |
| `hover` / `press` | `{ "hover": "#card" }` / `{ "press": "Enter" }` | |
| `scroll` | `{ "scroll": 520, "duration": 1.6 }` | 부드럽게 |
| `highlight` | `{ "highlight": "#topic", "duration": 1.6 }` | 주변을 어둡게 깔고 테두리 강조 — **매뉴얼의 핵심** |
| `wait` | `{ "wait": 0.6 }` | |

`"optional": true`를 붙이면 실패해도 촬영이 멈추지 않는다(기본 3초 만에 포기). 백엔드·외부 API가
붙지 않은 환경에서 찍을 때 쓴다. **붙이지 않으면 셀렉터 하나가 30초를 먹고 영상을 망친다.**

셀렉터는 Playwright 문법 그대로다 — `#id`, `text=...`, `button:has-text('...')`.

## 화면에 얹는 글자 5종

전부 하나의 ASS 파일에 스타일만 달리해 들어가고, 굽기는 geometry 뒤에 한 번에 처리한다.

| | 위치 | 설정 | 끌 수 있나 |
|---|---|---|---|
| 자막(CC) | 하단 중앙 | 씬·모션 구간의 `narration`에서 자동 | **아니오 — 항상 나온다** |
| 상단 헤드라인 | 상단 중앙 | 씬의 `caption` | `"captions": false` |
| 강조 뱃지 | 헤드라인 바로 아래 | 씬의 `badge: { text, at, duration }` | 안 쓰면 그만 |
| 워터마크 | **오른쪽 위** | `render.watermark.text` | **아니오 — 처음부터 끝까지** |
| 엔드카드 | 마지막 화면 | `render.endCard` (모션 아웃트로를 쓰면 불필요) | `"endCard": false` |

### 자막과 워터마크는 끄지 않는다

**자막은 말이 있는 모든 구간에 항상 굽는다.** 씬이든 모션 구간이든, 변형이 무엇이든 예외가 없다
(`variant.subtitles`·클립 `subtitle` 같은 끄는 스위치는 없앴다). 소리를 켜지 않고 보는 시청자가
다수이고, 자막이 있다 없다 하면 그 구간만 정보가 사라진다. `.srt` 사이드카는 같은 내용으로 함께 나간다.

내레이션이 길어 한 화면(3줄)에 안 들어가면 **잘라 버리지 않고 여러 장으로 나눠** 말한 시간을
글자 수에 비례해 배분한다. 그래도 화면을 덜 가리고 싶으면 문장을 줄이거나 `subtitleScale`을 줄인다.

**워터마크는 첫 프레임부터 마지막 프레임까지, 기본 오른쪽 위.** 인트로·모션 구간·엔드카드에도
그대로 남는다 — 어디를 잘라 공유해도 누가 만든 영상인지 남아 있어야 한다. 그래서
`render.watermark.text`는 **비워 두지 않는다**(비면 합성 때 경고가 뜬다).

반투명 판을 깔지 않고 **글자 테두리+그림자로만** 그린다. 판을 깔면 밝은 앱 화면 위에서 회색
판때기가 그대로 드러난다. 어두운 배경에서는 글자만 떠 있는 것처럼 보인다.

| 키 | 기본값 | 쓰임 |
|---|---|---|
| `watermarkAlign` | `9`(오른쪽 위) | ASS 정렬 번호 — `7` 왼쪽 위 · `1` 왼쪽 아래 · `3` 오른쪽 아래 |
| `watermarkMargin` | `0.03` | 위(아래) 여백 비율. **세로 변형은 `0.075`** — 유튜브 UI가 상단 약 90px을 덮는다 |
| `watermarkMarginH` | `0.035` | 좌우 여백 비율 |
| `watermarkScale` | `0.028` | 짧은 변 대비 글자 크기 |
| `watermarkColour` | `#FFFFFF` | 글자색 |
| `watermarkEdge` | `background` | 글자 테두리색(판 아님) |

**16:9에서는 caption을 끄는 편이 낫다** (`"captions": false`). 자막과 내용이 겹치는 데다,
화면 위쪽에는 보통 앱 헤더·탭이 있어서 정작 보여주려던 UI를 가린다. 세로(9:16)는 위쪽에
여백 띠가 따로 생기므로 caption이 제 자리를 찾는다. **caption을 끄는 것이지 자막을 끄는 것이 아니다.**

## 모션그래픽 구간

HTML/CSS 애니메이션을 **프레임 단위로** 굽어 중간에 끼운다. 찍을 실물이 없는 구간을 만드는 자리다.

```json
{ "id": "ch1", "file": "chapter.html", "duration": 2.0, "before": "s2",
  "params": { "num": "2", "title": "주제 입력", "progress": "66" } }
```

- `before`는 그 씬 **앞에** 끼운다. `"end"`면 마지막 씬 뒤.
- `params`는 질의 문자열로 넘어가고 템플릿이 `location.search`에서 읽는다 — 같은 템플릿을
  문구만 바꿔 여러 번 쓴다.
- `narration`을 주면 TTS로 읽고 그 길이만큼 구간이 늘어난다.
- `voice`를 주면 **그 구간만 다른 목소리로** 읽는다(아래).
- `"variants": ["..."]`로 특정 변형에만 넣을 수 있다.

기본 템플릿: `intro`(브랜드 도입) · `chapter`(단계 카드, 매뉴얼용) · `stat`(수치 강조) ·
`outro`(마무리·CTA) · `photo`(사진 배경 + 켄번즈 줌 + 문구) · `voicecard`(목소리 견본 카드).

### 구간마다 목소리 바꾸기 — 클립의 `voice`

기본적으로 영상 전체가 최상위 `voice` 하나로 읽힌다. 클립에 `voice`를 주면 그 구간만 달라진다 —
목소리 견본 카탈로그, 두 사람이 주고받는 구성에 쓴다.

```json
{ "id": "v02", "file": "voicecard.html", "voice": "ko-KR-JiMinNeural", "narration": "..." }
{ "id": "q1",  "file": "chapter.html",   "voice": { "gender": "male", "rate": "+8%" }, "narration": "..." }
```

문자열이면 목소리 id, 객체면 최상위 `voice` 위에 덮어쓸 값이다(일부만 바꿔도 된다). 캐시 해시가
목소리 설정을 포함하므로 목소리만 고쳐도 그 구간만 다시 만든다. 씬(`scenes`)에는 아직 없다 —
화면 녹화 구간은 영상 전체가 한 목소리다.

**목소리 견본 카드 — voicecard.html.** `params`: `name`(이름) · `voiceid`(대본에 옮겨 적을 id,
고정폭으로 크게) · `gender`·`index`(꼬리표) · `note`(설명, 없으면 지워짐) · `bars`(파형 막대 수).
`brand`·`brandSoft`로 카드 색을 바꿔 성별·언어를 색으로 구분한다. **가로 전용이다** — id가 길어
공통 여백(26%)을 8%로 넓혀 놓았으므로 세로 변형에서는 양끝이 잘린다.

쓸 수 있는 목소리 목록은 지어내지 말고 Azure에 직접 묻는다(리전마다 다르다).

```bash
curl -H "Ocp-Apim-Subscription-Key: $AZURE_SPEECH_KEY" \
  "https://$AZURE_SPEECH_REGION.tts.speech.microsoft.com/cognitiveservices/voices/list"
```

응답의 `ShortName`(=목소리 id) · `LocalName`(현지 이름) · `Gender` · `WordsPerMinute`(기본 속도) ·
`SecondaryLocaleList`(다국어 지원 여부)가 그대로 카드 문구가 된다.

**화면 녹화 없이 모션만으로도 만들 수 있다.** `scenes`를 빈 배열로 두고 모션 클립만 나열하면
녹화 단계를 건너뛴다(앱을 띄울 필요도 없다). 일러스트 홍보영상·생애사·행사 영상 형식이 이쪽이다.

단, **`baseUrl`은 그래도 적어 둔다.** 녹화를 건너뛰더라도 `build.js`가 시작하자마자 값을 읽어서,
없으면 `Cannot read properties of undefined (reading 'replace')`로 죽는다. 쓰이지 않는 값이므로
`"http://localhost:9999"`처럼 아무 주소나 넣으면 된다.

**클립의 `src`는 템플릿 html 파일(`tools/video/motion/`) 기준 상대 경로다.** 대본 파일이나
저장소 루트 기준이 아니다. 스킬 `assets/`를 가리키려면 세 단계를 올라가야 한다
(`../../../.claude/skills/develop-video/assets/photo/<파일>.jpg`). 경로가 틀려도 **합성은 그대로
성공하고** 그 구간만 검은 화면으로 나오므로, 프레임을 뽑아 보기 전에는 모른다.
반면 `render.bgm`과 클립의 `video`는 **영상 작업 폴더(`tools/video/`) 기준**이라 두 단계다 —
같은 대본 안에서 기준이 다르니 헷갈리지 않게 한다.

### 사진 구간 — photo.html

내려받은 사진(또는 개인 사진)을 배경으로 깔고 문구를 얹는다. 느린 줌이 걸려 정지 화면으로
보이지 않는다. `src`는 **템플릿 html 파일 기준** 상대 경로다.

```json
{ "id": "p1", "file": "photo.html", "before": "end", "duration": 3.0,
  "narration": "골목이 세상의 전부였던 아이가 있었습니다.",
  "params": { "src": "../../assets/photo/<파일>.jpg",
              "kicker": "1991 · 작은 동네", "title": "골목의 아이" } }
```

`params`: `src`(필수) · `title`·`subtitle`·`kicker`(선택 — 없으면 사진만) ·
`zoomFrom`/`zoomTo`(기본 1.06→1.14) · `panX`(옆으로 흐름, -3~3) · `shade`(하단 그림자 0~1, 기본 0.55).
문구는 하단에 앉고 가운데 절반 안에 있어 세로 크롭에서도 살아남는다.

### 스톡 영상(B롤) 구간 — `video`

내려받은 영상 클립을 그 구간 길이만큼 잘라 전체화면으로 쓴다. `file` 대신 `video`를 주면 된다
(HTML 템플릿이 아니라 ffmpeg이 처리한다). 경로는 **영상 작업 폴더 기준** 상대 — `bgm`과 같은 기준이다.

```json
{ "id": "b1", "video": "../../assets/broll/<파일>.mp4", "videoStart": 4,
  "before": "end", "duration": 3.0,
  "narration": "수없이 넘어졌지만, 그때마다 다시 일어섰습니다." }
```

- `videoStart`는 소스에서 잘라 올 시작 시각(초). 소스의 가장 좋은 구간을 고른다.
- 소스 소리는 버린다(내레이션·BGM 트랙이 따로 있다). 소스가 구간보다 짧으면 마지막 프레임을 물려 채운다.
- 화면을 `force_original_aspect_ratio=increase` + crop으로 꽉 채우므로 소스 해상도가 낮아도 동작은
  하지만, 결과 해상도(1920×1080)보다 작으면 업스케일된다 — HD 이상 소스를 받는다.
- **HTML에 `<video>`를 넣는 방법은 안 된다.** 프레임 굽기가 `document.getAnimations()`만 밀기
  때문에 영상이 첫 프레임에서 얼어붙는다. 영상은 반드시 `video`로 넣는다.

**사진·영상 소재는 `assets/fetch.js photo|broll <url>`로 받는다** (허용 호스트만, `CATALOG.md`에 기록).
**얼굴이 식별되는 스톡 인물을 특정 서사의 당사자("스무 살의 나")로 쓰지 않는다** — 라이선스가
허용하는 사용과 별개로 보는 사람을 오해시킨다. 뒷모습·손·풍경·사물·실루엣을 쓴다.

**모션 클립을 연달아 붙일 때는 `wipe`를 끈다.** 각 템플릿은 밝은 면이 덮으며 끝나도록 되어 있어
(밝은 앱 화면으로 이어지기 위한 것) 다음 클립이 어두우면 흰 점멸이 생긴다. 뒤에 화면 녹화가
오는 클립에서만 켜고, 모션끼리 이어질 때는 `"wipe": "off"`를 준다.

## 반드시 지켜야 할 것 — 실제로 걸렸던 함정

**모션 html에서 `animation:` 단축 속성을 쓰지 마라.** 단축 속성은 명시하지 않은 하위 속성을
초기값으로 되돌린다. 공통 규칙의 `animation-fill-mode: both`가 `none`으로 리셋되어, 지연
구간에서 요소가 처음부터 다 보인다. `animation-name`·`animation-duration`·`animation-delay`를
따로 쓰거나, 두 속성을 단축 속성 **뒤에** 둔다.

**모션은 녹화가 아니라 프레임 캡처다.** 헤드리스 녹화는 프레임이 불규칙하게 빠져 타임라인이
실시간과 어긋난다. 2~3초짜리 구간에서는 그 오차가 그대로 "애니메이션이 잘렸다"로 나타난다.
`currentTime`을 직접 밀며 찍으면 같은 입력에 항상 같은 결과가 나온다.

**모션 내용은 화면 가운데 절반 안에 둔다.** 모션 구간도 녹화본과 같은 해상도로 만들어 뒤에서
함께 crop을 통과한다. 세로 변형에서 가장자리가 잘린다.

**세로 영상은 유튜브 UI가 화면을 덮는다.** 하단 약 330px(제목·채널명), 우측 약 160px(버튼),
상단 약 90px. `padY`로 화면을 위로 올려 자막 자리를 비우고, 워터마크는 `watermarkMargin: 0.075`로
상단 UI 아래에 앉힌다. 가운데 정렬로 두면 자막이 제목에 가려진다.

**Playwright 녹화에는 마우스 커서가 찍히지 않는다.** 가짜 커서를 오버레이로 그린다(구현되어 있음).
실제 커서는 CSS로 숨긴다.

**자막 글꼴은 시스템에 설치된 것만 쓸 수 있다.** 웹폰트(woff2)는 안 된다. 프로젝트 글꼴로
통일하려면 TTF/OTF를 시스템에 설치하고 `render.subtitleFont`에 이름을 적는다.

## 검증 방법

만들기 전에 소리부터 확인한다 — `node tools/video/check-tts.js`. `.env`·ffmpeg·제공자별 실제
합성을 한 번에 점검하고, 어느 제공자로 소리가 나올지(azure가 죽었으면 edge로 내려가는지)를 알려 준다.

싱크가 맞는지는 음성 시작 시각으로 확인한다.

```bash
ffmpeg -hide_banner -nostats -i out/<영상 id>/final/<변형>.mp4 \
  -af "silencedetect=n=-38dB:d=0.4" -f null - 2>&1 | grep -o "silence_end: [0-9.]*"
```

각 구간 시작과 대조해 **오차가 일정하면 정상**이다(TTS 앞머리 무음, 보통 +0.2초 안팎).
오차가 점점 커지면 드리프트이므로 `render.syncOffset`으로 보정한다.
