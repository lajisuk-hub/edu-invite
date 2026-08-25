'use client';

// 수료증 문서 모양 (화면 미리보기와 PDF 저장에 똑같이 쓰인다)
// 고른 디자인의 배경 그림 위에 성명·소속·기간·문구를 얹는 방식.
// 글자가 놓이는 자리는 app/lib/certDesigns.js 에 디자인마다 적혀 있다.

import { getDesign, CERT_W, CERT_H } from '../lib/certDesigns';

export default function CertDoc({ innerRef, data, designId }) {
  const d = getDesign(designId);
  const { graduateName, affiliation, periodText, courseText, awardText } = data;
  const f = d.fields;
  const b = d.body;

  const row = (label, value, dim) => (
    <div className="cert-row" style={{ height: f.rowHeight, fontSize: f.fontSize, color: f.color }}>
      <span className="cert-row-label" style={{ width: f.labelWidth }}>
        {label.split('').map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </span>
      <span className="cert-row-colon">:</span>
      <span className={`cert-row-value ${dim ? 'empty-hint' : ''}`}>{value}</span>
    </div>
  );

  return (
    <div className="cert" ref={innerRef} style={{ width: CERT_W, height: CERT_H }}>
      <img className="cert-bg" src={d.bg} alt="" style={{ width: CERT_W, height: CERT_H }} />

      {/* 배경 그림에 '수료증' 글자가 없는 디자인만 직접 얹는다 */}
      {d.title && (
        <div
          className="cert-title"
          style={{
            top: d.title.top,
            fontSize: d.title.fontSize,
            color: d.title.color,
            letterSpacing: d.title.spacing || '0.34em',
            fontFamily:
              d.title.font === 'sans'
                ? "'Noto Sans KR', sans-serif"
                : "'Noto Serif KR', serif",
          }}
        >
          수 료 증
        </div>
      )}

      <div className="cert-fields" style={{ top: f.top, left: f.left }}>
        {row('성명', graduateName || '수료자 성명', !graduateName)}
        {row('소속', affiliation || '어린이집명', !affiliation)}
        {periodText ? row('교육기간', periodText, false) : null}
      </div>

      <div
        className="cert-body"
        style={{
          top: b.top,
          left: b.left,
          right: b.right,
          fontSize: b.fontSize,
          lineHeight: b.lineHeight,
          color: b.color,
        }}
      >
        귀하는 {courseText} 교육과정을 성실히 이수하였으므로
        <br />
        이에 본 수료증을 수여합니다.
      </div>

      {/* 수여일 — 배경에 날짜 자리가 없는 디자인만 */}
      {d.date && (
        <div
          className="cert-date"
          style={{
            top: d.date.top,
            left: d.date.left ?? 0,
            right: d.date.right ?? 0,
            fontSize: d.date.fontSize,
            color: d.date.color,
            textAlign: d.date.align || 'center',
          }}
        >
          {awardText}
        </div>
      )}

      {/* 기관명 — 배경에 기관명이 없는 디자인만 */}
      {d.org && (
        <div
          className="cert-org"
          style={{
            top: d.org.top,
            left: d.org.left ?? 0,
            right: d.org.right ?? 0,
            fontSize: d.org.fontSize,
            color: d.org.color,
            textAlign: d.org.align || 'center',
          }}
        >
          영유아교육디자인연구소
        </div>
      )}

      {d.seal && (
        <img
          className="cert-seal"
          src="/seal.png"
          alt="영유아교육디자인연구소 직인"
          style={{ left: d.seal.left, top: d.seal.top, width: d.seal.width }}
        />
      )}
    </div>
  );
}
