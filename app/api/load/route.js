// 짧은 주소(/g/번호)로 들어왔을 때 보관함에서 안내 내용을 꺼내온다.
import { list } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function GET(req) {
  try {
    const code = new URL(req.url).searchParams.get('c');
    if (!code || !/^[a-z0-9]{4,12}$/.test(code)) {
      return Response.json({ error: '주소가 올바르지 않아요.' }, { status: 400 });
    }

    const { blobs } = await list({ prefix: `links/${code}.json`, limit: 1 });
    if (!blobs.length) {
      return Response.json({ error: '이 주소의 안내를 찾지 못했어요.' }, { status: 404 });
    }

    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!res.ok) {
      return Response.json({ error: '안내 내용을 읽지 못했어요.' }, { status: 502 });
    }
    const config = await res.json();

    return Response.json({ config });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '오류가 났어요: ' + err.message }, { status: 500 });
  }
}
