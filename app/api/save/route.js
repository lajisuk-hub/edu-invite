// 안내 내용을 연구소 보관함(Vercel Blob)에 저장하고 짧은 주소용 번호를 돌려준다.
import { put, head } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 헷갈리기 쉬운 글자(0/O/1/l 등)는 빼고 만든다
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function makeCode(len = 6) {
  let out = '';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i += 1) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

export async function POST(req) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json({ error: '보관함이 아직 연결되지 않았어요.' }, { status: 500 });
    }

    const config = await req.json();
    if (!config || !config.title) {
      return Response.json({ error: '교육 과정명이 없어요.' }, { status: 400 });
    }

    // ?code=번호 가 오면 새 번호를 뽑지 않고 그 번호의 내용을 바꿔 쓴다
    // (이미 보낸 링크 주소를 그대로 두고 내용만 갱신하는 경우)
    const wanted = (new URL(req.url).searchParams.get('code') || '').toLowerCase();

    let code = '';
    if (wanted) {
      if (!/^[a-z0-9]{4,12}$/.test(wanted)) {
        return Response.json({ error: '링크 주소가 올바르지 않아요.' }, { status: 400 });
      }
      try {
        await head(`links/${wanted}.json`);
      } catch (err) {
        return Response.json(
          { error: '그 링크로 만든 안내를 찾지 못했어요. 링크를 다시 확인해주세요.' },
          { status: 404 },
        );
      }
      code = wanted;
    } else {
      // 이미 쓰고 있는 번호와 겹치지 않게 몇 번 확인한다
      for (let i = 0; i < 5; i += 1) {
        const candidate = makeCode();
        try {
          await head(`links/${candidate}.json`);
          // 찾아졌다 = 이미 쓰는 번호 → 다시 뽑는다
        } catch (err) {
          code = candidate;
          break;
        }
      }
      if (!code) code = makeCode(8);
    }

    await put(`links/${code}.json`, JSON.stringify(config), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });

    return Response.json({ code, updated: Boolean(wanted) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '저장 중 문제가 생겼어요: ' + err.message }, { status: 500 });
  }
}
