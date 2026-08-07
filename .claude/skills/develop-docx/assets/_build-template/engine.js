/**
 * engine.js — insa-IT 산출물 docx 공통 엔진 (docx-js 래퍼)
 * 표지·변경이력·목차·머리글/바닥글·본문 헬퍼(제목·표·코드·그림 캡션·강조 상자)를 제공한다. 최종 서식은 apply-style.py 가 styles.xml 로 덮어쓴다.
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
  Header, Footer, PageNumber, VerticalAlign, PageBreak, TableOfContents,
  TabStopType, PageOrientation, Bookmark, SimpleField,
} = require('docx');

// 서식 상수 — 변경 시 references/format-spec.md 를 함께 고친다
const FONT = '맑은 고딕';
const CODE_FONT = 'Consolas';
const BLACK = '000000';
const HEAD_FILL = 'D9D9D9';   // 표 헤더 행
const SUB_FILL = 'F2F2F2';    // 표 첫 열(구분 열)
const CODE_FILL = 'F5F5F5';   // 코드 블록
const NOTE_FILL = 'FAFAFA';   // 강조 상자
const CW = 9740;              // 본문 폭(DXA) = A4 11906 - 좌우 여백 1080×2
const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };

// 캡션 자동 번호 상태. h1() 이 장을 올릴 때 표·그림 번호가 리셋된다
let chapter = 0, figureSeq = 0;
const captions = { figures: [] };   // {id, label} 수집 (그림 목차용)

// 문서 옵션. build.js 에서 setOptions() 로 덮어쓴다
const opts = {
  chapterPageBreak: true,    // 장(h1)마다 새 페이지에서 시작
  pageNumberTotal: true,     // 바닥글 '현재 / 전체' 표기 (false 면 '- N -')
  endMark: true,             // 본문 마지막에 '- 끝 -' 표기
  cover: true,               // 표지 + 변경 이력 페이지. false 면 본문부터 시작
  toc: true,                 // 자동 목차. false 면 생략
};
function setOptions(o) { Object.assign(opts, o); }

function run(t, o = {}) {
  return new TextRun({ text: t, size: o.size ?? 18, font: o.font ?? FONT, bold: o.bold, italics: o.italic, color: o.color ?? BLACK });
}
function mono(t, o = {}) { return run(t, { ...o, font: CODE_FONT, size: o.size ?? 16, color: o.color ?? '222222' }); }

function h1(t) {
  chapter += 1; figureSeq = 0;
  return new Paragraph({ heading: HeadingLevel.HEADING_1,
    pageBreakBefore: opts.chapterPageBreak && chapter > 1,   // 첫 장은 목차 다음 페이지에서 이미 시작
    children: [new TextRun({ text: t, font: FONT })] });
}
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })] }); }
function h3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT })] }); }

function p(t, o = {}) {
  return new Paragraph({ spacing: { after: o.after ?? 100, line: 264 }, keepNext: o.keepNext,
    children: Array.isArray(t) ? t : [run(t, o)] });
}
function bullet(t, level = 0) {
  return new Paragraph({ numbering: { reference: 'b', level }, spacing: { after: 60, line: 260 },
    children: Array.isArray(t) ? t : [run(t)] });
}
function note(t) {
  return new Paragraph({ spacing: { after: 120, line: 264 }, indent: { left: 160 },
    children: Array.isArray(t) ? t : [run(t, { italic: true, color: '444444' })] });
}
let nseq = 0;
function olist(items) {
  const ref = 'n' + (nseq++);
  return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60, line: 260 },
    children: Array.isArray(t) ? t : [run(t)] }));
}
function sp(n) { return new Paragraph({ spacing: { after: n ?? 60 }, children: [] }); }
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

// 표 — cell() 로 칸을 만들고 table() 로 조립. head=헤더 행(D9D9D9), sub=구분 열(F2F2F2)
function cell(t, { w, head = false, sub = false, bold = false, align, colSpan, rowSpan } = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, columnSpan: colSpan, rowSpan,
    shading: head ? { fill: HEAD_FILL, type: ShadingType.CLEAR } : sub ? { fill: SUB_FILL, type: ShadingType.CLEAR } : undefined,
    margins: { top: 50, bottom: 50, left: 110, right: 110 }, verticalAlign: VerticalAlign.CENTER,
    children: (Array.isArray(t) ? t : [t]).map((x) => new Paragraph({ alignment: align, spacing: { after: 0, line: 248 },
      children: [new TextRun({ text: x, size: 18, font: FONT, bold: head || bold, color: BLACK })] })),
  });
}
function table(w, rows) {
  return new Table({
    width: { size: w.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: w,
    rows: rows.map((c, i) => new TableRow({ children: c, tableHeader: i === 0, cantSplit: true })),
  });
}

// 코드 블록 — 1칸 표(회색 배경 + 얇은 테두리), Consolas 8pt. 페이지 중간에서 쪼개지지 않는다
function codeBlock(lines) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      borders, width: { size: CW, type: WidthType.DXA }, shading: { fill: CODE_FILL, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: lines.map((l) => new Paragraph({ spacing: { after: 0, line: 240 }, keepLines: true,
        children: [new TextRun({ text: l, size: 15, font: CODE_FONT, color: '222222' })] })),
    })] })],
  });
}
function code(s) { return codeBlock(s.replace(/^\n/, '').replace(/\n+$/, '').split('\n')); }

// 강조 상자 — 전폭 사각 상자(옅은 배경 + 좌측 세로바 + 얇은 회색 테두리). 제목 굵게 + 본문 문단.
// 문서 안의 강조 수단은 이것 하나뿐이다. 제목에 아이콘을 넣지 않는다.
function notice(title, lines) {
  const body = (Array.isArray(lines) ? lines : [lines]);
  const noticeBorders = {
    left: { style: BorderStyle.SINGLE, size: 18, color: '808080' },   // 좌측 세로바
    top: border, bottom: border, right: border,
  };
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      borders: noticeBorders, width: { size: CW, type: WidthType.DXA }, shading: { fill: NOTE_FILL, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 180, right: 180 },
      children: [
        // 상자 안 글자는 본문(9pt)보다 한 단계 작은 8.5pt
        new Paragraph({ spacing: { after: 120, line: 264 }, children: [run(title, { bold: true, size: 17 })] }),
        ...body.map((l, i) => new Paragraph({ spacing: { after: i === body.length - 1 ? 0 : 100, line: 276 },
          children: Array.isArray(l) ? l : [run(l, { size: 17 })] })),
      ],
    })] })],
  });
}

// 문서 종료 표기 — 본문 맨 끝 가운데
function endMark() {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480, after: 0 },
    children: [run('- 끝 -')] });
}

// 캡션 — 그림에만 붙인다. '그림 {장}-{순번}. 제목' 이탤릭 가운데, 그림 아래.
// 표에는 캡션을 붙이지 않는다(표 제목은 앞 문단이나 절 제목이 대신한다).
// 캡션에 책갈피를 심어 그림 목차가 쪽 번호를 참조한다.
function figureCaption(t) {
  figureSeq += 1;
  const id = `Fig${chapter}_${figureSeq}`;
  const label = `그림 ${chapter}-${figureSeq}. ${t}`;
  captions.figures.push({ id, label });
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 },
    children: [new Bookmark({ id, children: [run(label, { size: 17, italic: true })] })] });
}
function image(file, { width, height, alt = '' } = {}) {
  if (!fs.existsSync(file)) {
    // 빌드를 멈추지 않되 문서에 빈자리를 남긴다(누락을 못 보고 배포하는 것을 막는다)
    console.warn('WARN 이미지 없음:', file);
    return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 },
      border: { top: border, bottom: border, left: border, right: border },
      children: [run('[이미지 없음: ' + path.basename(file) + ']', { size: 17, color: '666666' })] });
  }
  const ext = path.extname(file).slice(1).toLowerCase();
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 },
    children: [new ImageRun({ type: ext === 'jpg' ? 'jpeg' : ext, data: fs.readFileSync(file),
      transformation: { width, height }, altText: { title: alt, description: alt, name: alt } })] });
}

// 화면 스크린샷 한 묶음 = 이미지 + 캡션 + 번호 설명표.
// 이미지 안에 표시한 번호와 표의 '#' 열이 1:1 대응한다. rows = [{ no, area, desc }]
function figureWithLegend(file, caption, rows, { width, height, cols = [900, 2600, 6240] } = {}) {
  return [
    image(file, { width, height, alt: caption }),
    figureCaption(caption),
    table(cols, [
      [cell('#', { w: cols[0], head: true, align: AlignmentType.CENTER }),
        cell('영역', { w: cols[1], head: true }), cell('설명', { w: cols[2], head: true })],
      ...rows.map((r, i) => [
        cell(String(r.no ?? i + 1), { w: cols[0], align: AlignmentType.CENTER }),
        cell(r.area, { w: cols[1] }), cell(r.desc, { w: cols[2] }),
      ]),
    ]),
  ];
}

// 그림 목차 — 캡션 책갈피를 PAGEREF 로 참조한다(Word 필드 갱신 시 쪽 번호가 채워진다)
function captionList() {
  const rows = captions.figures;
  if (!rows.length) return [];
  const w = [8240, 1500];
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run('그림 목차', { size: 40, bold: true })] }),
    table(w, [
      [cell('제목', { w: w[0], head: true }), cell('쪽', { w: w[1], head: true, align: AlignmentType.CENTER })],
      ...rows.map((r) => [
        cell(r.label, { w: w[0] }),
        new TableCell({ borders, width: { size: w[1], type: WidthType.DXA },
          margins: { top: 50, bottom: 50, left: 110, right: 110 }, verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0, line: 248 },
            children: [new SimpleField(`PAGEREF ${r.id} \\h`)] })] }),
      ]),
    ]),
    pageBreak(),
  ];
}

// 회사 로고 — 파일이 없으면 조용히 생략한다(로고 없이도 빌드가 성립)
function logoRun(meta, width, height) {
  const f = meta.logo && meta.logo.file;
  if (!f || !fs.existsSync(f)) return null;
  const ext = path.extname(f).slice(1).toLowerCase();
  return new ImageRun({ type: ext === 'jpg' ? 'jpeg' : ext, data: fs.readFileSync(f),
    transformation: { width, height }, altText: { title: meta.org, description: meta.org, name: meta.org } });
}
function logoOn(meta, where) {
  const on = (meta.logo && meta.logo.on) || 'both';
  return (on === 'both' || on === where) && !!(meta.logo && meta.logo.file && fs.existsSync(meta.logo.file));
}

// ── 표지 · 변경이력 · 목차 ───────────────────────────────────────────────
function cover(meta) {
  const c = [];
  for (let i = 0; i < 7; i++) c.push(sp(0));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run(meta.title, { size: 44, bold: true })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run('<' + meta.topic + '>', { size: 36, bold: true })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [run('V' + meta.version, { size: 24 })] }));
  c.push(new Table({ alignment: AlignmentType.CENTER, width: { size: 6400, type: WidthType.DXA }, columnWidths: [2200, 4200],
    rows: [
      [cell('문서명', { w: 2200, head: true }), cell(meta.title + ' - ' + meta.topic, { w: 4200 })],
      [cell('버전', { w: 2200, head: true }), cell(meta.version, { w: 4200 })],
      [cell('작성 부서', { w: 2200, head: true }), cell(meta.dept, { w: 4200 })],
      [cell('작성일', { w: 2200, head: true }), cell(meta.date, { w: 4200 })],
      ...(meta.reviseDate ? [[cell('개정일', { w: 2200, head: true }), cell(meta.reviseDate, { w: 4200 })]] : []),
    ].map((r) => new TableRow({ children: r })) }));
  if (meta.classification) {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 280, after: 0 },
      children: [run(meta.classification, { size: 20, bold: true })] }));
  }
  for (let i = 0; i < (meta.classification ? 6 : 8); i++) c.push(sp(0));
  if (logoOn(meta, 'cover')) {
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [logoRun(meta, meta.logo.coverWidth ?? 170, meta.logo.coverHeight ?? 40)] }));
  }
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run(meta.org, { size: 24, bold: true })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run(meta.year, { size: 24 })] }));
  c.push(pageBreak());
  return c;
}
function revPart(meta) {
  const w = [1500, 2200, 4440, 1600];
  return [
    new Paragraph({ spacing: { after: 200 }, children: [run('변경 이력', { size: 32, bold: true })] }),
    table(w, [
      [cell('버전', { w: w[0], head: true }), cell('일자', { w: w[1], head: true }), cell('변경 내용', { w: w[2], head: true }), cell('작성자', { w: w[3], head: true })],
      ...meta.revisions.map((r) => [
        cell(r.ver, { w: w[0], sub: true, bold: true }), cell(r.date, { w: w[1] }),
        cell(r.desc, { w: w[2] }), cell(r.author ?? meta.dept, { w: w[3] }),
      ]),
    ]),
    pageBreak(),
  ];
}
function tocPart() {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run('목   차', { size: 40, bold: true })] }),
    new TableOfContents('목차', { hyperlink: true, headingStyleRange: '1-3' }),
    pageBreak(),
  ];
}

// Word 는 사이에 문단이 없는 두 표를 한 표로 병합한다(코드블록·콜아웃·표가 연달아 올 때 발생).
// 인접한 Table 사이에 1pt 고정 높이의 빈 문단을 자동으로 끼워 병합을 막는다.
function separateTables(items) {
  const out = [];
  items.forEach((it, i) => {
    out.push(it);
    if (it instanceof Table && items[i + 1] instanceof Table) {
      out.push(new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' }, children: [] }));
    }
  });
  return out;
}

// 용지 — 세로(기본) / 가로(넓은 도표·ERD 전용). 여백은 동일하므로 본문 폭만 달라진다.
const PAGE_MARGIN = { top: 1080, right: 1080, bottom: 1080, left: 1080 };
// 주의: docx-js 는 orientation 이 LANDSCAPE 면 width/height 를 스스로 뒤집는다.
//       따라서 두 경우 모두 '세로 기준' 치수(11906 × 16838)를 넘겨야 한다.
const PAGE = {
  portrait: { size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT }, margin: PAGE_MARGIN },
  landscape: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: PAGE_MARGIN },
};
const CW_LAND = 14678;        // 가로 용지 본문 폭(DXA) = 16838 - 1080×2

// meta: { title, topic, version, dept, date, org, year, revisions[], runningHeader? }
// extra: [{ children, landscape }] — 본문 뒤에 이어붙일 추가 섹션. 섹션이 바뀌면 새 페이지에서 시작한다.
function buildDoc(meta, body, extra = []) {
  const m = { org: '화이트 정보통신 R&D 개발팀', dept: 'R&D 개발팀', year: String(meta.date || '').slice(0, 4), ...meta };
  // 캡션 수집은 body 조립(= h1/figureCaption 호출) 중에 끝나므로 여기서 번호 상태만 초기화한다
  chapter = 0; figureSeq = 0; nseq = 0; captions.figures.length = 0;

  // 바닥글: (로고 있으면) 가운데 쪽번호 + 오른쪽 로고, 없으면 가운데 쪽번호만
  const pageNo = opts.pageNumberTotal
    ? [new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: BLACK }),
      new TextRun({ text: ' / ', size: 16, font: FONT, color: BLACK }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: FONT, color: BLACK })]
    : [new TextRun({ text: '- ', size: 16, font: FONT, color: BLACK }),
      new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: BLACK }),
      new TextRun({ text: ' -', size: 16, font: FONT, color: BLACK })];
  const footLogo = logoOn(m, 'footer');
  const makeFooter = (cw) => new Footer({ children: [new Paragraph({
    alignment: footLogo ? undefined : AlignmentType.CENTER,
    tabStops: footLogo ? [{ type: TabStopType.CENTER, position: Math.floor(cw / 2) }, { type: TabStopType.RIGHT, position: cw }] : undefined,
    children: footLogo
      ? [new TextRun({ text: '\t', size: 16, font: FONT }), ...pageNo, new TextRun({ text: '\t', size: 16, font: FONT }),
        logoRun(m, (m.logo.footerWidth ?? 84), (m.logo.footerHeight ?? 20))]
      : pageNo,
  })] });
  const pageFooter = makeFooter(CW);
  const pageFooterLand = makeFooter(CW_LAND);
  const runningHeader = new Header({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CW }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF', space: 4 } },
    children: [run(m.title, { size: 15, color: '444444' }), run('\t' + m.topic + '  V' + m.version, { size: 15, color: '444444' })],
  })] });

  return new Document({
    title: m.title + ' - ' + m.topic, description: m.title, creator: m.org, lastModifiedBy: m.org,
    styles: {
      default: { document: { run: { font: FONT, size: 18, color: BLACK } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 32, bold: true, color: BLACK, font: FONT }, paragraph: { outlineLevel: 0, spacing: { before: 720, after: 180 } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 26, bold: true, color: BLACK, font: FONT }, paragraph: { outlineLevel: 1, spacing: { before: 520, after: 140 } } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 22, bold: true, color: BLACK, font: FONT }, paragraph: { outlineLevel: 2, spacing: { before: 360, after: 120 } } },
      ],
    },
    numbering: { config: [
      { reference: 'b', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '-', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 220 } } } },
      ] },
      { reference: 'n', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1)', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 280 } } } }] },
      ...Array.from({ length: 40 }, (_, i) => ({ reference: 'n' + i, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1)', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 280 } } } }] })),
    ] },
    sections: [
      {
        properties: { titlePage: opts.cover, page: PAGE.portrait },
        headers: m.runningHeader ? { first: new Header({ children: [new Paragraph({ children: [] })] }), default: runningHeader } : undefined,
        footers: { first: new Footer({ children: [new Paragraph({ children: [] })] }), default: pageFooter },
        children: separateTables([...(opts.cover ? [...cover(m), ...revPart(m)] : []),
          ...(opts.toc ? tocPart() : []),
          ...(m.listOfCaptions ? captionList() : []), ...body,
          ...(opts.endMark && !extra.length ? [endMark()] : [])]),
      },
      ...extra.map((s, idx) => ({
        properties: { page: s.landscape ? PAGE.landscape : PAGE.portrait },
        headers: m.runningHeader ? { default: runningHeader } : undefined,
        footers: { default: s.landscape ? pageFooterLand : pageFooter },
        children: separateTables([...s.children,
          ...(opts.endMark && idx === extra.length - 1 ? [endMark()] : [])]),
      })),
    ],
  });
}

// ── 산출 ────────────────────────────────────────────────────────────────
const OUT = path.join(__dirname, 'out');
const emitted = [];
async function emit(doc, genName, finalName) {
  fs.mkdirSync(OUT, { recursive: true });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUT, genName + '.docx'), buf);
  emitted.push({ gen: genName, dst: finalName });
  console.log('generated:', genName + '.docx');
}
function finish() {
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(emitted, null, 2));
  console.log('manifest:', emitted.length, 'document(s)');
}

module.exports = {
  FONT, CODE_FONT, BLACK, HEAD_FILL, SUB_FILL, CODE_FILL, CW, CW_LAND, borders,
  run, mono, h1, h2, h3, p, bullet, note, olist, sp, pageBreak, setOptions,
  cell, table, code, codeBlock, notice, figureCaption, image, figureWithLegend,
  buildDoc, emit, finish,
};
