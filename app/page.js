'use client';

// 홈 화면 — 링크 주소 안에 안내 내용이 담겨 온 경우(?d=...)
// (짧은 주소로 오신 분은 /g/번호 화면으로 간다)

import { useEffect, useState } from 'react';
import { decodeConfig, DATA_PARAM } from './lib/share';
import Docs from './components/Docs';
import EmptyNotice from './components/EmptyNotice';

export default function HomePage() {
  const [cfg, setCfg] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCfg(decodeConfig(params.get(DATA_PARAM)));
    setReady(true);
  }, []);

  if (!ready) return <div className="stage center" style={{ paddingTop: 80 }}>잠시만요...</div>;
  if (!cfg) return <EmptyNotice />;
  return <Docs cfg={cfg} />;
}
