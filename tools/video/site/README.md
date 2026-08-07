# 유튜브 화면 재현 UI (촬영용 목업)

`scenes.youtube-guide.json` 이 Playwright 로 조작·녹화하는 정적 화면이다.

## 왜 실제 유튜브를 안 찍었나

유튜브 화면을 그대로 녹화해 영상으로 배포하는 것은 서비스 약관과 저작권(재생되는 영상·썸네일·
채널 콘텐츠) 문제가 된다. 그래서 **같은 구조의 화면을 직접 그려** 그 위에서 촬영한다.
설명하려는 것은 "어느 자리에 무엇이 있고 무엇을 누르는가"이므로 재현 화면으로 충분하다.
화면 상단에 `화면 재현 예시` 꼬리표를 상시 노출해 실제 화면이 아님을 밝힌다.

## 띄우는 법

```bash
cd tools/video/site && python3 -m http.server 5199
```

`scenes.youtube-guide.json` 의 `baseUrl` 이 `http://localhost:5199` 다. 포트를 바꾸면
`--base-url` 로 넘긴다.

## 페이지와 주요 셀렉터

| 페이지 | 무엇 | 셀렉터 |
|---|---|---|
| `index.html` | 홈 (추천 목록) | `#header` `#sidebar` `#main` `#chips` `#chip-cook` `#chip-all` |
| | 왼쪽 메뉴 | `#nav-home` `#nav-shorts` `#nav-subs` `#nav-you` `#nav-history` `#nav-later` |
| `results.html` | 검색 결과 | `#btn-filter` `#filter-panel` `#f-short` `#f-new` `a.row-card` |
| `watch.html` | 재생 화면 | `#player` `#controls` `#pc-play` `#progress` `#pc-cc` `#pc-settings` `#pc-full` |
| | 설정 메뉴 | `#set-speed` `#sp-125` `#set-quality` `#q-480` |
| | 구독·알림 | `#btn-subscribe` `#btn-bell` `#bell-menu` `#bell-all` `#bell-none` |
| | 좋아요·저장 | `#btn-like` `#btn-save` `#save-later` `#save-new` `#save-close` |
| `subscriptions.html` | 구독 피드 | `#sub-channels` `#sub-grid` |
| `library.html` | 나 (기록·저장·재생목록) | `#head-history` `#head-later` `#playlist-grid` |
| 공통 | 계정 메뉴 | `#avatar` `#account-menu` `#acc-history` `#acc-restricted` `#acc-lang` |

헤더·사이드바·계정 메뉴는 `app.js` 의 `renderShell()` 이 그린다 — 페이지마다 복사하지 않는다.

## 손볼 때 주의

- **`html, body` 를 1920×1080 으로 고정하고 스크롤은 `#main` 안에서만** 일어나게 해 두었다.
  body 를 스크롤시키면 헤더·사이드바가 같이 밀려 올라간다.
- 썸네일은 이미지 파일 없이 **그라디언트 + 이모지**로 만든다(`thumb()` in `app.js`).
  외부 이미지를 쓰면 저작권 확인이 다시 필요해진다.
- 이모지로 흐리게 나오는 아이콘(마이크·볼륨)만 인라인 SVG(`ICON_MIC`·`ICON_VOL`)로 그렸다.
- 화면에 얹는 팝업끼리 겹치지 않게 한다 — 저장 팝업을 열 때 설정 메뉴를 먼저 닫는다.
