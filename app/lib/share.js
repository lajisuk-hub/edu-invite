// 발급 내용을 "링크 주소 안에" 담고 꺼내는 도구
// - 보관함(Vercel Blob)이 잘 되면 /g/번호 짧은 링크를 쓰고,
//   보관함이 안 될 때를 대비해 내용을 통째로 담는 긴 링크(?d=)도 항상 만들어 둔다.
// - ⚠️ 주소에 들어가는 값의 '+' 는 브라우저가 빈칸으로 읽어버리는 함정이 있다.
//   그래서 만들 때 encodeURIComponent로 감싸고(+ → %2B), 읽을 때도 빈칸을 '+'로 되돌린다.
import LZString from 'lz-string';
import { DEFAULT_DESIGN_ID } from './certDesigns';

export const DATA_PARAM = 'd';

// 그룹챗방 주소 칸에 문자 내용을 통째로(안내글 + 주소) 붙여넣으셔도
// 그 안에 들어 있는 진짜 주소만 뽑아 준다. 주소가 없으면 빈 값을 돌려준다.
export function pickChatUrl(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const tidy = (u) => u.replace(/[)\]}>.,;:'"·]+$/g, '');
  const withScheme = text.match(/https?:\/\/[^\s<>"']+/i);
  if (withScheme) return tidy(withScheme[0]);
  // https:// 없이 'open.kakao.com/o/xxxx' 처럼 적으신 경우
  const bare = text.match(/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/i);
  if (bare) return 'https://' + tidy(bare[0]);
  return '';
}

// 수료증 한 장의 기본 모양
export function emptyCert() {
  return {
    design: DEFAULT_DESIGN_ID, // 고른 수료증 디자인
    course: '',                // 수료증에 찍힐 교육 과정명
    start: '',                 // 교육 시작일
    end: '',                   // 교육 종료일
    award: '',                 // 수여일 (비우면 종료일을 쓴다)
    label: '',                 // 참가자 화면에서 이 수료증을 부르는 이름 (비우면 과정명)
  };
}

// 관리자 화면이 처음 열릴 때 보여줄 빈 내용
export function emptyConfig() {
  return {
    v: 1,
    title: '',                       // 교육 이름 (화면 제목 · 파일 이름에 쓰인다)
    // 교육 안내(그룹챗 입장) — 교육 전에 보내는 안내 화면
    guide: {
      on: false,      // 이 안내를 넣을지
      course: '',     // 안내 화면에 보일 교육명 (비우면 위의 교육 이름)
      body: '',       // 안내글 (교육 일시·장소·준비물 등, 선택)
      chatUrl: '',    // 그룹챗방 주소 (카톡 오픈채팅 등)
      chatLabel: '',  // 입장 단추 글자 (비우면 '그룹챗방 입장하기')
    },
    intro: { heading: '', body: '' }, // 서류 화면 첫 인사말
    certs: [],                       // 수료증 (여러 장 가능)
    receipt: {
      on: true,
      course: '',                    // 거래명세서 품목(교육) 이름
      fee: '',                       // 기본 금액 (참가자가 고칠 수 있다)
    },
    outro: { heading: '', body: '', contact: '' },
  };
}

function cleanCert(raw) {
  const base = emptyCert();
  if (!raw || typeof raw !== 'object') return base;
  return {
    design: raw.design || base.design,
    course: raw.course || '',
    start: raw.start || '',
    end: raw.end || '',
    award: raw.award || '',
    label: raw.label || '',
  };
}

// 빠진 항목이 있어도 앱이 깨지지 않도록 기본값과 합쳐준다.
export function normalize(raw) {
  const base = emptyConfig();
  if (!raw || typeof raw !== 'object') return base;
  return {
    v: 1,
    title: raw.title || '',
    guide: { ...base.guide, ...(raw.guide || {}) },
    intro: { ...base.intro, ...(raw.intro || {}) },
    certs: Array.isArray(raw.certs) ? raw.certs.map(cleanCert) : [],
    receipt: { ...base.receipt, ...(raw.receipt || {}) },
    outro: { ...base.outro, ...(raw.outro || {}) },
  };
}

// 내용 → 링크에 붙일 짧은 글자
export function encodeConfig(config) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(config));
}

// 링크에서 꺼낸 글자 → 내용
export function decodeConfig(value) {
  if (!value) return null;
  try {
    // 주소를 거치며 '+' 가 빈칸으로 바뀌었을 수 있어 되돌린다.
    const fixed = String(value).replace(/ /g, '+');
    const json = LZString.decompressFromEncodedURIComponent(fixed);
    if (!json) return null;
    return normalize(JSON.parse(json));
  } catch (err) {
    return null;
  }
}

// 완성된 공유 링크 만들기 (참가자용 주소는 항상 홈 '/')
export function buildShareLink(config, origin) {
  const packed = encodeConfig(config);
  const base = (origin || '').replace(/\/$/, '');
  return `${base}/?${DATA_PARAM}=${encodeURIComponent(packed)}`;
}

// 붙여넣은 링크에서 내용 되찾기 (관리자가 예전 링크를 고칠 때 사용)
export function readConfigFromLink(link) {
  try {
    const q = String(link).split('?')[1];
    if (!q) return null;
    const params = new URLSearchParams(q);
    return decodeConfig(params.get(DATA_PARAM));
  } catch (err) {
    return null;
  }
}

// 붙여넣은 글에서 짧은 주소의 번호만 뽑아낸다 (링크 전체든 번호만이든 다 받아준다)
export function pickCode(text) {
  const t = (text || '').trim().toLowerCase();
  const inUrl = t.match(/\/g\/([a-z0-9]{4,12})/);
  if (inUrl) return inUrl[1];
  if (/^[a-z0-9]{4,12}$/.test(t)) return t;
  return '';
}
