'use client';

// 안내 내용을 못 찾았을 때 보여 주는 화면
import Mascot from './Mascot';

export default function EmptyNotice({ title, message }) {
  return (
    <div className="stage">
      <div className="card center">
        <Mascot name="family" className="mascot-hero" alt="우리아이들 캐릭터" />
        <div className="step-title">{title || '아직 안내 내용이 없어요'}</div>
        <p className="step-sub mt8" style={{ whiteSpace: 'pre-line' }}>
          {message || '받으신 링크 주소가 중간에 잘렸을 수 있어요.\n보내주신 분께 링크를 다시 받아보세요.'}
        </p>
        <div className="mt20">
          <a
            className="btn ghost"
            href="/admin"
            style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}
          >
            안내 링크 만들러 가기 (관리자)
          </a>
        </div>
      </div>
    </div>
  );
}
