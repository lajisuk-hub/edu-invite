// 화면에 그려둔 문서를 그림으로 찍어 PDF로 저장하는 도구
// (한글 웹폰트를 통째로 넣다가 멈추는 문제가 없도록 html2canvas를 쓴다)

async function loadTools() {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  return { html2canvas, jsPDF };
}

// 사업자등록증 그림 불러오기 (없거나 실패하면 null)
async function loadLicenseImage() {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = '/business_license.jpg';
    });
    return img;
  } catch (err) {
    console.warn('사업자등록증 첨부 실패:', err);
    return null;
  }
}

// 사업자등록증을 한 쪽 가운데에 얹기
function drawLicense(pdf, img) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ratio = img.height / img.width;
  let w = pw - 20;
  let h = w * ratio;
  if (h > ph - 20) {
    h = ph - 20;
    w = h / ratio;
  }
  pdf.addImage(img, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
}

// 거래명세서: 1쪽 명세서 + 2쪽 사업자등록증
export async function saveReceiptPdf(el, fileName) {
  const { html2canvas, jsPDF } = await loadTools();

  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();

  const imgW = pw - 20;
  const imgH = (canvas.height * imgW) / canvas.width;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, imgW, imgH);

  // 2쪽: 사업자등록증 자동 첨부 (실패해도 1쪽은 정상 저장되게 함)
  const img = await loadLicenseImage();
  if (img) {
    pdf.addPage();
    drawLicense(pdf, img);
  }

  pdf.save(fileName);
}

// 수료증 여러 장 + 거래명세서 + 사업자등록증을 한 파일(PDF)로 묶어 저장
// certEls : 수료증 화면요소 배열 (없으면 빈 배열)
// receiptEl : 거래명세서 화면요소 (필요 없으면 null)
export async function saveBundlePdf({ certEls = [], receiptEl = null, fileName }) {
  const { html2canvas, jsPDF } = await loadTools();
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();

  let started = false;
  const newPage = () => {
    if (started) pdf.addPage();
    started = true;
  };
  // 여러 쪽이 되므로 용량이 커지지 않게 사진(JPEG)으로 넣는다
  const shot = async (el) => {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  for (let i = 0; i < certEls.length; i += 1) {
    if (!certEls[i]) continue;
    /* eslint-disable no-await-in-loop */
    const data = await shot(certEls[i]);
    newPage();
    pdf.addImage(data, 'JPEG', 0, 0, 210, 297);
  }

  if (receiptEl) {
    const canvas = await html2canvas(receiptEl, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });
    newPage();
    const imgW = pw - 20;
    const imgH = (canvas.height * imgW) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 10, 10, imgW, imgH);

    const img = await loadLicenseImage();
    if (img) {
      pdf.addPage();
      drawLicense(pdf, img);
    }
  }

  // 여러 쪽을 만드느라 몇 초가 걸리는데, 그 사이 크롬이 "버튼을 누른 것"으로 안 쳐서
  // 자동 저장을 막아 버리는 일이 있다. 그래서 저장을 시도한 뒤,
  // 화면에도 직접 누를 수 있는 저장 단추를 띄우도록 주소를 돌려준다.
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.warn('자동 저장이 막혔어요:', err);
  }
  return { url, fileName, size: blob.size };
}

// 수료증: A4 한 장 전체
export async function saveCertPdf(el, fileName) {
  const { html2canvas, jsPDF } = await loadTools();

  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
  pdf.save(fileName);
}

// 2026-01-05 → 2026. 1. 5.
export function fmtCertDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return `${y}. ${parseInt(m, 10)}. ${parseInt(d, 10)}.`;
}

// 2026-01-05 → 2026년 1월 5일
export function fmtKoreanDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}

// 오늘 날짜 (2026-01-05 형식) — 시간대 밀림 없이
export function todayIso() {
  const t = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}
