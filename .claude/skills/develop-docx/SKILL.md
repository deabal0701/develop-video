---
name: develop-docx
description: insa-IT 공식 산출물(설계서·개발 가이드·명세서)을 h5-saas-docs/07-deliverables/ 표준 서식의 .docx 배포본으로 만든다. 표지 + 변경 이력 + 자동 목차 + 맑은 고딕 9pt + 검정 단색(회색조 음영만) + 회색 코드 박스 + 헤더 음영 표 + 그림 캡션 + 회사 로고를 갖춘 제출·검수용 문서를 docx-js 파이프라인(engine.js → build.js → apply-style.py → build.ps1)으로 재현 가능하게 생성하고, 내용 수정은 Word 가 아니라 build.js 에서 한다. 사용자가 "산출물 만들어", "설계서/개발 가이드 docx 로", "워드 문서로 뽑아", "제출본 만들어", "docx 생성/재생성", "문서에 장 추가하고 다시 뽑아", "변경이력 추가", "develop-docx" 등 07-deliverables 산출물 문서를 만들거나 고치는 작업을 말하면, 명시적으로 스킬을 지목하지 않아도 반드시 사용한다. 임의 형식의 일반 Word 파일 생성·기존 외부 docx 읽기/편집(추적변경·주석)은 docx 스킬, h5-saas-docs 일반 md 배치는 develop-place-doc, PPTX 는 pptx 스킬 소관이며 이 스킬을 쓰지 않는다.
---

# develop-docx : insa-IT 산출물 docx 생성

`h5-saas-docs/07-deliverables/` 의 공식 산출물(제출·검수 대상)을 매번 동일한 서식으로 만든다.
현행 산출물 2묶음(`backend-base-design`, `develop-guide`)이 이 규격으로 생성돼 있으며, 신규 산출물은 서식을 새로 정하지 않고 본 스킬의 템플릿을 복사해 시작한다.

원칙 3가지.
1. 서식은 `styles.xml`(v0.6 동결본) 하나로 통일한다.
2. 내용의 단일 출처는 `build.js` 다. Word 수동 편집은 재생성 때 소실된다.
3. 색은 검정과 회색조만 쓰고, 사람이 쓴 업무 문서처럼 읽히게 한다(아래 3절 문자 규칙).

## 0. 먼저 읽을 것

| 목적 | 경로 |
|---|---|
| 서식 수치 정본(폰트·크기·색·표·코드·표지·목차) | [references/format-spec.md](references/format-spec.md) |
| 산출물 작성 원칙(코드가 기준, 레거시 미언급, 현황/계획 분리) | `h5-saas-docs/07-deliverables/README.md` |
| docx-js API 상세(하이퍼링크·각주 등 추가 요소) | `.claude/skills/docx/SKILL.md` |
| 살아있는 선례 | `07-deliverables/develop-guide/_build-fe/build.js` |

## 1. 파이프라인

```
build.js        →  out/gen_*.docx       docx-js 로 본문 생성 (engine.js 헬퍼 사용)
apply-style.py  →  out/styled_*.docx    styles.xml(v0.6) 주입 + 헤딩 ID 1~6 치환
check-text.py                           본문 금지 문자 점검
build.ps1       →  ../{최종파일}.docx   Word COM 으로 목차·필드 갱신 후 저장
                →  ../{최종파일}.md     pandoc 마크다운 미러 자동 갱신
```

한 번에 실행: `powershell -ExecutionPolicy Bypass -File _build/build.ps1`
옵션: `-NoWord`(Word 없는 환경, 목차·쪽번호 필드가 비어 있으므로 배포 금지) · `-Pdf`(PDF 동반 산출)

## 2. 절차

### 단계 0. 산출물 식별
어느 묶음의 어떤 주제인지, 신규 생성인지 기존 개정인지 확정한다.
- 기존 개정이면 해당 `_build/build.js` 를 고치고 재생성한다. `META.version` 을 올리고 변경 이력에 행을 추가한다.
- 신규면 단계 1 로 간다.

### 단계 1. 작업 폴더 준비 (신규만)
`h5-saas-docs/07-deliverables/{묶음}/_build/` 에 다음을 복사한다.
- `assets/_build-template/` 전체: `engine.js` `build.js` `apply-style.py` `check-text.py` `build.ps1` `package.json` `.gitignore`
- `assets/styles.xml`
- `assets/media/white-logo.png`(회사 로고)를 `_build/media/` 로 복사

`npm install`(docx)은 최초 1회.

### 단계 2. META 작성
`build.js` 상단 `META` 를 채운다. 표지·머리글·문서 속성·변경 이력·로고가 전부 이 한 곳에서 나온다.

