/* 재현 UI 공통 스크립트 — 헤더·사이드바를 그리고 버튼 동작을 붙인다.
   페이지마다 같은 마크업을 복사하지 않으려고 셸을 여기서 만든다.
   Playwright 는 domcontentloaded 에서 조작을 시작하므로 body 끝에서 동기로 실행한다. */

const PAGES = {
  index: 'index.html',
  results: 'results.html',
  watch: 'watch.html',
  subs: 'subscriptions.html',
  library: 'library.html',
};

/* 썸네일 배경 — 이미지 파일 없이 그라디언트 + 이모지로 만든다 */
const ART = [
  'linear-gradient(135deg,#2b4c7e,#567189)',
  'linear-gradient(135deg,#3d5a3d,#7d9d6a)',
  'linear-gradient(135deg,#7a3b3b,#c98474)',
  'linear-gradient(135deg,#463b73,#8b7bb8)',
  'linear-gradient(135deg,#8a5a2b,#d4a373)',
  'linear-gradient(135deg,#20505c,#4a919e)',
  'linear-gradient(135deg,#5c2b4e,#a76b8f)',
  'linear-gradient(135deg,#2f4858,#86a3b8)',
];

function art(i) { return ART[i % ART.length]; }

/* 이모지로는 흐리게 나오는 아이콘만 인라인 SVG 로 그린다 */
const ICON_MIC =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">' +
  '<path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/>' +
  '<path d="M17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z"/></svg>';

const ICON_VOL =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">' +
  '<path d="M3 9v6h4l5 5V4L7 9H3z"/>' +
  '<path d="M16.5 12a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>' +
  '<path d="M14 2v2a8 8 0 0 1 0 16v2a10 10 0 0 0 0-20z"/></svg>';

function thumb(i, emoji, dur) {
  return `<div class="thumb" style="background:${art(i)}">${emoji}<span class="dur">${dur}</span></div>`;
}

/* ── 셸(헤더 + 사이드바) ── */

function renderShell(active) {
  const header = `
    <div id="header">
      <button class="hbtn" id="btn-menu" title="메뉴">☰</button>
      <a class="brand" href="index.html" id="btn-logo">
        <span class="brand-mark"></span>
        <span class="brand-name">YouTube</span>
        <span class="brand-kr">KR</span>
      </a>
      <span class="mock-tag">화면 재현 예시</span>
      <div id="search-wrap">
        <input id="search-input" placeholder="검색" autocomplete="off" />
        <button id="btn-search" title="검색">🔍</button>
        <button id="btn-mic" title="음성 검색">${ICON_MIC}</button>
        <div id="suggest"></div>
      </div>
      <div class="spacer"></div>
      <div id="header-right">
        <button class="hbtn" id="btn-create" title="만들기">＋</button>
        <button class="hbtn" id="btn-notif" title="알림">🔔<span class="dot">3</span></button>
        <div id="avatar" title="계정">민</div>
      </div>
    </div>`;

  const nav = (id, icon, label) =>
    `<a class="nav-item ${active === id ? 'active' : ''}" id="nav-${id}" href="${
      { home: PAGES.index, subs: PAGES.subs, you: PAGES.library, history: PAGES.library,
        playlists: PAGES.library, later: PAGES.library, liked: PAGES.library, shorts: PAGES.index }[id] || '#'
    }"><i>${icon}</i>${label}</a>`;

  const sidebar = `
    <div id="sidebar">
      ${nav('home', '🏠', '홈')}
      ${nav('shorts', '⚡', 'Shorts')}
      ${nav('subs', '📺', '구독')}
      <div class="nav-sep"></div>
      ${nav('you', '👤', '나')}
      ${nav('history', '🕘', '시청 기록')}
      ${nav('playlists', '📂', '재생목록')}
      ${nav('later', '🕐', '나중에 볼 동영상')}
      ${nav('liked', '👍', '좋아요 표시한 동영상')}
    </div>`;

  const accountMenu = `
    <div id="account-menu">
      <div class="acc-head">
        <div id="avatar" style="width:56px;height:56px;font-size:22px">민</div>
        <div>
          <div style="font-size:19px;font-weight:700">김민수</div>
          <div style="font-size:15px;color:#aaa;margin-top:4px">@minsu_kim</div>
          <div class="link" style="margin-top:8px">내 채널 보기</div>
        </div>
      </div>
      <div class="acc-item" id="acc-google"><i>🔐</i>Google 계정 관리</div>
      <div class="acc-item" id="acc-switch"><i>🔄</i>계정 전환</div>
      <div class="acc-item" id="acc-history"><i>🕘</i>시청 기록 관리</div>
      <div class="acc-item" id="acc-restricted"><i>🛡</i>제한 모드<span class="toggle"></span></div>
      <div class="acc-item" id="acc-lang"><i>🌐</i>언어: 한국어</div>
      <div class="acc-item" id="acc-logout"><i>↩</i>로그아웃</div>
    </div>`;

  document.body.insertAdjacentHTML('afterbegin', header + sidebar);
  document.body.insertAdjacentHTML('beforeend', accountMenu);

  document.getElementById('avatar').addEventListener('click', () => {
    document.getElementById('account-menu').classList.toggle('on');
  });
  document.getElementById('acc-restricted').addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('on');
  });

  bindSearch();
}

