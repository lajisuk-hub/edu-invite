// 수료증 디자인 목록
// ------------------------------------------------------------------
// 새 디자인을 넣는 방법
//  1) public/cert-designs/ 안에 A4 세로 비율 그림(1240 x 1754 권장)을 넣는다.
//  2) 아래 목록에 한 칸을 추가한다.
//  3) 숫자는 모두 "A4를 595 x 841 로 봤을 때의 위치(px)"다. (A4 폭 210mm = 595px)
//
//  fields : 성명 / 소속 / 교육기간 세 줄이 시작하는 자리
//  body   : "귀하는 ○○ 교육과정을..." 문장 자리
//  title  : 배경 그림에 '수료증' 글자가 없는 디자인만 넣는다 (없으면 null)
//  org    : 배경 그림에 기관명이 없는 디자인만 넣는다 (없으면 null)
//  date   : 배경 그림에 날짜 자리가 있는 디자인만 넣는다 (없으면 null)
//  seal   : 직인을 얹을 자리
// ------------------------------------------------------------------

export const CERT_W = 595;
export const CERT_H = 841;

export const CERT_DESIGNS = [
  {
    id: 'classic',
    name: '기본형',
    desc: '흰 바탕 · 손그림 테두리 · 금색 리본',
    bg: '/cert-designs/classic.jpg',
    title: null,
    fields: { top: 340, left: 164, labelWidth: 96, rowHeight: 34, fontSize: 16, color: '#111111' },
    body: { top: 468, left: 45, right: 45, fontSize: 22, lineHeight: 2.1, color: '#111111' },
    org: null,
    date: null,
    seal: { left: 388, top: 716, width: 74 },
  },
  {
    id: 'formal',
    name: '정중한형',
    desc: '이중 테두리 · 붉은 훈장',
    bg: '/cert-designs/formal.jpg',
    title: null,
    fields: { top: 340, left: 168, labelWidth: 96, rowHeight: 34, fontSize: 16, color: '#111111' },
    body: { top: 466, left: 70, right: 70, fontSize: 21, lineHeight: 2.05, color: '#111111' },
    org: null,
    date: null,
    seal: { left: 494, top: 680, width: 60 },
  },
  {
    id: 'pattern',
    name: '고급형',
    desc: '무늬 테두리 · 붉은 훈장',
    bg: '/cert-designs/pattern.jpg',
    title: null,
    fields: { top: 340, left: 168, labelWidth: 96, rowHeight: 34, fontSize: 16, color: '#111111' },
    body: { top: 466, left: 80, right: 80, fontSize: 20, lineHeight: 2.05, color: '#111111' },
    org: null,
    date: null,
    seal: { left: 460, top: 680, width: 60 },
  },
  {
    id: 'gold-ribbon',
    name: '금장형',
    desc: '흰 바탕 · 모서리 금색 리본',
    bg: '/cert-designs/gold-ribbon.jpg',
    title: null,
    fields: { top: 340, left: 168, labelWidth: 96, rowHeight: 34, fontSize: 16, color: '#111111' },
    body: { top: 466, left: 60, right: 60, fontSize: 21, lineHeight: 2.05, color: '#111111' },
    org: null,
    date: null,
    seal: { left: 358, top: 658, width: 70 },
  },
  {
    id: 'beige-shield',
    name: '크림형',
    desc: '아이보리 바탕 · 방패 리본',
    bg: '/cert-designs/beige-shield.jpg',
    title: { top: 190, fontSize: 42, color: '#7a5c2e', font: 'serif', spacing: '0.34em' },
    fields: { top: 320, left: 168, labelWidth: 96, rowHeight: 34, fontSize: 16, color: '#3a3226' },
    body: { top: 448, left: 70, right: 70, fontSize: 21, lineHeight: 2.0, color: '#3a3226' },
    org: null,
    date: null,
    seal: { left: 358, top: 645, width: 70 },
  },
  {
    id: 'ornate',
    name: '전통형',
    desc: '격자 무늬 테두리 · 차분한 느낌',
    bg: '/cert-designs/ornate.jpg',
    title: null,
    fields: { top: 310, left: 168, labelWidth: 96, rowHeight: 34, fontSize: 16, color: '#222222' },
    // 교육기간 줄과 본문이 붙어 보여서 한 줄만큼 아래로 내림 (다른 디자인과 같은 26px 간격)
    body: { top: 438, left: 62, right: 62, fontSize: 20, lineHeight: 2.05, color: '#222222' },
    org: { top: 590, fontSize: 15, color: '#333333', align: 'center' },
    date: null,
    seal: { left: 382, top: 568, width: 64 },
  },
  {
    id: 'mint',
    name: '산뜻형',
    desc: '민트색 도장 · 깔끔한 선',
    bg: '/cert-designs/mint.jpg',
    title: null,
    fields: { top: 352, left: 168, labelWidth: 96, rowHeight: 34, fontSize: 16, color: '#222222' },
    body: { top: 478, left: 70, right: 70, fontSize: 21, lineHeight: 2.05, color: '#222222' },
    org: { top: 636, fontSize: 15, color: '#222222', align: 'center' },
    date: null,
    seal: { left: 382, top: 614, width: 64 },
  },
  {
    id: 'plain-line',
    name: '심플형',
    desc: '가는 테두리 · 날짜와 서명란이 있어요',
    bg: '/cert-designs/plain-line.jpg',
    title: { top: 186, fontSize: 44, color: '#1f1f1f', font: 'sans', spacing: '0.3em' },
    fields: { top: 320, left: 168, labelWidth: 96, rowHeight: 34, fontSize: 16, color: '#1f1f1f' },
    body: { top: 448, left: 60, right: 60, fontSize: 21, lineHeight: 2.05, color: '#1f1f1f' },
    org: { top: 756, left: 414, right: 44, fontSize: 11.5, color: '#333333', align: 'center' },
    date: { top: 756, left: 108, right: 372, fontSize: 11.5, color: '#333333', align: 'left' },
    seal: { left: 498, top: 698, width: 52 },
  },
];

export function getDesign(id) {
  return CERT_DESIGNS.find((d) => d.id === id) || CERT_DESIGNS[0];
}

export const DEFAULT_DESIGN_ID = CERT_DESIGNS[0].id;