```js
E.setOptions({ chapterPageBreak: true, pageNumberTotal: true });

const META = {
  title: 'insa-IT(인사잇) 개발 가이드',   // 산출물군 (표지 1행)
  topic: '프론트엔드',                     // 주제 (표지 2행)
  version: '0.1', dept: 'R&D 개발팀', org: '화이트 정보통신 R&D 개발팀',
  date: '2026-07-27',
  classification: '',        // '대외비' 등 배포 구분. 빈 값이면 표기 안 함
  runningHeader: false,      // 머리글 표시 여부
  listOfCaptions: false,     // 목차 뒤 그림 목차 (스크린샷이 많은 문서만 true)
  logo: { file: path.join(__dirname, 'media', 'white-logo.png'), on: 'both' },
  revisions: [{ ver: '0.1', date: '2026-07-27', desc: '최초 작성' }],
};
```

규칙.
- `META.version` 은 변경 이력 마지막 행의 버전과 항상 같아야 한다.
- 버전 정책: `0.x` 는 초안, `1.0` 은 검수 확정본, 이후 내용 변경은 `1.1`, 서식·구조 개편은 `2.0`.
- 최종 파일명은 `emit()` 인자로 정한다. 형식은 `insa-IT(인사잇)-{산출물군} - {주제}.docx`.
- 로고 파일이 없으면 로고 없이 생성된다(빌드는 성공). 배포본에는 반드시 넣는다.

### 단계 3. 본문 작성
`body` 배열에 헬퍼 반환값을 순서대로 push 한다. 내용의 근거는 언제나 살아있는 코드와 DB 다(추측 금지).

