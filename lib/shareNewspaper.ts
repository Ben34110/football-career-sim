import { crowdFor } from './data/crowd';
import type { Expression } from '@/components/ui/HeadAvatar';
import type { Look } from './data/look';
import type { Pose } from './data/newspaper';
import { shareImage, type ShareResult } from './shareCard';

/** Renders the staged player (body language included) as an image. */
async function loadScene(p: PaperImage, height: number): Promise<HTMLImageElement | null> {
  try {
    const [{ renderToStaticMarkup }, React, { MomentScene }] = await Promise.all([import('react-dom/server'), import('react'), import('@/components/match/MomentScene')]);
    const svg = renderToStaticMarkup(React.createElement(MomentScene, { look: p.look, kit: p.kit, pose: p.pose ?? 'idle', expression: p.emotion ?? 'neutral', height })).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('scene'));
      img.src = url;
    });
    URL.revokeObjectURL(url);
    return img;
  } catch {
    return null;
  }
}

export interface PaperImage {
  outlet: string;
  dateLine: string;
  edition: number;
  headline: string;
  caption: string;
  paragraph: string;
  playerLine: string;
  rating: string;
  joy: boolean;
  look?: Look;
  kit?: string;
  emotion?: Expression;
  pose?: Pose;
  footer: string;
}

