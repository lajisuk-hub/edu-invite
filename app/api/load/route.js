// 짧은 주소(/g/번호)로 들어왔을 때 보관함에서 안내 내용을 꺼내온다.
//
// ⚠ 예전에는 여기서 list()로 파일을 찾았는데, list는 보관함의 "고급 작업"으로 세어져
//    참가자가 링크를 한 번 열 때마다 무료 한도(월 2,000회)를 1씩 깎아 먹었다.
//    (2026-09-02에 이것 때문에 보관함 전체가 잠겼다.)
//    이제는 보관함 주소를 한 번만 알아내 기억해 두고, 그 다음부터는 곧바로 읽는다.
import { head } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 15;

// 보관함 주소(https://xxxx.public.blob.vercel-storage.com)는 늘 같으므로 한 번 알아내면 계속 쓴다.
let blobOrigin = '';

async function readJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function GET(req) {
  try {
    const code = new URL(req.url).searchParams.get('c');
    if (!code || !/^[a-z0-9]{4,12}$/.test(code)) {
      return Response.json({ error: '주소가 올바르지 않아요.' }, { status: 400 });
    }
    const path = `links/${code}.json`;

    // 1) 보관함 주소를 이미 알고 있으면 곧장 읽는다 (보관함 사용량 0)
    if (blobOrigin) {
      const config = await readJson(`${blobOrigin}/${path}`);
      if (config) return Response.json({ config });
    }

    // 2) 처음이거나 곧장 읽기가 안 되면 보관함에 물어본다 (head = "간단 작업", 한도가 넉넉하다)
    let info;
    try {
      info = await head(path);
    } catch (err) {
      return Response.json({ error: '이 주소의 안내를 찾지 못했어요.' }, { status: 404 });
    }
    blobOrigin = new URL(info.url).origin;

    const config = await readJson(info.url);
    if (!config) {
      return Response.json({ error: '안내 내용을 읽지 못했어요.' }, { status: 502 });
    }
    return Response.json({ config });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '오류가 났어요: ' + err.message }, { status: 500 });
  }
}
