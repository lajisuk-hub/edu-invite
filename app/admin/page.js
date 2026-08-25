'use client';

// 관리자 화면 — 원장님만 쓰는 곳
// 순서대로 따라가면 링크가 나온다.
//  1) 교육 이름  2) 무엇을 담을지 고르기(교육안내 / 수료증 / 거래명세서)
//  3) 고른 것만 차례로 채우기  4) 전달 링크 만들기(짧게)

import { useEffect, useState } from 'react';
import Mascot from '../components/Mascot';
import FitBox from '../components/FitBox';
import CertDoc from '../components/CertDoc';
import { CERT_DESIGNS, CERT_W, CERT_H } from '../lib/certDesigns';
import { fmtCertDate, fmtKoreanDate, todayIso } from '../lib/pdf';
import {
  emptyConfig,
  emptyCert,
  buildShareLink,
  readConfigFromLink,
  normalize,
  pickCode,
} from '../lib/share';

const PASSWORD = '1234';
const SAVE_KEY = 'edu-invite-admin-draft';
const UNLOCK_KEY = 'edu-invite-unlocked';

// 담기로 고른 것에 따라 단계가 늘었다 줄었다 한다
function buildSteps({ guideOn, certOn, receiptOn }) {
  const list = [
    { id: 'basic', label: '교육 이름' },
    { id: 'pick', label: '무엇을 담을까요' },
  ];
  if (guideOn) list.push({ id: 'guide', label: '교육안내(그룹챗)' });
  if (certOn) list.push({ id: 'cert', label: '수료증' }, { id: 'more', label: '추가 수료증' });
  if (receiptOn) list.push({ id: 'receipt', label: '거래명세서' });
  list.push({ id: 'link', label: '링크 만들기' });
  return list;
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState('');

  const [cfg, setCfg] = useState(emptyConfig());
  const [step, setStep] = useState('basic');
  const [certOn, setCertOn] = useState(false); // 수료증을 담을지
  const [editIdx, setEditIdx] = useState(0); // 지금 고치고 있는 수료증 번호
  const [draft, setDraft] = useState(emptyCert()); // 지금 고치고 있는 수료증 내용

  const [link, setLink] = useState('');
  const [longLink, setLongLink] = useState('');
  const [showLong, setShowLong] = useState(false);
  const [copyLabel, setCopyLabel] = useState('링크 복사하기');
  const [making, setMaking] = useState(false);
  const [loadText, setLoadText] = useState('');
  const [linkMode, setLinkMode] = useState('new'); // new = 새 링크, keep = 이미 보낸 링크에 반영
  const [keepLink, setKeepLink] = useState('');
  const [updated, setUpdated] = useState(false);

  // 이 컴퓨터에 임시로 저장해 둔 내용 불러오기
  useEffect(() => {
    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === 'y') setUnlocked(true);
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const got = normalize(JSON.parse(saved));
        setCfg(got);
        setCertOn(got.certs.length > 0);
      }
    } catch (err) {
      /* 저장된 게 없으면 그냥 새로 시작 */
    }
  }, []);

  // 적는 동안 자동으로 임시 저장 (실수로 창을 닫아도 남아 있게)
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(cfg));
    } catch (err) {
      /* 저장 공간이 없어도 화면은 계속 쓸 수 있게 넘어간다 */
    }
  }, [cfg]);

  const set = (path, value) => {
    setCfg((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let node = next;
      for (let i = 0; i < keys.length - 1; i += 1) node = node[keys[i]];
      node[keys[keys.length - 1]] = value;
      return next;
    });
    setLink('');
  };

  // ===== 단계 이동 =====
  const steps = buildSteps({
    guideOn: cfg.guide.on,
    certOn,
    receiptOn: cfg.receipt.on,
  });

  const goTo = (id) => {
    setStep(id);
    window.scrollTo({ top: 0 });
  };

  // 지금 단계 다음으로 (고른 것에 따라 건너뛴다)
  const goAfter = (id) => {
    const i = steps.findIndex((s) => s.id === id);
    const next = steps[i + 1];
    if (!next) return;
    if (next.id === 'cert') {
      if (cfg.certs.length) editCert(0);
      else startNewCert();
      return;
    }
    goTo(next.id);
  };

  // ===== 수료증 편집 =====
  const startNewCert = () => {
    const base = emptyCert();
    // 앞서 만든 수료증이 있으면 기간·디자인을 그대로 이어서 쓰기 편하게 채워 준다
    const last = cfg.certs[cfg.certs.length - 1];
    if (last) {
      base.design = last.design;
      base.start = last.start;
      base.end = last.end;
      base.award = last.award;
    }
    setDraft(base);
    setEditIdx(cfg.certs.length);
    setStep('cert');
  };

  const editCert = (i) => {
    setDraft({ ...cfg.certs[i] });
    setEditIdx(i);
    setStep('cert');
  };

  const removeCert = (i) => {
    if (!confirm('이 수료증을 뺄까요?')) return;
    set('certs', cfg.certs.filter((_, k) => k !== i));
  };

  const saveCert = () => {
    if (!draft.course.trim()) {
      alert('수료증에 들어갈 교육 과정명을 적어주세요.');
      return false;
    }
    if (!draft.start || !draft.end) {
      alert('교육 시작일과 종료일을 넣어주세요.');
      return false;
    }
    const list = [...cfg.certs];
    list[editIdx] = { ...draft };
    set('certs', list);
    return true;
  };

  // ===== 링크 만들기 =====
  const makeLink = async () => {
    if (!cfg.title.trim()) {
      alert('1단계에서 교육 이름을 적어주세요.');
      setStep('basic');
      return;
    }
    if (!cfg.guide.on && !cfg.certs.length && !cfg.receipt.on) {
      alert('교육안내 · 수료증 · 거래명세서 중 적어도 하나는 담아야 해요.');
      setStep('pick');
      return;
    }
    if (cfg.guide.on && !cfg.guide.chatUrl.trim()) {
      alert('교육안내를 담으셨는데 그룹챗방 주소가 비어 있어요.');
      setStep('guide');
      return;
    }

    const keep = linkMode === 'keep';
    const code = keep ? pickCode(keepLink) : '';
    if (keep && !code) {
      alert('그대로 쓸 링크를 붙여넣어 주세요. (예: https://.../g/abc123)');
      return;
    }
    if (
      keep &&
      !confirm(
        '이미 보낸 링크의 내용을 지금 적으신 내용으로 바꿉니다.\n그 링크를 받으신 분들은 새 내용을 보게 됩니다. 진행할까요?',
      )
    ) {
      return;
    }

    // 보관함이 안 될 때를 대비해 내용을 통째로 담은 긴 링크도 만들어 둔다
    const full = buildShareLink(cfg, window.location.origin);
    setLongLink(full);
    setShowLong(false);
    setMaking(true);

    try {
      const res = await fetch(`/api/save${code ? `?code=${encodeURIComponent(code)}` : ''}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error || '보관함 저장 실패');
      setLink(`${window.location.origin}/g/${data.code}`);
      setUpdated(Boolean(data.updated));
      if (data.updated) setKeepLink(`${window.location.origin}/g/${data.code}`);
    } catch (err) {
      if (keep) {
        alert('기존 링크에 반영하지 못했어요.\n' + err.message);
      } else {
        setLink(full);
        setUpdated(false);
        alert('짧은 주소를 만들지 못해 긴 링크로 대신 만들었어요. 그래도 링크는 정상으로 열립니다.');
      }
    } finally {
      setMaking(false);
    }
  };

  const copy = async (text, done) => {
    try {
      await navigator.clipboard.writeText(text);
      done();
    } catch (err) {
      alert('복사가 안 됐어요. 링크 글자를 직접 길게 눌러 복사해주세요.');
    }
  };

  // 예전 링크에서 내용 불러오기
  const loadFromLink = async () => {
    const text = loadText.trim();
    if (!text) {
      alert('예전에 만든 링크를 붙여넣어 주세요.');
      return;
    }
    const code = pickCode(text);
    if (code) {
      try {
        const res = await fetch(`/api/load?c=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '불러오지 못했어요.');
        const got = normalize(data.config);
        setCfg(got);
        setCertOn(got.certs.length > 0);
        setLink('');
        setLinkMode('keep');
        setKeepLink(`${window.location.origin}/g/${code}`);
        alert('불러왔어요. 내용을 고치신 뒤 링크를 다시 만들어 주세요.');
        setStep('basic');
        return;
      } catch (err) {
        alert(err.message);
        return;
      }
    }
    const got = readConfigFromLink(text);
    if (!got) {
      alert('링크에서 내용을 읽지 못했어요. 주소 전체를 붙여넣었는지 확인해주세요.');
      return;
    }
    setCfg(got);
    setCertOn(got.certs.length > 0);
    setLink('');
    setLinkMode('new');
    alert('불러왔어요. 내용을 고치신 뒤 링크를 다시 만들어 주세요.');
    setStep('basic');
  };

  // ===== 잠금 화면 =====
  if (!unlocked) {
    return (
      <div className="admin">
        <div className="admin-head">
          <Mascot name="family" alt="우리아이들 캐릭터" />
          <h1>교육안내 · 서류 발급 관리자</h1>
          <p>비밀번호를 넣어주세요.</p>
        </div>
        <div className="section">
          <div className="field">
            <label>비밀번호</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                if (pw === PASSWORD) {
                  setUnlocked(true);
                  sessionStorage.setItem(UNLOCK_KEY, 'y');
                } else alert('비밀번호가 달라요.');
              }}
              placeholder="••••"
            />
          </div>
          <button
            className="btn"
            onClick={() => {
              if (pw === PASSWORD) {
                setUnlocked(true);
                sessionStorage.setItem(UNLOCK_KEY, 'y');
              } else alert('비밀번호가 달라요.');
            }}
          >
            들어가기
          </button>
        </div>
      </div>
    );
  }

  const stepNo = steps.findIndex((s) => s.id === step) + 1;
  const previewCert = {
    graduateName: '',
    affiliation: '',
    periodText:
      draft.start && draft.end ? `${fmtCertDate(draft.start)} ~ ${fmtCertDate(draft.end)}` : '',
    courseText: draft.course || cfg.title || '○○○○',
    awardText: fmtKoreanDate(draft.award || draft.end || todayIso()),
  };

  return (
    <div className="admin">
      <div className="admin-head">
        <Mascot name="family" alt="우리아이들 캐릭터" />
        <h1>교육안내 · 수료증 · 거래명세서 만들기</h1>
        <p>순서대로 따라가시면 보내드릴 링크가 나와요.</p>
      </div>

      {/* 진행 막대 */}
      <div className="wizard-bar">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`wizard-chip ${s.id === step ? 'on' : ''} ${i < stepNo - 1 ? 'done' : ''}`}
            onClick={() => {
              if (s.id === 'cert') {
                if (cfg.certs.length) editCert(0);
                else startNewCert();
              } else goTo(s.id);
            }}
          >
            <b>{i + 1}</b> {s.label}
          </button>
        ))}
      </div>

      {/* ===== 1단계. 교육 이름 ===== */}
      {step === 'basic' && (
        <div className="section">
          <div className="section-title">1. 어떤 교육인가요?</div>
          <p className="section-desc">
            받는 분 화면의 제목이 되고, 다른 칸을 비우면 이 이름이 대신 쓰여요.
          </p>
          <div className="field">
            <label>
              교육 이름 <span className="req">*</span>
            </label>
            <input
              value={cfg.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="예) 2026년 8월 부모교육 · ○○어린이집"
            />
          </div>
          <div className="field">
            <label>서류 화면 첫 인사 한 줄 (선택)</label>
            <input
              value={cfg.intro.heading}
              onChange={(e) => set('intro.heading', e.target.value)}
              placeholder="예) 교육을 마치신 것을 축하드립니다"
            />
          </div>
          <div className="field">
            <label>서류 화면 안내글 (선택)</label>
            <textarea
              rows={4}
              value={cfg.intro.body}
              onChange={(e) => set('intro.body', e.target.value)}
              placeholder="필요한 서류를 골라 바로 받으실 수 있습니다."
            />
            <p className="hint">
              이 두 칸은 <b>수료증·거래명세서 화면의 첫 인사</b>예요. 교육안내(그룹챗)를 함께
              담으시면 이 인사 화면은 건너뛰고 바로 서류 고르기로 넘어갑니다.
            </p>
          </div>

          <button
            className="btn"
            onClick={() => {
              if (!cfg.title.trim()) {
                alert('교육 이름을 적어주세요.');
                return;
              }
              goTo('pick');
            }}
          >
            다음 (무엇을 담을지 고르기) →
          </button>

          <div className="divider" />
          <div className="section-desc" style={{ marginBottom: 6 }}>
            예전에 만든 링크를 고치실 건가요?
          </div>
          <div className="field">
            <input
              value={loadText}
              onChange={(e) => setLoadText(e.target.value)}
              placeholder="예전 링크 붙여넣기"
            />
          </div>
          <button className="btn ghost" onClick={loadFromLink}>
            링크에서 내용 불러오기
          </button>
        </div>
      )}

      {/* ===== 2단계. 무엇을 담을까요 ===== */}
      {step === 'pick' && (
        <div className="section">
          <div className="section-title">2. 이 링크에 무엇을 담을까요?</div>
          <p className="section-desc">
            눌러서 켜고 끄시면 돼요. 하나만 골라도 되고, 셋 다 골라도 됩니다.
          </p>

          <div className="choices">
            <button
              type="button"
              className={`choice ${cfg.guide.on ? 'on' : ''}`}
              onClick={() => set('guide.on', !cfg.guide.on)}
            >
              <span className="mark">✓</span>
              <span>
                <span className="choice-main">① 교육안내 · 그룹챗방 입장</span>
                <span className="choice-sub">
                  신청자 확인 → 그룹챗방 입장 안내 (교육 전에 보내는 안내)
                </span>
              </span>
            </button>

            <button
              type="button"
              className={`choice ${certOn ? 'on' : ''}`}
              onClick={() => {
                if (certOn && cfg.certs.length) {
                  if (!confirm('수료증을 빼면 지금까지 만드신 수료증 내용도 지워져요. 뺄까요?')) return;
                  set('certs', []);
                }
                setCertOn(!certOn);
              }}
            >
              <span className="mark">✓</span>
              <span>
                <span className="choice-main">② 수료증</span>
                <span className="choice-sub">디자인 8종 중에 고르기 · 한 교육에 여러 장 가능</span>
              </span>
            </button>

            <button
              type="button"
              className={`choice ${cfg.receipt.on ? 'on' : ''}`}
              onClick={() => set('receipt.on', !cfg.receipt.on)}
            >
              <span className="mark">✓</span>
              <span>
                <span className="choice-main">③ 거래명세서</span>
                <span className="choice-sub">사업자등록증이 2쪽에 자동으로 붙어요</span>
              </span>
            </button>
          </div>

          <button
            className="btn ghost mt14"
            onClick={() => {
              setCfg((prev) => {
                const next = JSON.parse(JSON.stringify(prev));
                next.guide.on = true;
                next.receipt.on = true;
                return next;
              });
              setCertOn(true);
              setLink('');
            }}
          >
            ⭐ 세 가지 모두 담기
          </button>

          <button
            className="btn mt8"
            onClick={() => {
              if (!cfg.guide.on && !certOn && !cfg.receipt.on) {
                alert('적어도 하나는 골라주세요.');
                return;
              }
              goAfter('pick');
            }}
          >
            다음 →
          </button>
        </div>
      )}

      {/* ===== 교육안내(그룹챗) 단계 ===== */}
      {step === 'guide' && (
        <div className="section">
          <div className="section-title">교육안내 · 그룹챗방 입장</div>
          <p className="section-desc">
            받는 분은 <b>“교육과정 신청자가 맞습니까?”</b> → <b>“네!”</b> → <b>그룹챗방 입장</b>{' '}
            순서로 보게 됩니다.
          </p>

          <div className="field">
            <label>
              안내 화면에 보일 교육명 <span className="req">*</span>
            </label>
            <input
              value={cfg.guide.course}
              onChange={(e) => set('guide.course', e.target.value)}
              placeholder={cfg.title || '예) 영유아 AI 융합 지도자 과정'}
            />
            <p className="hint">비우면 1단계에서 적으신 교육 이름이 그대로 들어가요.</p>
          </div>

          <div className="field">
            <label>안내글 (선택)</label>
            <textarea
              rows={5}
              value={cfg.guide.body}
              onChange={(e) => set('guide.body', e.target.value)}
              placeholder={'예) 교육 일시 : 2026년 9월 3일(목) 저녁 8시\n장소 : 줌(ZOOM) 온라인\n준비물 : 노트북 또는 스마트폰\n\n궁금한 점은 그룹챗방에 남겨주세요!'}
            />
            <p className="hint">줄을 바꿔 적으시면 그대로 보여요. 주소를 적으면 눌러서 열립니다.</p>
          </div>

          <div className="field">
            <label>
              그룹챗방 주소 <span className="req">*</span>
            </label>
            <input
              value={cfg.guide.chatUrl}
              onChange={(e) => set('guide.chatUrl', e.target.value)}
              placeholder="예) https://open.kakao.com/o/gXXXXXX"
            />
            <p className="hint">
              카톡 오픈채팅방에서 <b>‘채팅방 공유 → 링크 복사’</b> 한 주소를 그대로 붙여넣으시면
              돼요.
            </p>
          </div>

          <div className="field">
            <label>입장 단추 글자 (선택)</label>
            <input
              value={cfg.guide.chatLabel}
              onChange={(e) => set('guide.chatLabel', e.target.value)}
              placeholder="비우면 : 💬 그룹챗방 입장하기"
            />
          </div>

          <button
            className="btn"
            onClick={() => {
              if (!cfg.guide.chatUrl.trim()) {
                alert('그룹챗방 주소를 넣어주세요.');
                return;
              }
              goAfter('guide');
            }}
          >
            다음 →
          </button>
        </div>
      )}

      {/* ===== 2단계. 수료증 ===== */}
      {step === 'cert' && (
        <>
          <div className="section">
            <div className="section-title">
              수료증 디자인 고르기{cfg.certs.length > 1 || editIdx > 0 ? ` (${editIdx + 1}번째)` : ''}
            </div>
            <p className="section-desc">마음에 드는 그림을 눌러주세요.</p>

            <div className="design-grid">
              {CERT_DESIGNS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`design-card ${draft.design === d.id ? 'on' : ''}`}
                  onClick={() => setDraft({ ...draft, design: d.id })}
                >
                  <span className="design-thumb">
                    <img src={d.bg} alt={d.name} />
                  </span>
                  <span className="design-name">{d.name}</span>
                  <span className="design-desc">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="section-title">수료증에 들어갈 내용</div>
            <div className="field">
              <label>
                교육 과정명 <span className="req">*</span>
              </label>
              <input
                value={draft.course}
                onChange={(e) => setDraft({ ...draft, course: e.target.value })}
                placeholder="예) 영유아 AI 융합 지도자 과정"
              />
              <p className="hint">수료증에 “귀하는 ○○ 교육과정을…” 으로 들어가요.</p>
            </div>
            <div className="field-row">
              <div className="field">
                <label>
                  교육 시작일 <span className="req">*</span>
                </label>
                <input
                  type="date"
                  value={draft.start}
                  onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                />
              </div>
              <div className="field">
                <label>
                  교육 종료일 <span className="req">*</span>
                </label>
                <input
                  type="date"
                  value={draft.end}
                  onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>받는 분 화면에서 부를 이름 (선택)</label>
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="예) 기본과정 수료증 (비우면 과정명을 씁니다)"
              />
            </div>

            <button
              className="btn"
              onClick={() => {
                if (saveCert()) goTo('more');
              }}
            >
              이 수료증 저장하고 다음 →
            </button>
            <button className="btn ghost mt8" onClick={() => goAfter('more')}>
              수료증은 건너뛰기
            </button>

            <div className="divider" />
            <div className="section-desc">👀 미리보기</div>
            <div className="doc-frame">
              <FitBox width={CERT_W} height={CERT_H}>
                <CertDoc data={previewCert} designId={draft.design} />
              </FitBox>
            </div>
          </div>
        </>
      )}

      {/* ===== 3단계. 추가 수료증 ===== */}
      {step === 'more' && (
        <div className="section">
          <div className="section-title">더 만들 수료증이 있나요?</div>
          <p className="section-desc">
            한 교육에서 이름이 다른 수료증을 여러 장 드릴 수 있어요. (예: 기본과정 + 심화과정)
          </p>

          <div className="madelist">
            {cfg.certs.map((c, i) => (
              <div className="made" key={i}>
                <span className="made-thumb">
                  <img src={(CERT_DESIGNS.find((d) => d.id === c.design) || CERT_DESIGNS[0]).bg} alt="" />
                </span>
                <span className="made-main">
                  <b>{c.label || c.course}</b>
                  <span>
                    {c.start && c.end ? `${fmtCertDate(c.start)} ~ ${fmtCertDate(c.end)}` : ''}
                  </span>
                </span>
                <button type="button" className="mini" onClick={() => editCert(i)}>
                  고치기
                </button>
                <button type="button" className="mini danger" onClick={() => removeCert(i)}>
                  빼기
                </button>
              </div>
            ))}
            {!cfg.certs.length && <p className="section-desc">아직 만든 수료증이 없어요.</p>}
          </div>

          <button className="btn ghost" onClick={startNewCert}>
            ＋ 수료증 하나 더 만들기
          </button>
          <button className="btn mt8" onClick={() => goAfter('more')}>
            더 없어요 · 다음 →
          </button>
        </div>
      )}

      {/* ===== 4단계. 거래명세서 ===== */}
      {step === 'receipt' && (
        <div className="section">
          <div className="section-title">거래명세서</div>
          <p className="section-desc">
            받는 분이 어린이집 이름·대표자·금액을 넣으면 사업자등록증이 붙은 2장짜리 PDF가 나와요.
          </p>

          {cfg.receipt.on && (
            <div className="mt14">
              <div className="field">
                <label>거래명세서에 적을 교육(품목) 이름</label>
                <input
                  value={cfg.receipt.course}
                  onChange={(e) => set('receipt.course', e.target.value)}
                  placeholder={cfg.title || '예) 2026년 8월 부모교육'}
                />
                <p className="hint">비우면 1단계의 교육 이름이 그대로 들어가요.</p>
              </div>
              <div className="field">
                <label>기본 금액 (선택)</label>
                <input
                  type="number"
                  value={cfg.receipt.fee}
                  onChange={(e) => set('receipt.fee', e.target.value)}
                  placeholder="300000"
                />
                <p className="hint">미리 채워 두면 받는 분이 고칠 수 있어요.</p>
              </div>
            </div>
          )}

          <button className="btn" onClick={() => goAfter('receipt')}>
            다음 (링크 만들기) →
          </button>
        </div>
      )}

      {/* ===== 5단계. 링크 만들기 ===== */}
      {step === 'link' && (
        <>
          <div className="section">
            <div className="section-title">전달 링크 만들기</div>

            <div className="summary">
              <div>
                <b>교육</b> {cfg.title || '(비어 있음)'}
              </div>
              <div>
                <b>교육안내</b>{' '}
                {cfg.guide.on
                  ? `그룹챗 입장 안내 드림${cfg.guide.chatUrl ? '' : ' (주소 비어 있음!)'}`
                  : '없음'}
              </div>
              <div>
                <b>수료증</b>{' '}
                {cfg.certs.length
                  ? cfg.certs.map((c, i) => c.label || c.course || `수료증 ${i + 1}`).join(' · ')
                  : '없음'}
              </div>
              <div>
                <b>거래명세서</b> {cfg.receipt.on ? '드림' : '안 드림'}
              </div>
            </div>

            <div className="choices mt14">
              <button
                type="button"
                className={`choice ${linkMode === 'new' ? 'on' : ''}`}
                onClick={() => setLinkMode('new')}
              >
                <span className="mark">✓</span>
                <span>
                  <span className="choice-main">새 링크 만들기</span>
                  <span className="choice-sub">이번 교육용 주소를 새로 뽑아요</span>
                </span>
              </button>
              <button
                type="button"
                className={`choice ${linkMode === 'keep' ? 'on' : ''}`}
                onClick={() => setLinkMode('keep')}
              >
                <span className="mark">✓</span>
                <span>
                  <span className="choice-main">이미 보낸 링크에 그대로 반영하기</span>
                  <span className="choice-sub">주소는 그대로 두고 내용만 바꿔요</span>
                </span>
              </button>
            </div>

            {linkMode === 'keep' && (
              <div className="field mt14">
                <label>그대로 쓸 링크</label>
                <input
                  value={keepLink}
                  onChange={(e) => setKeepLink(e.target.value)}
                  placeholder="https://.../g/abc123"
                />
              </div>
            )}

            <button className="btn big" onClick={makeLink} disabled={making}>
              {making ? '만드는 중이에요...' : '링크 만들기'}
            </button>
          </div>

          {link && (
            <div className="section">
              <div className="section-title">
                {updated ? '✅ 이미 보낸 링크에 반영했어요' : '✅ 링크가 만들어졌어요'}
              </div>
              <p className="section-desc">아래 주소를 복사해서 카톡으로 보내시면 돼요.</p>
              <div className="linkbox">{link}</div>
              <button
                className="btn"
                onClick={() =>
                  copy(link, () => {
                    setCopyLabel('복사됐어요!');
                    setTimeout(() => setCopyLabel('링크 복사하기'), 1600);
                  })
                }
              >
                {copyLabel}
              </button>
              <a className="btn ghost mt8" href={link} target="_blank" rel="noreferrer">
                링크 열어서 확인하기
              </a>

              {longLink && (
                <>
                  <div className="divider" />
                  <button className="btn ghost" onClick={() => setShowLong(!showLong)}>
                    {showLong ? '긴 링크 숨기기' : '긴 링크도 보기 (예비용)'}
                  </button>
                  {showLong && (
                    <>
                      <div className="linkbox small mt8">{longLink}</div>
                      <button
                        className="btn ghost mt8"
                        onClick={() => copy(longLink, () => alert('긴 링크를 복사했어요.'))}
                      >
                        긴 링크 복사하기
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