const W = 1080;
const H = 1350;
const SANS = '900 {s}px Inter, "Helvetica Neue", Arial, sans-serif';

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** '#rrggbb' → 'rgba(r,g,b,A)' for glow() */
function hexA(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},A)`;
}

function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, color.replace('A', String(alpha)));
  rg.addColorStop(1, color.replace('A', '0'));
  g.fillStyle = rg;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Draws the front page as a shareable portrait image. */
export async function buildPaperImage(p: PaperImage): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#f2ead7';
  g.fillRect(0, 0, W, H);

  // masthead
  g.textAlign = 'center';
  g.fillStyle = '#18181b';
  g.font = SANS.replace('{s}', '96');
  g.fillText(p.outlet.toUpperCase(), W / 2, 130);
  g.fillRect(60, 160, W - 120, 6);
  g.fillRect(60, 174, W - 120, 2);
  g.font = '700 26px Inter, Arial, sans-serif';
  g.fillStyle = '#52525b';
  g.textAlign = 'left';
  g.fillText(`No. ${p.edition}`, 60, 214);
  g.textAlign = 'right';
  g.fillText(p.dateLine.toUpperCase(), W - 60, 214);

  // headline
  g.textAlign = 'left';
  g.fillStyle = '#18181b';
  let hs = 92;
  let hl: string[] = [];
  const head = p.headline.toUpperCase();
  for (; hs >= 60; hs -= 4) {
    g.font = SANS.replace('{s}', String(hs));
    hl = wrap(g, head, W - 120);
    if (hl.length <= 3) break;
  }
  let y = 240 + hs;
  hl.forEach((l) => {
    g.fillText(l, 60, y);
    y += hs * 1.02;
  });
  y -= hs * 1.02;

  // text blocks measured first so the photo takes what is left
  g.font = 'italic 400 38px Georgia, "Times New Roman", serif';
  const pl = wrap(g, p.paragraph, W - 120).slice(0, 4);
  const textH = pl.length * 50;
  const ratingH = 120;
  const photoTop = y + 30;
  const photoH = Math.max(300, H - photoTop - 36 - textH - ratingH - 90);

  // photo
  g.save();
  g.beginPath();
  g.roundRect(60, photoTop, W - 120, photoH, 8);
  g.clip();
  const bg = g.createRadialGradient(W / 2, photoTop, 10, W / 2, photoTop, photoH * 1.5);
  if (p.joy) {
    bg.addColorStop(0, '#fde68a');
    bg.addColorStop(0.42, '#d97706');
    bg.addColorStop(1, '#3b1a05');
  } else {
    bg.addColorStop(0, '#cbd5e1');
    bg.addColorStop(0.42, '#64748b');
    bg.addColorStop(1, '#0b1220');
  }
  g.fillStyle = bg;
  g.fillRect(60, photoTop, W - 120, photoH);
  // floodlights and a packed stand, out of focus (soft radial blobs instead of hard shapes)
  [140, 380, 640, 900].forEach((x, i) => glow(g, x, photoTop + 30 + (i % 2) * 20, 120, 'rgba(255,255,255,A)', 0.6));
  const kit = p.kit ?? '#10b981';
  const fans = crowdFor(W - 120, photoH, kit, p.joy);
  const scale = 1.35;
  fans.forEach((f) => {
    const cx = 60 + f.x;
    const cy = photoTop + f.y;
    const r = f.r * scale * 1.5;
    glow(g, cx, cy + r * 2.4, r * 2.1, `${hexA(f.shirt)}`, 0.95);
    glow(g, cx, cy, r * 1.15, `${hexA(f.skin)}`, 0.95);
  });
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.fillRect(60, photoTop, W - 120, photoH);
  // light beams, confetti or rain across the whole photo
  const pose = p.pose ?? 'idle';
  const celebrating = pose === 'arms' || pose === 'ball' || pose === 'trophy';
  if (celebrating || pose === 'fist' || pose === 'point') {
    const cx = W / 2;
    const cy = photoTop + photoH * 0.6;
    g.fillStyle = 'rgba(255,255,255,0.13)';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + 1600 * Math.cos(a), cy + 1600 * Math.sin(a));
      g.lineTo(cx + 1600 * Math.cos(a + 0.13), cy + 1600 * Math.sin(a + 0.13));
      g.closePath();
      g.fill();
    }
  }
  if (celebrating) {
    const cols = [p.kit ?? '#10b981', '#fbbf24', '#f4f4f5', '#ef4444', '#38bdf8', '#a3e635'];
    let seed = 5;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) {
      g.save();
      g.translate(60 + r() * (W - 120), photoTop + r() * photoH * 0.85);
      g.rotate(r() * Math.PI);
      g.fillStyle = cols[i % cols.length];
      g.fillRect(-5, -10, 10, 20);
      g.restore();
    }
  }
  if (pose === 'facepalm') {
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.lineWidth = 3;
    let seed = 9;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const x = 60 + r() * (W - 120);
      const y = photoTop + r() * photoH;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 12, y + 34);
      g.stroke();
    }
  }
  const sceneH = Math.round(photoH);
  const scene = await loadScene(p, sceneH);
  if (scene) {
    const w = (sceneH * 200) / 170;
    g.drawImage(scene, (W - w) / 2, photoTop + photoH - sceneH, w, sceneH);
  }
  const vg = g.createRadialGradient(W / 2, photoTop + photoH / 2, photoH * 0.35, W / 2, photoTop + photoH / 2, W * 0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = vg;
  g.fillRect(60, photoTop, W - 120, photoH);
  g.restore();
  g.strokeStyle = 'rgba(24,24,27,0.5)';
  g.lineWidth = 2;
  g.strokeRect(60, photoTop, W - 120, photoH);

  // caption + paragraph
  let ty = photoTop + photoH + 32;
  g.fillStyle = '#52525b';
  g.font = 'italic 400 26px Georgia, serif';
  g.fillText(p.caption, 60, ty);
  ty += 56;
  g.fillStyle = '#27272a';
  g.font = '400 38px Georgia, "Times New Roman", serif';
  pl.forEach((l) => {
    g.fillText(l, 60, ty);
    ty += 50;
  });

  // rating strip
  const ry = H - 150;
  g.fillStyle = '#18181b';
  g.fillRect(60, ry, W - 120, 4);
  g.fillRect(60, ry + 96, W - 120, 4);
  g.font = '700 38px Georgia, serif';
  g.fillText(p.playerLine, 60, ry + 64);
  g.textAlign = 'right';
  g.font = SANS.replace('{s}', '70');
  g.fillText(p.rating, W - 60, ry + 72);
  g.textAlign = 'center';
  g.fillStyle = '#71717a';
  g.font = '600 24px Inter, Arial, sans-serif';
  g.fillText(p.footer, W / 2, H - 28);

  return new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
}

export async function sharePaper(p: PaperImage, text: string): Promise<ShareResult> {
  try {
    return await shareImage(await buildPaperImage(p), 'pitch-legacy-front-page.png', text);
  } catch {
    return 'failed';
  }
}
