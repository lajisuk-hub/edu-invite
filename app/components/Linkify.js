'use client';

// 원장님이 글 안에 그냥 적어 넣은 주소(https://... 또는 www....)를
// 눌러서 열 수 있는 링크로 바꿔 보여준다.
// 카톡 오픈채팅방 주소, 결제 안내 주소 등을 글 속에 적어도 바로 열린다.

const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"')\]]+)/g;

export default function Linkify({ text }) {
  if (!text) return null;

  const parts = String(text).split(URL_RE);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const isUrl = /^(https?:\/\/|www\.)/.test(part);
        if (!isUrl) return <span key={i}>{part}</span>;

        // 문장 끝의 마침표·쉼표까지 주소로 딸려 들어가지 않게 떼어낸다.
        const tail = (part.match(/[.,!?]+$/) || [''])[0];
        const clean = tail ? part.slice(0, -tail.length) : part;
        const href = clean.startsWith('www.') ? `https://${clean}` : clean;

        return (
          <span key={i}>
            <a href={href} target="_blank" rel="noreferrer" className="inline-link">
              {clean}
            </a>
            {tail}
          </span>
        );
      })}
    </>
  );
}
