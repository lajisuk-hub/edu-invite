'use client';

// 짧은 주소 화면 — /g/번호
// 연구소 보관함에서 안내 내용을 꺼내와 보여 준다.

import { useEffect, useState } from 'react';
import { normalize } from '../../lib/share';
import Docs from '../../components/Docs';
import EmptyNotice from '../../components/EmptyNotice';

export default function ShortLinkPage({ params }) {
  const [cfg, setCfg] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | fail
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/load?c=${encodeURIComponent(params.code)}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(data.error || '안내를 찾지 못했어요.');
        setCfg(normalize(data.config));
        setState('ok');
      } catch (err) {
        if (!alive) return;
        setMessage(err.message);
        setState('fail');
      }
    })();
    return () => { alive = false; };
  }, [params.code]);

  if (state === 'loading') {
    return <div className="stage center" style={{ paddingTop: 80 }}>안내를 불러오는 중이에요...</div>;
  }
  if (state === 'fail') {
    return (
      <EmptyNotice
        title="안내를 찾지 못했어요"
        message={`${message}\n주소가 정확한지 확인하시거나, 보내주신 분께 다시 받아보세요.`}
      />
    );
  }
  return <Docs cfg={cfg} />;
}
