'use client';

// 우리아이들 캐릭터 그림
// - public/characters/ 안의 그림을 불러온다.
// - 아직 그림 파일을 안 넣었더라도 화면이 깨지지 않도록,
//   불러오기에 실패하면 조용히 사라진다.
import { useState } from 'react';

export default function Mascot({ name, className = 'mascot', alt = '', style }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <img
      className={className}
      style={style}
      src={`/characters/${name}.png`}
      alt={alt}
      onError={() => setOk(false)}
    />
  );
}
