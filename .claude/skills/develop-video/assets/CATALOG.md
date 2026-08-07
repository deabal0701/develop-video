# 소재 목록 (BGM · 인물 클립)

**파일 자체는 저장소에 넣지 않는다.** 무료 스톡은 "프로젝트에 사용"은 허용해도 소재 파일의
재배포는 대부분 금지한다. 커밋되는 것은 이 목록과 `fetch.js`뿐이고, 파일은 각자 받는다.

```bash
node assets/fetch.js bgm  <url> [파일명]
node assets/fetch.js clip <url> [파일명]
node assets/fetch.js list
```

허용 호스트가 아니면 받지 않는다. 유튜브 등에서 내려받은 소재는 이용약관 위반이자
저작권·초상권 문제가 되므로 쓰지 않는다.

## 어디서 받나

| 출처 | 상업적 사용 | 출처 표시 | 비고 |
|---|---|---|---|
| [Mixkit](https://mixkit.co/) | 허용 | 불필요 | 영상·음악·효과음. **CD·DVD·게임·TV/라디오 방송에는 사용 불가** |
| [Pexels](https://www.pexels.com/ko-kr/videos/) | 허용 | 불필요 | 영상·사진. 인물 소재가 많다 |
| [Pixabay](https://pixabay.com/ko/videos/) | 허용 | 불필요 | 영상·음악·사진 |
| [YouTube 오디오 보관함](https://studio.youtube.com/) | 유튜브 내 사용 | 곡마다 다름 | 유튜브에 올릴 때 가장 안전 |

각 소재의 라이선스는 **받는 시점에 해당 페이지에서 직접 확인한다.** 위 표는 요약이고 약관은 바뀐다.

## 받아 둔 BGM

받을 때마다 아래 표에 한 줄 추가한다. 출처 URL을 반드시 남긴다.

| 파일 | 길이 | 출처 | 라이선스 | 용도 메모 |
|---|---|---|---|---|
| `bgm/mixkit-623.mp3` | 4:49 | https://assets.mixkit.co/music/623/623.mp3 ([corporate 태그](https://mixkit.co/free-stock-music/tag/corporate/)) | Mixkit Free License | 후보 — 들어 보고 정할 것 |
| `bgm/mixkit-132.mp3` | 2:07 | https://assets.mixkit.co/music/132/132.mp3 (동일) | Mixkit Free License | 후보 |
| `bgm/mixkit-471.mp3` | 1:39 | https://assets.mixkit.co/music/471/471.mp3 (동일) | Mixkit Free License | 후보 |

곡은 **직접 들어 보고 고른다.** 30초 광고에는 1~2분짜리로 충분하고(루프가 걸린다), 매뉴얼에는
아예 넣지 않거나 아주 낮게 까는 편이 낫다.

## 받아 둔 인물 클립

| 파일 | 길이 | 출처 | 라이선스 | 프레이밍 메모 |
|---|---|---|---|---|
| (없음) | | | | |

## 받아 둔 사진 (photo.html 배경)

**얼굴이 식별되는 인물 사진을 특정 서사의 당사자("스무 살의 나")로 쓰지 않는다.**
뒷모습·손·풍경·사물·실루엣이면 이 문제가 없고 생애사 톤에도 더 맞는다.

| 파일 | 출처 | 라이선스 | 내용 메모 |
|---|---|---|---|
| `photo/alley-child.jpg` | https://www.pexels.com/photo/1006121/ | Pexels License | 나무 사이 길 — 여정·유년 은유. 얼굴 없음 |
| `photo/lone-fisherman.jpg` | https://www.pexels.com/photo/6710950/ | Pexels License | 망망대해 홀로 뜬 작은 배. 얼굴 없음(원경) |
| `photo/sunset-sail.jpg` | https://www.pexels.com/photo/1481262/ | Pexels License | 석양 바다 위 배·사공 실루엣 |
| `photo/sunset-fishermen.jpg` | https://www.pexels.com/photo/12362554/ | Pexels License | 석양에 낚싯대 든 어부 실루엣 |
| `photo/sunset-boat.jpg` | https://www.pexels.com/photo/1118874/ | Pexels License | 폭풍·번개 하늘 아래 돛단배 |
| `photo/shark-1.jpg` | https://www.pexels.com/photo/4666748/ | Pexels License | 파도 아래 상어 |
| `photo/shark-2.jpg` | https://www.pexels.com/photo/5967796/ | Pexels License | 깊은 물속 고래상어 |
| `photo/big-fish.jpg` | https://www.pexels.com/photo/4810629/ | Pexels License | 푸른 물속 톱상어 실루엣 — "거대한 물고기" 연출용 |
| `photo/lion-rest.jpg` | https://www.pexels.com/photo/4179460/ | Pexels License | 볕 아래 쉬는 사자 |
| `photo/old-rope.jpg` | https://www.pexels.com/photo/27644254/ | Pexels License | 낡은 로프 클로즈업 |
| `photo/boat-person.jpg` | https://www.pexels.com/photo/2080960/ | Pexels License | 새벽 분홍 바다의 작은 배 실루엣 |

## 받아 둔 B롤 영상 (클립 `video`)

| 파일 | 길이 | 출처 | 라이선스 | 내용 메모 |
|---|---|---|---|---|
| `broll/road-drone.mp4` | 33초 · 1280×720 | https://www.pexels.com/video/3571264/ | Pexels License | 해변 파도 드론 샷 — 반복·회복 은유. 얼굴 없음 |
| `broll/shark-swim.mp4` | 4.9초 · 1920×1080 | https://www.pexels.com/video/7997336/ | Pexels License | 물속 상어 유영 |

인물 클립은 `zoom`·`focusX`·`focusY` 값을 함께 적어 두면 다음에 그대로 쓸 수 있다.
얼굴은 보통 화면 위쪽에 있어서 기본값(가운데)으로 자르면 원 안이 책상·가슴으로 찬다.

## 쓰는 법

`scenes.json`에서 경로로 가리킨다. `render.bgm`은 **영상 작업 폴더 기준 상대 경로**다.

```json
"render": {
  "bgm": "../../.claude/skills/develop-video/assets/bgm/mixkit-132.mp3",
  "bgmGain": 0.18,
  "bgmDucking": true
}
```

`bgmDucking`은 내레이션이 나올 때 배경음을 자동으로 눌러 준다(사이드체인). 일정 볼륨으로 깔면
말과 배경음이 같은 대역에서 싸워 대사가 묻힌다. 기본값은 켬이다.

프로젝트 안에 두고 쓰려면 `tools/video/assets/`로 복사하고 그쪽 경로를 적는다.
그 경우에도 **`.gitignore`에 넣는 것을 잊지 말 것.**
