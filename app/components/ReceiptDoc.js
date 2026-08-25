'use client';

// 거래명세서 문서 모양 (화면 미리보기와 PDF 저장에 똑같이 쓰인다)
import { SUPPLIER_INFO } from '../lib/supplier';

export default function ReceiptDoc({ innerRef, data }) {
  const {
    courseName,
    customerName,
    customerCEO,
    quantity,
    amount,
    issueDate,
    payDateKr,
  } = data;

  const unit = parseInt(amount, 10) || 0;
  const qty = parseInt(quantity, 10) || 1;
  const total = unit * qty;

  return (
    <div className="receipt" ref={innerRef}>
      <div className="receipt-header">
        <div className="receipt-title">거 래 명 세 서</div>
        <div className="receipt-meta">
          <span><strong>발행일</strong>{issueDate}</span>
          <span><strong>결제일</strong>{payDateKr}</span>
        </div>
      </div>

      <table className="info-table">
        <colgroup>
          <col className="col-role" />
          <col className="col-label" />
          <col />
          <col className="col-label" />
          <col className="col-value-narrow" />
        </colgroup>
        <tbody>
          <tr>
            <td className="role-cell" rowSpan={2}>공급자</td>
            <td className="label-cell">상호</td>
            <td className="value-cell">{SUPPLIER_INFO.name}</td>
            <td className="label-cell">사업자번호</td>
            <td className="value-cell">{SUPPLIER_INFO.bizNo}</td>
          </tr>
          <tr>
            <td className="label-cell">주소</td>
            <td className="value-cell">{SUPPLIER_INFO.address}</td>
            <td className="label-cell">대표자</td>
            <td className="value-cell">{SUPPLIER_INFO.ceo}</td>
          </tr>
        </tbody>
        <tbody>
          <tr className="divider-row"><td colSpan={5}></td></tr>
        </tbody>
        <tbody>
          <tr>
            <td className="role-cell gold">공급받는자</td>
            <td className="label-cell">어린이집</td>
            <td className={`value-cell ${!customerName ? 'empty-hint' : ''}`}>
              {customerName || '미입력'}
            </td>
            <td className="label-cell">대표자</td>
            <td className={`value-cell ${!customerCEO ? 'empty-hint' : ''}`}>
              {customerCEO || '미입력'}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="receipt-table">
        <thead>
          <tr>
            <th style={{ width: 50 }}>No.</th>
            <th>품목 (교육 과정)</th>
            <th style={{ width: 60 }}>수량</th>
            <th style={{ width: 110 }}>단가</th>
            <th style={{ width: 120 }}>금액</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td className="text-left">{courseName}</td>
            <td>{qty}</td>
            <td className="text-right">{unit.toLocaleString()}</td>
            <td className="text-right">{total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="receipt-total">
        <span className="total-label">합계 금액</span>
        <span className="total-amount">₩ {total.toLocaleString()}</span>
      </div>

      <div className="receipt-footer">
        <div className="footer-text">
          위와 같이 거래되었음을 확인합니다.<br />
          <span className="footer-org-line">
            <strong>{SUPPLIER_INFO.name}</strong>
            <img className="seal-inline" src="/seal.png" alt="영유아교육디자인연구소 직인" />
          </span>
        </div>
      </div>
    </div>
  );
}
