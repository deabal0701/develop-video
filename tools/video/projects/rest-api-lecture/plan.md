# REST API 5분 개념 구성표

| | |
|---|---|
| 영상 id | `rest-api-lecture` |
| 용도 | 강의 |
| 대상 | API라는 말은 들어봤지만 REST가 뭔지 모르는 입문 개발자·비개발 직군 |
| 목표 길이 | 300초 (5분) |
| 목소리 | edge / ko-KR-InJoonNeural (남성) · rate +6% — 사용자 선택 |
| **초당 글자수** | **6.3자** (선희 +6% 실측값을 잠정 사용 — InJoon 은 대본 확정 후 `--only tts` 실측으로 보정) |
| **총 글자 예산** | 300 × 6.3 = **약 1,890자** (클립당 +0.5s 여유 11개 ≈ 5.5s 별도) |
| BGM | 없음 — 사용자 선택. 개념 강의라 내레이션 집중 |

컨셉: **"DELETE 한 줄"** (`.claude/debate-logs/rest-api-lecture-concept.md`).
오프닝에서 `DELETE /users/1` 한 줄로 사용자 카드가 부서지고, 그 한 줄의 세 조각
(주소·동사·대답)이 곧 목차가 된다. 엔딩에서 `GET /users/1 → 404`로 회수.

## 구간 배분

| 구간 id | 무엇을 말하나 | 화면 | 글자수 | 소재 길이 | 비고 |
|---|---|---|---|---|---|
| hook | 한 줄로 사람이 지워졌다 — 이 줄이 REST | **도식** `rest-delete.html` | 155 | — | 카드 파괴 → 204. 시각 반전 1.6s 완료, 내레이션은 재해석 |
| ch1 | 주소는 명사다 | `chapter.html` | 20 | — | |
| s1 | URI = 자원(것)의 주소. /users/1 은 1번 사용자라는 '것' | **도식** `rest-uri.html` | 280 | — | 서버 안 자원들에 주소가 하나씩 붙는 그림 |
| ch2 | 동사는 메서드다 | `chapter.html` | 20 | — | |
| s2 | 같은 주소에 대표 동사 4개 — 조회·생성·수정·삭제 | **도식** `rest-methods.html` | 300 | — | 주소 고정, 동사 슬롯만 갈아끼우면 결과가 바뀌는 그림 |
| ch3 | 대답은 숫자다 | `chapter.html` | 22 | — | |
| s3 | 가장 자주 만나는 세 표정 — 2xx·4xx·5xx | **도식** `rest-status.html` | 280 | — | "세 가지뿐" 단정 금지(1xx/3xx 실재) |
| ch4 | 서버는 기억하지 않는다 | `chapter.html` | 24 | — | |
| s4 | 무상태 — 요청 하나가 그 자체로 완결 | **도식** `rest-stateless.html` | 270 | — | 완결된 봉투는 어느 서버로 가도 되는 그림 |
| readback | GET /users/1 → 404. 이제 이 줄이 읽힌다 | **도식** `rest-readback.html` | 170 | — | 오프닝 회수 — 학습 확인 장치 |
| outro | 정리 — REST는 기술이 아니라 약속 | `outro.html` | 180 | — | 길이 숫자("5분") 내레이션 금지 |
| | | | **합계 1,821자** | | 예산 1,890자 안 |

## 도식으로 만들 것 (전부 신규 — projects/rest-api-lecture/ 전용)

| 구간 | 그림이 져야 할 설명 | 쓸 템플릿 |
|---|---|---|
| hook | 요청 한 줄 → 서버의 것(자원)이 실제로 사라짐 | `rest-delete.html` 신규 — 결정적 CSS 스태거만, JS 물리 금지 |
| s1 | 서버 안의 '것'들에 주소가 하나씩 붙어 있다 (명사·계층) | `rest-uri.html` 신규 |
| s2 | 주소는 그대로, 동사만 바꾸면 하는 일이 바뀐다 | `rest-methods.html` 신규 |
| s3 | 숫자 첫 자리가 표정이다 — 초록 2xx / 주황 4xx / 빨강 5xx | `rest-status.html` 신규 |
| s4 | 기억에 묶인 대화 vs 완결된 요청 — 어느 서버로 가도 된다 | `rest-stateless.html` 신규 |
| readback | 같은 형태의 줄이 이번엔 읽힌다 — 주소·동사·대답 주석 | `rest-readback.html` 신규 |

공용 `cloud-*` 도식은 구조가 안 맞아 재사용 없음. 전부 `../../motion/_base.css`·`_params.js`
상대 참조(선례: `hangang-shorts/riversection.html`).

## 확인한 것

- [x] B롤 없음 — 소재 길이 제약 해당 없음
- [x] 쓰려는 공용 템플릿 params 확인: `chapter`=num·title·subtitle(+progress 질의) · `outro`=title·subtitle·cta·url · `stat` 미사용
- [x] 수치 근거: 204(`api-lecture/demo-api/server.js:115`) · 404(`:137`) · 200(`:141`) · 500(`:126`, 검증 agent 확인) — 표준 HTTP 시맨틱스와 일치. `/users/1` 경로 자체는 표준 관례 예시(저장소에 해당 라우트 없음 — 제작 기록에 명기)
- [x] 스톡 소재 없음 — 라이선스 확인 대상 없음
- [x] BGM 없음 — mixkit 루프 이음새 리스크 소멸

## 미확정

- InJoon rate +6% 실측 속도 (1차 TTS 후 보정)
- 워터마크 문구: "REST API 5분 개념" (기본안, 사용자 확정 필요 시 8단계 보고)
