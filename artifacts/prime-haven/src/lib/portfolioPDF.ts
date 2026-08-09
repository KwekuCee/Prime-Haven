/**
 * Prime Haven themed portfolio PDF.
 * Warm cream canvas, ember-orange accent, ink-black type — drawn with jsPDF
 * so the export stays crisp and print-ready.
 */

const CREAM: [number, number, number] = [250, 247, 242];
const INK: [number, number, number] = [20, 19, 18];
const ORANGE: [number, number, number] = [255, 74, 31];
const MUTED: [number, number, number] = [110, 104, 98];
const LINE: [number, number, number] = [226, 219, 210];

export interface PdfWork {
  project_name: string;
  service_label: string;
  created_at: string;
  points_awarded?: number | null;
  image?: string | null;
  design_link?: string | null;
}

export interface PdfProfile {
  full_name: string;
  title: string;
  bio?: string | null;
  tags: string[];
  total_points: number;
  works_count: number;
  talent_score?: number | null;
  photo?: string | null;
}

interface LoadedImage {
  data: string;
  format: 'JPEG' | 'PNG';
  width: number;
  height: number;
}

const loadImage = async (url: string): Promise<LoadedImage | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!/^image\/(png|jpe?g|webp)$/i.test(blob.type)) return null;

    const bitmapUrl = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = bitmapUrl;
    });
    if (!img) { URL.revokeObjectURL(bitmapUrl); return null; }

    const canvas = document.createElement('canvas');
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) { URL.revokeObjectURL(bitmapUrl); return null; }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(bitmapUrl);

    return {
      data: canvas.toDataURL('image/jpeg', 0.9),
      format: 'JPEG',
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return null;
  }
};

export const generatePortfolioPDF = async (profile: PdfProfile, works: PdfWork[]) => {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 44;
  const contentW = pageW - margin * 2;

  const paintCanvas = () => {
    pdf.setFillColor(...CREAM);
    pdf.rect(0, 0, pageW, pageH, 'F');
    // blueprint grid
    pdf.setDrawColor(232, 225, 216);
    pdf.setLineWidth(0.4);
    for (let x = margin; x < pageW; x += 64) pdf.line(x, 0, x, pageH);
    for (let y = margin; y < pageH; y += 64) pdf.line(0, y, pageW, y);
  };

  const footer = (pageNo: number) => {
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.8);
    pdf.line(margin, pageH - 46, pageW - margin, pageH - 46);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...ORANGE);
    pdf.text('PRIME HAVEN', margin, pageH - 30);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...MUTED);
    pdf.text('primehaven.tech', margin + 72, pageH - 30);
    pdf.text(String(pageNo), pageW - margin, pageH - 30, { align: 'right' });
  };

  let page = 1;
  paintCanvas();

  // ---------- Cover header ----------
  let y = margin + 8;
  pdf.setFillColor(...INK);
  pdf.roundedRect(margin, y, contentW, 132, 16, 16, 'F');

  const photo = profile.photo ? await loadImage(profile.photo) : null;
  const avatarSize = 84;
  const avatarX = margin + 24;
  const avatarY = y + 24;
  if (photo) {
    pdf.addImage(photo.data, photo.format, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    pdf.setFillColor(...ORANGE);
    pdf.roundedRect(avatarX, avatarY, avatarSize, avatarSize, 12, 12, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(34);
    pdf.setTextColor(255, 255, 255);
    pdf.text((profile.full_name || '?').charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 12, { align: 'center' });
  }

  const textX = avatarX + avatarSize + 22;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text(profile.full_name || 'Prime Haven Talent', textX, avatarY + 26);
  pdf.setFontSize(9);
  pdf.setTextColor(...ORANGE);
  pdf.text((profile.title || 'Creative Designer').toUpperCase(), textX, avatarY + 44);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(214, 208, 200);
  const stats = [
    `${profile.total_points} points`,
    `${profile.works_count} published works`,
    profile.talent_score ? `Talent score ${Math.round(Number(profile.talent_score))}` : null,
  ].filter(Boolean) as string[];
  pdf.text(stats.join('   •   '), textX, avatarY + 68);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text('PORTFOLIO', pageW - margin - 24, avatarY + 12, { align: 'right' });

  y += 132 + 26;

  // ---------- Bio ----------
  if (profile.bio) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...MUTED);
    const lines = pdf.splitTextToSize(profile.bio, contentW);
    pdf.text(lines.slice(0, 6), margin, y);
    y += Math.min(lines.length, 6) * 14 + 14;
  }

  // ---------- Tags ----------
  if (profile.tags.length) {
    let tx = margin;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    for (const tag of profile.tags.slice(0, 14)) {
      const w = pdf.getTextWidth(tag) + 18;
      if (tx + w > pageW - margin) { tx = margin; y += 24; }
      pdf.setFillColor(238, 231, 222);
      pdf.roundedRect(tx, y - 11, w, 18, 9, 9, 'F');
      pdf.setTextColor(...INK);
      pdf.text(tag, tx + 9, y + 1);
      tx += w + 6;
    }
    y += 30;
  }

  // ---------- Works ----------
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...INK);
  pdf.text('SELECTED WORK', margin, y);
  pdf.setDrawColor(...ORANGE);
  pdf.setLineWidth(2);
  pdf.line(margin, y + 7, margin + 58, y + 7);
  y += 26;

  const gap = 18;
  const colW = (contentW - gap) / 2;
  const imgH = colW * 0.68;
  const cardH = imgH + 58;

  for (let i = 0; i < works.length; i++) {
    const work = works[i];
    const col = i % 2;
    if (col === 0 && y + cardH > pageH - 70) {
      footer(page);
      pdf.addPage();
      page += 1;
      paintCanvas();
      y = margin + 12;
    }
    const x = margin + col * (colW + gap);

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(x, y, colW, cardH, 12, 12, 'FD');

    const img = work.image ? await loadImage(work.image) : null;
    if (img) {
      const ratio = img.width / img.height;
      let w = colW - 20;
      let h = w / ratio;
      if (h > imgH - 12) { h = imgH - 12; w = h * ratio; }
      pdf.addImage(img.data, img.format, x + (colW - w) / 2, y + 10 + (imgH - 12 - h) / 2, w, h);
    } else {
      pdf.setFillColor(243, 238, 231);
      pdf.roundedRect(x + 10, y + 10, colW - 20, imgH - 12, 8, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...MUTED);
      pdf.text('NO PREVIEW', x + colW / 2, y + 10 + (imgH - 12) / 2, { align: 'center' });
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    pdf.text(pdf.splitTextToSize(work.project_name || 'Untitled', colW - 24)[0], x + 12, y + imgH + 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...ORANGE);
    pdf.text(work.service_label.toUpperCase(), x + 12, y + imgH + 26);

    pdf.setTextColor(...MUTED);
    const dateStr = work.created_at ? new Date(work.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    pdf.text(dateStr, x + colW - 12, y + imgH + 26, { align: 'right' });

    if (work.design_link) {
      pdf.setTextColor(...MUTED);
      pdf.text(pdf.splitTextToSize(work.design_link, colW - 24)[0], x + 12, y + imgH + 40);
    }

    if (col === 1 || i === works.length - 1) y += cardH + gap;
  }

  footer(page);
  pdf.save(`${(profile.full_name || 'designer').replace(/\s+/g, '-').toLowerCase()}-prime-haven-portfolio.pdf`);
};
