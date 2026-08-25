'use client';

// 넓은 문서(거래명세서 700px, 수료증 595px)를 휴대폰 화면 폭에 맞게 줄여서 보여주는 상자
import { useEffect, useRef, useState } from 'react';

export default function FitBox({ width, height, children }) {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      if (!boxRef.current) return;
      const avail = boxRef.current.clientWidth;
      setScale(Math.min(1, avail / width));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [width]);

  return (
    <div className="fitbox" ref={boxRef} style={{ height: height * scale }}>
      <div className="fitbox-inner" style={{ transform: `scale(${scale})`, width, height }}>
        {children}
      </div>
    </div>
  );
}