/* ── 검색창: 입력하면 자동완성이 뜨고, 엔터/돋보기로 결과 페이지로 간다 ── */

function bindSearch() {
  const input = document.getElementById('search-input');
  const box = document.getElementById('suggest');

  const fill = (q) => {
    const list = [q, q + ' 10분', q + ' 초보', q + ' 따라하기'];
    box.innerHTML = list
      .map((s, i) => `<div><span>🔍</span>${s}${i === 0 ? '' : ''}</div>`)
      .join('');
    box.classList.add('on');
  };

  input.addEventListener('input', () => {
    if (input.value.trim()) fill(input.value.trim());
    else box.classList.remove('on');
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go();
  });
  document.getElementById('btn-search').addEventListener('click', go);

  function go() {
    const q = input.value.trim();
    location.href = PAGES.results + (q ? '?q=' + encodeURIComponent(q) : '');
  }
}

/* ── 카드 만들기 ── */

const HOME_VIDEOS = [
  ['🧘', '아침 10분 스트레칭 — 초보자도 따라 하는 기본 동작', '건강한하루', '조회수 128만회 · 3일 전', '10:24'],
  ['🍳', '자취 요리 입문: 계란 하나로 만드는 반찬 5가지', '오늘의부엌', '조회수 42만회 · 1주 전', '14:02'],
  ['🎸', '기타 코드 C부터 G까지 — 첫날에 배우는 것', '기타연습실', '조회수 91만회 · 2주 전', '18:37'],
  ['🏞', '가을 산책길 4K — 소리만 들어도 좋은 영상', '걷는사람', '조회수 15만회 · 5일 전', '32:10'],
  ['📱', '스마트폰 사진 잘 찍는 법 7가지', '사진공부방', '조회수 67만회 · 4일 전', '11:45'],
  ['☕', '집에서 내리는 커피 — 도구 없이 시작하기', '커피한잔', '조회수 23만회 · 2일 전', '08:19'],
  ['🧹', '10분 정리 습관 만들기', '살림노트', '조회수 8.4만회 · 6일 전', '09:58'],
  ['🚲', '자전거 처음 타는 어른을 위한 안내', '두바퀴클럽', '조회수 31만회 · 3주 전', '16:03'],
  ['🥗', '냉장고 재료로 만드는 저녁 한 끼', '오늘의부엌', '조회수 55만회 · 1일 전', '12:31'],
  ['🎹', '피아노 왼손 반주 기초', '피아노교실', '조회수 19만회 · 2주 전', '21:07'],
  ['🐕', '강아지와 산책할 때 지킬 것', '반려생활', '조회수 44만회 · 4일 전', '07:52'],
  ['🌱', '베란다 텃밭 시작하기', '초록방', '조회수 12만회 · 1주 전', '13:26'],
  ['🧺', '빨래 개는 시간 반으로 줄이기', '살림노트', '조회수 27만회 · 3일 전', '06:44'],
  ['🗺', '혼자 떠나는 당일치기 코스 5곳', '주말지도', '조회수 38만회 · 1주 전', '15:12'],
  ['🍜', '라면 맛있게 끓이는 세 가지 차이', '오늘의부엌', '조회수 210만회 · 2주 전', '05:36'],
  ['📖', '하루 20분 읽기 습관', '책상앞', '조회수 6.9만회 · 5일 전', '10:48'],
  ['🎮', '처음 하는 사람을 위한 조작 설명', '게임입문', '조회수 74만회 · 3주 전', '22:15'],
  ['🌊', '파도 소리 3시간 (수면용)', '고요한방', '조회수 340만회 · 1개월 전', '3:00:00'],
  ['🧵', '단추 다는 법 — 바늘 잡는 것부터', '손끝공방', '조회수 11만회 · 6일 전', '07:09'],
  ['🚗', '초보 운전 주차 감각 잡기', '두바퀴클럽', '조회수 96만회 · 2주 전', '17:41'],
];

function renderHomeGrid(el) {
  el.innerHTML = HOME_VIDEOS.map(([emoji, title, ch, meta, dur], i) => `
    <a class="card" href="${PAGES.watch}">
      ${thumb(i, emoji, dur)}
      <div class="card-body">
        <div class="ch-avatar" style="background:${art(i + 3)}">${ch[0]}</div>
        <div>
          <div class="card-title">${title}</div>
          <div class="card-meta">${ch}<br>${meta}</div>
        </div>
      </div>
    </a>`).join('');
}

document.addEventListener('click', (e) => {
  // 계정 메뉴 바깥을 누르면 닫는다
  const menu = document.getElementById('account-menu');
  if (menu && menu.classList.contains('on') && !menu.contains(e.target) && e.target.id !== 'avatar') {
    menu.classList.remove('on');
  }
});
