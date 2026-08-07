/**
 * build.js — {산출물명} docx 본문 생성 (engine.js 사용)
 * 문서 내용은 Word 가 아니라 이 파일에서 고치고 build.ps1 로 재생성한다.
 */
const path = require('path');
const E = require('./engine');
const { h1, h2, h3, p, bullet, note, olist, table, cell, code, notice,
  figureWithLegend, run } = E;

// 문서 옵션 (기본값: 장마다 새 페이지, 쪽번호 '현재 / 전체')
E.setOptions({ chapterPageBreak: true, pageNumberTotal: true });

const META = {
  title: 'insa-IT(인사잇) {산출물군}',   // 예: 개발 가이드, 데이터베이스 설계서
  topic: '{주제}',                        // 예: 프론트엔드
  version: '0.1',
  dept: 'R&D 개발팀',
  org: '화이트 정보통신 R&D 개발팀',
  date: '2026-00-00',
  classification: '',                     // 예: '대외비' (빈 값이면 표기하지 않음)
  runningHeader: false,                   // true = 머리글(문서명 | 주제 V버전)
  listOfCaptions: false,                  // true = 목차 뒤에 그림 목차 추가
  logo: {                                 // 파일이 없으면 로고 없이 생성된다
    file: path.join(__dirname, 'media', 'white-logo.png'),
    on: 'both',                           // 'cover' | 'footer' | 'both'
  },
  revisions: [
    { ver: '0.1', date: '2026-00-00', desc: '최초 작성' },
  ],
};

const body = [];

body.push(h1('1. 개요'));
body.push(h2('1.1 문서의 목적'));
body.push(p('이 문서는 …'));
body.push(bullet([run('근거: ', { bold: true }), run('실제 소스를 읽어 작성한 실측이다.')]));

// olist() 와 figureWithLegend() 는 배열을 반환한다. 반드시 전개해서 넣는다.
// 전개하지 않으면 잘못된 XML 요소가 생겨 문서가 열리지 않는다.
body.push(...olist([
  '첫 번째 단계',
  '두 번째 단계',
]));

body.push(h2('1.2 표'));
body.push(p('표에는 캡션을 붙이지 않는다. 설명이 필요하면 이렇게 표 앞 문단에 쓴다.'));
body.push(table([2400, 7340], [
  [cell('구분', { w: 2400, head: true }), cell('설명', { w: 7340, head: true })],
  [cell('항목 A', { w: 2400, sub: true, bold: true }), cell('설명 문장', { w: 7340 })],
]));

body.push(h2('1.3 화면 스크린샷'));
body.push(...figureWithLegend(
  path.join(__dirname, 'media', 'screen-sample.png'),
  '{화면명} 화면 구성',
  [
    { no: 1, area: '검색 영역', desc: '조회 조건 입력' },
    { no: 2, area: '목록 영역', desc: '조회 결과 표시' },
  ],
  { width: 560, height: 320 },
));

body.push(h2('1.4 코드'));
body.push(code(`
cd h5-saas-alpha/insait-frontend
npm install
npm run dev      # http://localhost:5173
`));

body.push(h2('1.5 강조 상자'));
body.push(notice('상자 제목은 문장으로 쓴다', [
  '지키지 않으면 문제가 되는 규칙, 또는 설계 판단의 근거를 담는다.',
  '한 문장으로 끝나는 내용은 상자로 만들지 않고 본문 문단으로 쓴다.',
]));

body.push(h1('부록 A. 용어 및 약어'));
body.push(table([2400, 7340], [
  [cell('용어', { w: 2400, head: true }), cell('설명', { w: 7340, head: true })],
  [cell('SFC', { w: 2400, sub: true, bold: true }), cell('Single File Component. Vue 의 단일 파일 컴포넌트', { w: 7340 })],
]));

(async () => {
  await E.emit(E.buildDoc(META, body), 'gen_main', `${META.title} - ${META.topic}.docx`);
  E.finish();
})();
