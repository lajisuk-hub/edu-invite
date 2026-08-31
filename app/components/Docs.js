'use client';

// 받는 분에게 보여 주는 화면 본체.
// 내용(cfg)은 두 곳에서 올 수 있다.
//  - 홈(/?d=...)      : 링크 주소 안에 담겨 온 것
//  - 짧은 주소(/g/번호) : 연구소 보관함에서 꺼내 온 것
// 어느 쪽이든 여기서는 똑같이 그린다.

import { useEffect, useMemo, useRef, useState } from 'react';
import Mascot from './Mascot';
import FitBox from './FitBox';
import ReceiptDoc from './ReceiptDoc';
import CertDoc from './CertDoc';
import Linkify from './Linkify';
import { getDesign, CERT_W, CERT_H } from '../lib/certDesigns';
import { SUPPLIER_INFO } from '../lib/supplier';
import {
  saveBundlePdf,
  fmtCertDate,
  fmtKoreanDate,
  todayIso,
} from '../lib/pdf';
import { pickChatUrl } from '../lib/share';

export default function Docs({ cfg }) {
  const [stepIdx, setStepIdx] = useState(0);

  // 교육 전 안내에서 "서류 안내로 이동하시겠습니까?" 에 답한 값
  const [goDocs, setGoDocs] = useState(null); // null = 아직 안 고름 | true = 네 | false = 아니요

  // 필요한 서류 고르기
  const [wantReceipt, setWantReceipt] = useState(false);
  const [wantCert, setWantCert] = useState(false);
  const [answered, setAnswered] = useState(false);

  // 거래명세서 입력
  const [bizName, setBizName] = useState('');
  const [bizCeo, setBizCeo] = useState('');
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState('');

  // 수료증 입력
  const [gradName, setGradName] = useState('');
  const [gradOrg, setGradOrg] = useState('');
  const [pick, setPick] = useState(0);           // 지금 보고 있는 수료증

  // 한꺼번에 받기
  const [bundleOn, setBundleOn] = useState([]);   // 묶음에 넣을 수료증 (기본: 전부)
  const [receiptOn, setReceiptOn] = useState(true); // 묶음에 거래명세서를 넣을지
  const [bundleBusy, setBundleBusy] = useState(false);
  const [bundleDone, setBundleDone] = useState(false);
  const [bundleFile, setBundleFile] = useState(null); // 만든 파일 (직접 누르는 저장 단추용)

  const receiptRef = useRef(null);
  const certRefs = useRef([]);

  const certs = cfg ? cfg.certs : [];
  const hasCert = certs.length > 0;
  const hasReceipt = Boolean(cfg && cfg.receipt.on);
  const hasGuide = Boolean(cfg && cfg.guide && cfg.guide.on);   // 교육 전 안내(그룹챗)를 넣었는지
  const hasDocs = hasCert || hasReceipt;                        // 교육 후 서류가 있는지

  // 안내 화면에 보일 교육명 (비워두면 교육 이름을 쓴다)
  const guideCourse = (cfg && cfg.guide && cfg.guide.course) || (cfg ? cfg.title : '');
  // 'open.kakao.com/...' 처럼 https:// 없이 적으셔도, 문자 내용을 통째로 붙여넣으셨어도
  // 그 안의 진짜 방 주소만 뽑아서 연다
  const chatHref = pickChatUrl(cfg && cfg.guide && cfg.guide.chatUrl);

  // ===== 첫 값 채우기 =====
  useEffect(() => {
    if (cfg && cfg.receipt.fee) setAmount(String(cfg.receipt.fee));
    setPayDate(todayIso());
    setBundleOn((cfg ? cfg.certs : []).map(() => true));
  }, [cfg]);

  // ===== 단계 목록 만들기 (있는 것만) =====
  const steps = useMemo(() => {
    if (!cfg) return [];
    const list = [];

    // (1) 교육 전 안내 — 신청자 확인 → 그룹챗방 입장 → (서류 안내로 갈까요?)
    if (hasGuide) {
      list.push('confirm', 'chat');
      if (hasDocs) list.push('bridge');
    }

    // (2) 교육 후 서류 — 안내만 있는 링크에서 "아니요"를 고르시면 건너뛴다
    const showDocs = hasDocs && (!hasGuide || goDocs === true);
    if (showDocs) {
      if (!hasGuide) list.push('intro'); // 안내가 앞에 있으면 소개 화면은 건너뛴다
      list.push('ask');
      if (wantCert && hasCert) list.push('cert');
      if (wantReceipt && hasReceipt) list.push('receipt');
      // 서류를 하나라도 고르셨으면 마지막에 "골라서 한꺼번에 받기" 단계를 넣는다
      if ((wantCert && hasCert) || (wantReceipt && hasReceipt)) list.push('bundle');
    }

    if (!list.length) list.push('intro'); // 아무것도 없는 링크라도 화면이 비지 않게
    list.push('outro');
    return list;
  }, [cfg, hasGuide, hasDocs, hasCert, hasReceipt, wantCert, wantReceipt, goDocs]);

  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx >= steps.length - 1;

  const goNext = () => {
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    window.scrollTo({ top: 0 });
  };
  const goBack = () => {
    setStepIdx((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0 });
  };

  // ===== 수료증 한 장에 들어갈 값 =====
  const certDataOf = (c) => {
    const period =
      c.start && c.end ? `${fmtCertDate(c.start)} ~ ${fmtCertDate(c.end)}` : '';
    const award = c.award || c.end || todayIso();
    return {
      graduateName: gradName,
      affiliation: gradOrg,
      periodText: period,
      courseText: c.course || (cfg ? cfg.title : ''),
      awardText: fmtKoreanDate(award),
    };
  };

  const certLabel = (c, i) => c.label || c.course || `수료증 ${i + 1}`;

  // ===== 거래명세서에 들어갈 값 =====
  const receiptData = {
    courseName: cfg ? cfg.receipt.course || cfg.title : '',
    customerName: bizName,
    customerCEO: bizCeo,
    quantity: qty,
    amount,
    issueDate: fmtKoreanDate(todayIso()),
    payDateKr: payDate ? fmtKoreanDate(payDate) : '____년 __월 __일',
  };

  // ===== 마지막 화면에서 고른 것만 한 파일로 받기 =====
  // (앞 화면들은 눈으로 확인만 하고, 저장은 여기 한 곳에서만 한다)
  const bundleIdx = wantCert && hasCert ? certs.map((c, i) => i).filter((i) => bundleOn[i]) : [];
  const takeReceipt = wantReceipt && hasReceipt && receiptOn;
  // 거래명세서를 고르면 사업자등록증이 반드시 함께 붙는다
  const bundlePages = bundleIdx.length + (takeReceipt ? 2 : 0);

  // 파일 이름: 영유아교육디자인연구소_교육과정명_받은날짜.pdf
  const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]/g, '').trim();
  const courseName =
    safe(cfg && cfg.title) ||
    safe(cfg && cfg.receipt.course) ||
    safe(certs[0] && certs[0].course) ||
    '교육';
  const bundleFileName = `${safe(SUPPLIER_INFO.name)}_${courseName}_${todayIso().replace(/-/g, '')}.pdf`;

  const onSaveBundle = async () => {
    if (bundlePages === 0) {
      alert('받으실 서류를 하나 이상 골라주세요.');
      return;
    }
    if (bundleIdx.length > 0 && !gradName.trim()) {
      alert('수료자 성명이 비어 있어요. 아래 ← 이전 을 눌러 수료증 화면에서 이름을 넣어주세요.');
      return;
    }
    if (takeReceipt && (!bizName || !bizCeo || !amount)) {
      alert(
        '거래명세서에 들어갈 어린이집 상호·대표자명·결제금액이 비어 있어요.\n아래 ← 이전 을 눌러 채워주세요.',
      );
      return;
    }
    setBundleBusy(true);
    try {
      const made = await saveBundlePdf({
        certEls: bundleIdx.map((i) => certRefs.current[i]),
        receiptEl: takeReceipt ? receiptRef.current : null,
        fileName: bundleFileName,
      });
      setBundleFile(made);
      setBundleDone(true);
    } catch (err) {
      alert('PDF를 만드는 중 문제가 생겼어요: ' + err.message);
    } finally {
      setBundleBusy(false);
    }
  };

  if (!cfg) return null;

  const totalSteps = steps.length;
  const pct = Math.round(((stepIdx + 1) / totalSteps) * 100);
  const cur = certs[Math.min(pick, Math.max(certs.length - 1, 0))];

  return (
    <>
      <div className="stage">
        <div className="brandbar">
          <span className="logo-u">U</span>
          <span>우리아이들 · 영유아교육디자인연구소</span>
        </div>

        <div className="progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-text">
            <span>{cfg.title || '서류 발급'}</span>
            <span>
              <b>{stepIdx + 1}</b> / {totalSteps}
            </span>
          </div>
        </div>

        {/* ===== 0-1. 신청자 확인 (교육 전 안내) ===== */}
        {step === 'confirm' && (
          <div className="card center">
            <Mascot name="girl" className="mascot-hero" style={{ width: 108 }} alt="사랑이" />
            <div className="speech">안녕하세요! 반갑습니다 :)</div>
            <div className="step-title">교육과정 신청자가 맞습니까?</div>
            {guideCourse && (
              <div className="notice green mt14">
                <strong>{guideCourse}</strong>
              </div>
            )}
            <button className="btn big mt20" onClick={goNext}>
              네! 맞아요
            </button>
            <p className="step-sub mt8">신청하신 분이 아니라면 이 창을 닫아 주세요.</p>
          </div>
        )}

        {/* ===== 0-2. 그룹챗방 입장 안내 ===== */}
        {step === 'chat' && (
          <div className="card">
            <div className="center">
              <Mascot name="family" className="mascot-hero" alt="우리아이들 캐릭터 친구들" />
            </div>
            <div className="step-kicker">💬 그룹챗방 안내</div>
            <div className="step-title">교육과정 참여를 위한 그룹챗방 안내드릴게요</div>
            {guideCourse && <p className="step-sub mt8">{guideCourse}</p>}

            {cfg.guide.body && (
              <>
                <div className="divider" />
                <p className="body-text">
                  <Linkify text={cfg.guide.body} />
                </p>
              </>
            )}

            {chatHref ? (
              <a className="btn green big mt20" href={chatHref} target="_blank" rel="noreferrer">
                {cfg.guide.chatLabel || '💬 그룹챗방 입장하기'}
              </a>
            ) : (
              <div className="notice mt20">
                그룹챗방 주소가 아직 등록되지 않았어요. 보내주신 분께 문의해 주세요.
              </div>
            )}

            <div className="notice blue mt14">
              입장하신 뒤에는 <strong>이 화면으로 다시 돌아와</strong> 아래 <strong>다음 →</strong>{' '}
              을 눌러주세요.
            </div>
          </div>
        )}

        {/* ===== 0-3. 서류 안내로 갈까요? ===== */}
        {step === 'bridge' && (
          <div className="card center">
            <Mascot name="book" className="mascot-hero" style={{ width: 108 }} alt="책 든 친구" />
            <div className="step-kicker">📄 다음 안내</div>
            <div className="step-title">교육 이후 수료증과 거래명세서 출력 안내입니다</div>
            <p className="step-sub mt8">이동하시겠습니까?</p>

            <button
              className="btn big mt20"
              onClick={() => {
                setGoDocs(true);
                goNext();
              }}
            >
              네, 보러 갈게요 →
            </button>
            <button
              className="btn ghost mt8"
              onClick={() => {
                setGoDocs(false);
                goNext();
              }}
            >
              아니요, 마무리할게요
            </button>

            <p className="step-sub mt14">
              지금 안 보셔도 괜찮아요. 교육이 끝난 뒤 이 링크로 다시 들어오시면 됩니다.
            </p>
          </div>
        )}

        {/* ===== 1. 소개 ===== */}
        {step === 'intro' && (
          <div className="card center">
            <Mascot name="family" className="mascot-hero" alt="우리아이들 캐릭터 친구들" />
            <div className="speech">교육을 마치신 것을 축하드려요 🎉</div>
            <div className="step-title">{cfg.title || '수료증 · 거래명세서'}</div>
            {cfg.intro.heading && <p className="step-sub mt8">{cfg.intro.heading}</p>}
            {cfg.intro.body && (
              <>
                <div className="divider" />
                <p className="body-text">
                  <Linkify text={cfg.intro.body} />
                </p>
              </>
            )}
            <div className="notice mt20">
              아래 <strong>시작하기</strong>를 누르면 한 장씩 넘어가요.
              {'\n'}필요한 서류를 골라 바로 PDF로 받으실 수 있어요.
            </div>
          </div>
        )}

        {/* ===== 2. 필요한 서류 고르기 ===== */}
        {step === 'ask' && (
          <div className="card">
            <div className="center">
              <Mascot name="girl" className="mascot-hero" style={{ width: 104 }} alt="사랑이" />
            </div>
            <div className="step-kicker">📄 서류 확인</div>
            <div className="step-title">어떤 서류가 필요하신가요?</div>
            <p className="step-sub">필요한 것만 골라주세요. 여러 개 골라도 됩니다.</p>

            <div className="choices">
              {hasCert && (
                <button
                  type="button"
                  className={`choice ${wantCert ? 'on' : ''}`}
                  onClick={() => {
                    setWantCert(!wantCert);
                    setAnswered(true);
                  }}
                >
                  <span className="mark">✓</span>
                  <span>
                    <span className="choice-main">수료증이 필요해요</span>
                    <span className="choice-sub">
                      {certs.length > 1
                        ? `${certs.length}종류를 받으실 수 있어요`
                        : '교육 이수 확인용 (이름별로 여러 장 가능)'}
                    </span>
                  </span>
                </button>
              )}
              {hasReceipt && (
                <button
                  type="button"
                  className={`choice ${wantReceipt ? 'on' : ''}`}
                  onClick={() => {
                    setWantReceipt(!wantReceipt);
                    setAnswered(true);
                  }}
                >
                  <span className="mark">✓</span>
                  <span>
                    <span className="choice-main">거래명세서가 필요해요</span>
                    <span className="choice-sub">교육비 결제 증빙용 (사업자등록증 함께 첨부)</span>
                  </span>
                </button>
              )}
              <button
                type="button"
                className={`choice ${answered && !wantReceipt && !wantCert ? 'on' : ''}`}
                onClick={() => {
                  setWantReceipt(false);
                  setWantCert(false);
                  setAnswered(true);
                }}
              >
                <span className="mark">✓</span>
                <span>
                  <span className="choice-main">지금은 필요 없어요</span>
                  <span className="choice-sub">바로 마무리 화면으로 넘어갈게요</span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ===== 3. 수료증 ===== */}
        {step === 'cert' && cur && (
          <div className="card">
            <div className="step-kicker">🎓 수료증</div>
            <div className="step-title">수료증 확인하기</div>
            <p className="step-sub">이름을 넣고 아래 미리보기로 확인해 주세요.</p>

            <div className="mt14">
              <div className="field">
                <label>
                  수료자 성명 <span className="req">*</span>
                </label>
                <input
                  value={gradName}
                  onChange={(e) => setGradName(e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              <div className="field">
                <label>소속 (어린이집명)</label>
                <input
                  value={gradOrg}
                  onChange={(e) => setGradOrg(e.target.value)}
                  placeholder="○○어린이집"
                />
              </div>
            </div>

            {certs.length > 1 && (
              <>
                <div className="divider" />
                <div className="step-sub" style={{ marginBottom: 8 }}>
                  미리 볼 수료증을 골라주세요 ({certs.length}종류)
                </div>
                <div className="pick-row">
                  {certs.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`pick ${i === pick ? 'on' : ''}`}
                      onClick={() => setPick(i)}
                    >
                      {certLabel(c, i)}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="notice green mt14">
              <strong>{cur.course || cfg.title}</strong>
              {cur.start && cur.end
                ? `\n교육기간 ${fmtCertDate(cur.start)} ~ ${fmtCertDate(cur.end)}`
                : ''}
            </div>

            <div className="notice blue mt14">
              여기서는 <strong>눈으로 확인만</strong> 하시면 돼요.
              {'\n'}저장(다운로드)은 <strong>마지막 화면</strong>에서 필요한 서류를 골라 한 번에
              해드려요.
            </div>

            <div className="divider" />
            <div className="step-sub">👀 미리보기 — 이대로 만들어져요</div>
            <div className="doc-frame">
              <FitBox width={CERT_W} height={CERT_H}>
                <CertDoc data={certDataOf(cur)} designId={cur.design} />
              </FitBox>
            </div>
          </div>
        )}

        {/* ===== 4. 거래명세서 ===== */}
        {step === 'receipt' && (
          <div className="card">
            <div className="step-kicker">🧾 거래명세서</div>
            <div className="step-title">거래명세서 확인하기</div>
            <p className="step-sub">아래 내용을 채우고 미리보기로 확인해 주세요.</p>

            <div className="mt14">
              <div className="field">
                <label>
                  어린이집(상호) <span className="req">*</span>
                </label>
                <input
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="○○어린이집"
                />
              </div>
              <div className="field">
                <label>
                  대표자명 <span className="req">*</span>
                </label>
                <input
                  value={bizCeo}
                  onChange={(e) => setBizCeo(e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>
                    수량 <span className="req">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>
                    결제금액(원) <span className="req">*</span>
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="300000"
                  />
                </div>
              </div>
              <div className="field">
                <label>
                  결제일 <span className="req">*</span>
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
            </div>

            <div className="notice blue mt14">
              📎 거래명세서에는 <strong>사업자등록증이 반드시 함께</strong> 붙어요 (2쪽).
              {'\n'}저장(다운로드)은 <strong>마지막 화면</strong>에서 한 번에 해드려요.
            </div>

            <div className="divider" />
            <div className="step-sub">👀 미리보기 — 이대로 만들어져요</div>
            <div className="doc-frame">
              <FitBox width={700} height={660}>
                <ReceiptDoc data={receiptData} />
              </FitBox>
            </div>
          </div>
        )}

        {/* ===== 5. 한 파일로 한꺼번에 받기 ===== */}
        {step === 'bundle' && (
          <div className="card">
            <div className="step-kicker">📦 서류 받기</div>
            <div className="step-title">받으실 서류를 골라주세요</div>
            <p className="step-sub">
              고른 서류를 <strong>PDF 한 개</strong>로 묶어서 한 번에 저장해 드려요.
            </p>

            {bundleDone && <div className="done-mark mt14">✅ 저장했어요!</div>}

            <div className="divider" />
            <div className="step-sub" style={{ marginBottom: 8 }}>
              눌러서 켜고 끄시면 돼요
            </div>
            <div className="pick-row">
              {wantCert &&
                hasCert &&
                certs.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`pick ${bundleOn[i] ? 'on' : ''}`}
                    onClick={() => {
                      // 고른 것이 바뀌면 앞서 만든 파일은 지운다 (헷갈리지 않게)
                      setBundleFile(null);
                      setBundleDone(false);
                      setBundleOn((prev) => {
                        const next = [...prev];
                        next[i] = !next[i];
                        return next;
                      });
                    }}
                  >
                    {bundleOn[i] ? '✓ ' : ''}
                    {certLabel(c, i)}
                  </button>
                ))}
              {wantReceipt && hasReceipt && (
                <button
                  type="button"
                  className={`pick ${receiptOn ? 'on' : ''}`}
                  onClick={() => {
                    setBundleFile(null);
                    setBundleDone(false);
                    setReceiptOn(!receiptOn);
                  }}
                >
                  {receiptOn ? '✓ ' : ''}
                  거래명세서 (+사업자등록증)
                </button>
              )}
            </div>

            <div className="notice green mt14">
              <strong>
                {bundlePages === 0 ? '고른 서류가 없어요' : `이렇게 담깁니다 (모두 ${bundlePages}쪽)`}
              </strong>
              {bundleIdx.map((i) => `\n${certLabel(certs[i], i)} — ${gradName || '(성명 미입력)'}`)}
              {takeReceipt ? `\n거래명세서 — ${bizName || '(상호 미입력)'}` : ''}
              {takeReceipt ? '\n사업자등록증 (거래명세서에 반드시 붙어요)' : ''}
            </div>

            <button
              className="btn"
              onClick={onSaveBundle}
              disabled={bundleBusy || bundlePages === 0}
            >
              {bundleBusy ? '만드는 중이에요... (조금 걸려요)' : '고른 서류 한 번에 받기'}
            </button>

            {bundleFile && (
              <>
                <a className="btn green mt8" href={bundleFile.url} download={bundleFile.fileName}>
                  📥 파일 저장하기 ({(bundleFile.size / 1048576).toFixed(1)}MB)
                </a>
                <div className="notice blue mt8">
                  다운로드 표시가 안 보이면 바로 위 <strong>초록색 단추</strong>를 눌러주세요.
                  {'\n'}
                  파일 이름: <strong>{bundleFile.fileName}</strong>
                </div>
              </>
            )}

            <div className="notice mt14">
              내용을 고치시려면 아래 <strong>← 이전</strong>을 눌러 앞 화면에서 바꾸시면 돼요.
              {'\n'}여러 분 것이 필요하시면 <strong>이름만 바꿔서</strong> 다시 받으시면 됩니다.
            </div>
          </div>
        )}

        {/* ===== 6. 마무리 ===== */}
        {step === 'outro' && (
          <div className="card">
            <div className="finale">
              <Mascot name="baby" className="mascot-hero" style={{ width: 116 }} alt="성장이" />
              <div className="big">{cfg.outro.heading || '함께해 주셔서 고맙습니다'}</div>
              {cfg.outro.body && (
                <p className="sub" style={{ whiteSpace: 'pre-wrap' }}>
                  <Linkify text={cfg.outro.body} />
                </p>
              )}
            </div>

            {cfg.outro.contact && (
              <div className="notice mt14">
                <Linkify text={cfg.outro.contact} />
              </div>
            )}

            <div className="center signature">
              <Mascot
                name="family"
                style={{ width: 190, margin: '14px auto 6px', display: 'block' }}
                alt="우리아이들 캐릭터"
              />
              <strong>영유아교육디자인연구소</strong>
            </div>
          </div>
        )}

        <div className="step-dots">
          {steps.map((s, i) => (
            <i key={s + i} className={i === stepIdx ? 'on' : ''} />
          ))}
        </div>
      </div>

      {/* 아래 고정 이동 버튼 */}
      <div className="navbar">
        <div className="navbar-inner">
          {!isFirst && (
            <button className="btn ghost back" onClick={goBack}>
              ← 이전
            </button>
          )}
          {!isLast && step !== 'confirm' && step !== 'bridge' ? (
            <button className="btn" onClick={goNext}>
              {isFirst ? '시작하기' : '다음'} →
            </button>
          ) : isLast ? (
            <button
              className="btn green"
              onClick={() => {
                setGoDocs(null);
                setStepIdx(0);
                window.scrollTo({ top: 0 });
              }}
            >
              처음부터 다시 보기
            </button>
          ) : null}
        </div>
      </div>

      {/* 화면 밖에서 원본 크기로 그려두는 문서 — PDF는 여기를 찍는다 */}
      <div className="offscreen" aria-hidden="true">
        <ReceiptDoc innerRef={receiptRef} data={receiptData} />
        {certs.map((c, i) => (
          <CertDoc
            key={i}
            innerRef={(el) => {
              certRefs.current[i] = el;
            }}
            data={certDataOf(c)}
            designId={c.design}
          />
        ))}
      </div>
    </>
  );
}