| 헬퍼 | 용도 |
|---|---|
| `h1/h2/h3(t)` | 장·절·항. 목차 수록 범위는 1~3. `h1()` 은 새 페이지에서 시작하고 그림 번호를 리셋 |
| `p(t \| runs[])` | 본문 문단. 부분 굵게는 `p([run('제목: ',{bold:true}), run('본문')])` |
| `bullet(t, level)` | 불릿(0 은 `•`, 1 은 `-`). 글머리 문자를 직접 입력하지 않는다 |
| `olist([...])` | `1)` 번호 목록. 호출마다 번호가 독립 |
| `note(t)` | 이탤릭 주석 한 줄 |
| `table(widths, rows)` + `cell(t,{w,head,sub,bold,align,colSpan})` | 표. widths 합이 본문 폭 9740, 헤더 행은 `head:true`, 구분 열은 `sub:true`. **표에는 캡션을 붙이지 않는다** |
| `figureWithLegend(file, caption, rows, {width,height})` | 스크린샷 한 묶음: 이미지 + `그림 {장}-{순번}. 제목` + 번호 설명표(#/영역/설명). `body.push(...)` 로 펼쳐 넣는다 |
| `image(file,{width,height,alt})` / `figureCaption(t)` | 그림을 따로 배치할 때 |
| `code(\`...\`)` | 회색 코드 박스(Consolas). 명령·설정·소스 예시 |
| `notice(title, [lines])` | 강조 상자. 문서의 유일한 강조 수단이다. 제목 굵게 + 본문 문단. 제목에 아이콘을 넣지 않는다 |
| `sp()` / `pageBreak()` | 빈 줄 / 페이지 나눔 |

문서 구성 순서: 표지 → 변경 이력 → 목차 → (그림 목차) → 본문 장 → 부록.
표는 캡션 없이 바로 놓고, 필요한 설명은 표 앞 문단에 쓴다. 캡션과 번호는 그림에만 붙인다.
부록은 필요할 때 `부록 A. 용어 및 약어`, `부록 B. 참고 문서` 를 둔다.

### 단계 4. 생성과 검증
1. `build.ps1` 실행으로 최종 docx 저장.
2. 육안 검증(필수): 표지·변경이력·목차 채워짐·표 헤더 음영·코드 박스·그림 캡션·쪽번호·로고.
3. 파일 검증: `python .claude/skills/docx/scripts/office/validate.py "{최종파일}.docx"`.

### 단계 5. 인덱스 갱신
- md 미러는 `build.ps1` 이 갱신한다(pandoc 필요).
- `{묶음}/README.md` 산출물 표(버전·상태·일자)와 `07-deliverables/README.md` 구성 표를 갱신한다.

## 3. 문자 · 강조 규칙 (사람이 쓴 문서로 읽히게)

산출물 본문에 쓰지 않는다.
- 아이콘 기호 전반: `★` `☆` `✅` `✔` `⛔` `💡` `📌` 등. 문서에 아이콘을 넣지 않는다
- `—`(em dash), `–`(en dash). 대신 쉼표·괄호·마침표로 문장을 끊는다
- `─` `━` `═` `│` 박스드로잉 선

써도 된다: 가운뎃점 `·`, 화살표 `→`, 원문자 `①②③`(그림 안 번호와 대응할 때).

강조는 `notice()` 한 가지만 쓴다. 팁 상자, 핵심 상자처럼 종류를 늘리지 않는다.
상자 제목은 아이콘 없이 문장으로 쓴다(예: `화면은 서버 통신을 직접 하지 않는다`).
한 문장으로 끝나는 내용은 상자로 만들지 말고 본문 문단으로 쓴다.

`check-text.py` 가 생성물 본문을 검사해 위반을 보고한다(`build.ps1` 3-1 단계에서 자동 실행).

## 4. 내용 규칙 (07-deliverables 상속)

1. 살아있는 코드가 유일한 기준이다. 클래스·경로·엔드포인트·컬럼은 실제 소스를 읽어 적는다.
2. 레거시(AS-IS)를 언급하지 않는다. 독자는 레거시를 모른다는 전제로 쓴다.
3. 구현 현황과 향후 계획을 절·표로 분리한다. 미구현은 미구현이라 적는다.
4. 작성 부서는 R&D 개발팀으로 고정한다.
5. 문체는 개조식 업무체로 쓴다. 구어체를 쓰지 않는다.
6. **절 제목과 본문은 중급 이상 실무자가 쓰는 전문 용어로 쓴다.** 설명형·서술형 제목을 쓰지 않는다.

| 쓰지 않는 표현 | 쓰는 표현 |
|---|---|
| 전체 지도 | 전체 디렉토리 구조 |
| 폴더별 책임 | 디렉토리별 역할 |
| 새 파일을 어디에 둘지 정하기 | 신규 파일 위치 결정 |
| 요청 한 번이 지나가는 전 구간 | 요청 처리 단계 |
| 값이 바뀔 때 무언가 하기 | 부수 효과 처리 |
| 자주 겪는 문제 | 장애 유형 |
| 빈 폴더에서 앱 띄우기 | 프로젝트 초기 구성 |

## 5. 체크리스트

- [ ] 표지: 산출물군 / `<주제>` / V버전 / 문서정보표 4행 / (배포 구분) / 로고 / 조직 / 연도. 표지에는 쪽번호 없음
- [ ] 변경 이력: 마지막 행 버전 = `META.version` = 표지 버전
- [ ] 목차: 항목이 실제로 채워짐. 빈 목차 배포 금지
- [ ] 그림: `그림 N-N. 제목` 캡션 + 번호 설명표. 이미지 누락 자리(`[이미지 없음: ...]`) 0건
- [ ] 표: 헤더 행 음영 D9D9D9 + 굵게, 폭 합 9740, 페이지 넘김 시 헤더 반복
- [ ] 코드: 회색 박스, 페이지 경계에서 분리되지 않음
- [ ] 글꼴 맑은 고딕 9pt, 유채색 0(로고 제외), 코드만 Consolas
- [ ] 문자 규칙: `check-text.py` OK
- [ ] 쪽번호 `현재 / 전체`, 바닥글 로고 표시
- [ ] `validate.py` PASS
- [ ] md 미러 + 묶음 README + 07-deliverables README 갱신
- [ ] `_build/out/`, `node_modules/` 커밋 제외

## 6. 함정

- Word 에서 직접 고치면 다음 재생성에 덮어써진다. 수정은 `build.js` 에서 한다.
- 목차·쪽번호·그림 목차 쪽번호는 Word 필드다. `build.ps1` 의 Word COM 갱신을 거치지 않으면 비어 있다.
- 인접한 두 표(코드 박스, 강조 상자 포함)는 Word 가 하나로 합친다. `engine.js` 가 자동으로 사이에 빈 문단을 넣는다(직접 표를 만들 때도 이 규칙을 깨지 않는다).
- `table()` widths 합과 각 `cell({w})` 이 어긋나면 표가 밀린다.
- `ShadingType.CLEAR` 를 SOLID 로 바꾸면 셀이 검게 나온다.
- 표를 구분선 용도로 쓰지 않는다. 빈 셀 상자로 보인다.
- `styles.xml` 은 동결본이다. 개별 산출물에서 고치지 않고, 필요하면 `assets/styles.xml`(정본)을 바꾼 뒤 전 산출물을 재생성한다.
- `_build/` 는 산출물 폴더마다 사본이 생긴다. `engine.js` 나 `styles.xml` 을 고쳤으면 다른 묶음에도 반영할지 판단한다.
