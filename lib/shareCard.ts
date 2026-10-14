import { Capacitor } from '@capacitor/core';
import type { Expression } from '@/components/ui/HeadAvatar';
import { getClub } from './data/clubs';
import { flagUrl } from './flags';
import { getNationality } from './data/nationalities';
import { DEFAULT_LOOK } from './data/look';
import { ovrOf, POSITION_LABEL } from './engine/player';
import { groupHonours } from './engine/honours';
import type { Player, SeasonRecord } from './types';

type T = (text: string, vars?: Record<string, string | number>) => string;

const W = 1080;
const H = 1350;

/** A flag as an image (same-origin SVG), or null */
async function loadFlag(emoji: string): Promise<HTMLImageElement | null> {
  const url = flagUrl(emoji);
  if (!url) return null;
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('flag'));
      img.src = url;
    });
    return img;
  } catch {
    return null;
  }
}

export async function loadAvatar(look: Player['look'], px = 420, kit?: string, expression?: Expression): Promise<HTMLImageElement | null> {
  try {
    const [{ renderToStaticMarkup }, React, { HeadAvatar }] = await Promise.all([
      import('react-dom/server'),
      import('react'),
      import('@/components/ui/HeadAvatar'),
    ]);
    const svg = renderToStaticMarkup(React.createElement(HeadAvatar, { look: look ?? DEFAULT_LOOK, size: px, kit, expression })).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('avatar'));
      img.src = url;
    });
    URL.revokeObjectURL(url);
    return img;
  } catch {
    return null;
  }
}

/** Draws the player card on a canvas and returns it as a PNG. */
export async function buildCardImage(player: Player, t: T): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const ovr = ovrOf(player);
  const club = getClub(player.clubId);
  const nat = getNationality(player.nationality);

  // background
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1608');
  bg.addColorStop(0.5, '#111113');
  bg.addColorStop(1, '#09090b');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.8, 120, 10, W * 0.8, 120, 560);
  glow.addColorStop(0, 'rgba(242,193,78,0.35)');
  glow.addColorStop(1, 'rgba(242,193,78,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // frame
  g.strokeStyle = 'rgba(242,193,78,0.55)';
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(40, 40, W - 80, H - 80, 64);
  g.stroke();

  g.textBaseline = 'alphabetic';
  g.fillStyle = '#f2c14e';
  g.font = '800 34px Inter, system-ui, sans-serif';
  g.fillText('ULTIME PLAYER', 100, 130);

  // OVR + position + flag
  g.fillStyle = '#fbe7a1';
  g.font = '800 260px Inter, system-ui, sans-serif';
  g.fillText(String(ovr), 96, 420);
  g.fillStyle = '#f2c14e';
  g.font = '800 70px Inter, system-ui, sans-serif';
  g.fillText(player.position, 108, 500);
  const flagImg = await loadFlag(nat.flag);
  if (flagImg) {
    g.save();
    g.beginPath();
    g.roundRect(108, 530, 112, 84, 10);
    g.clip();
    g.drawImage(flagImg, 108, 530, 112, 84);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(108, 530, 112, 84, 10);
    g.stroke();
  }

  // head
  const img = await loadAvatar(player.look, 420, club?.color);
  if (img) g.drawImage(img, W - 100 - 420, 170, 420, 420);

  // name
  g.textAlign = 'center';
  g.fillStyle = '#fafafa';
  let size = 104;
  g.font = `800 ${size}px Inter, system-ui, sans-serif`;
  const name = player.name.toUpperCase();
  while (g.measureText(name).width > W - 200 && size > 48) {
    size -= 4;
    g.font = `800 ${size}px Inter, system-ui, sans-serif`;
  }
  g.fillText(name, W / 2, 730);
  g.fillStyle = '#a1a1aa';
  g.font = '500 40px Inter, system-ui, sans-serif';
  g.fillText(`${club?.name ?? t('Free agent')} · ${t(POSITION_LABEL[player.position])} · ${player.age} ${t('yrs')}`, W / 2, 800);

  // attributes
  const attrs: [string, number][] = [
    ['FIN', player.attrs.finishing],
    ['COM', player.attrs.composure],
    ['VIS', player.attrs.vision],
    ['STA', player.attrs.stamina],
  ];
  const boxW = 200;
  const gap = 30;
  const startX = (W - (boxW * 4 + gap * 3)) / 2;
  attrs.forEach(([label, v], i) => {
    const x = startX + i * (boxW + gap);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.beginPath();
    g.roundRect(x, 860, boxW, 190, 36);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.1)';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#fafafa';
    g.font = '800 92px Inter, system-ui, sans-serif';
    g.fillText(String(v), x + boxW / 2, 960);
    g.fillStyle = '#f2c14e';
    g.font = '700 34px Inter, system-ui, sans-serif';
    g.fillText(t(label), x + boxW / 2, 1015);
  });

  // career numbers: four small boxes, so nothing overflows however big the numbers get
  const career: [string, number][] = [
    [t('Apps'), player.totals.apps],
    [t('Goals'), player.totals.goals],
    [t('Assists'), player.totals.assists],
    [t('Trophies'), player.trophies.length],
  ];
  const cW = 200;
  const cGap = 30;
  const cX = (W - (cW * 4 + cGap * 3)) / 2;
  career.forEach(([label, v], i) => {
    const x = cX + i * (cW + cGap);
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.beginPath();
    g.roundRect(x, 1070, cW, 124, 30);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 2;
    g.stroke();
    // the number and the label shrink until they fit their box
    let np = 60;
    g.font = `800 ${np}px Inter, system-ui, sans-serif`;
    while (g.measureText(String(v)).width > cW - 36 && np > 28) {
      np -= 2;
      g.font = `800 ${np}px Inter, system-ui, sans-serif`;
    }
    g.fillStyle = '#fafafa';
    g.fillText(String(v), x + cW / 2, 1131);
    const text = label.toUpperCase();
    let lp = 25;
    g.font = `700 ${lp}px Inter, system-ui, sans-serif`;
    while (g.measureText(text).width > cW - 24 && lp > 14) {
      lp -= 1;
      g.font = `700 ${lp}px Inter, system-ui, sans-serif`;
    }
    g.fillStyle = '#f2c14e';
    g.fillText(text, x + cW / 2, 1174);
  });
  if (player.national && player.national.caps > 0) {
    g.fillStyle = '#a1a1aa';
    g.font = '500 34px Inter, system-ui, sans-serif';
    g.fillText(`${player.national.caps} ${t('Caps')} · ${player.national.goals} ${t('Goals')}`, W / 2, 1236);
  }
  g.fillStyle = '#52525b';
  g.font = '500 28px Inter, system-ui, sans-serif';
  g.fillText(t('Built in Ultime Player'), W / 2, 1278);

  return new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/** Opens the native share sheet with an image (phones), or saves it (desktop). */
export async function shareImage(blob: Blob, filename: string, text: string): Promise<ShareResult> {
  try {
    // inside the iPhone app the web download does nothing: hand the picture to the system share sheet instead
    // (it has "Save Image" for the gallery, plus messages and social apps)
    if (Capacitor.isNativePlatform()) {
      try {
        const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
        const data = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result).split(',')[1] ?? '');
          r.onerror = () => rej(r.error);
          r.readAsDataURL(blob);
        });
        const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
        await Share.share({ title: 'Ultime Player', text, files: [uri], dialogTitle: 'Ultime Player' });
        return 'shared';
      } catch (e) {
        return /cancel/i.test(e instanceof Error ? e.message : String(e)) ? 'cancelled' : 'failed';
      }
    }
    const file = new File([blob], filename, { type: 'image/png' });
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Ultime Player', text });
        return 'shared';
      } catch (e) {
        if ((e as Error).name === 'AbortError') return 'cancelled';
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

export async function sharePlayerCard(player: Player, t: T): Promise<ShareResult> {
  try {
    const blob = await buildCardImage(player, t);
    const text = t('{name} — OVR {ovr} {pos}. Can you beat my career?', { name: player.name, ovr: ovrOf(player), pos: player.position });
    return await shareImage(blob, `${player.name.replace(/\W+/g, '-').toLowerCase() || 'player'}-card.png`, text);
  } catch {
    return 'failed';
  }
}

/** The retirement card: the whole career on one picture, with the honours and the flags they were won under. */
export async function buildCareerCardImage(player: Player, history: SeasonRecord[], t: T): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const nat = getNationality(player.nationality);
  const last = history[history.length - 1];
  const club = getClub(last?.clubId ?? player.clubId);

  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1608');
  bg.addColorStop(0.5, '#111113');
  bg.addColorStop(1, '#09090b');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 260, 10, W / 2, 260, 620);
  glow.addColorStop(0, 'rgba(242,193,78,0.38)');
  glow.addColorStop(1, 'rgba(242,193,78,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(242,193,78,0.55)';
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(40, 40, W - 80, H - 80, 64);
  g.stroke();

  g.textBaseline = 'alphabetic';
  g.textAlign = 'center';
  g.fillStyle = '#f2c14e';
  g.font = '800 32px Inter, system-ui, sans-serif';
  g.fillText(`ULTIME PLAYER · ${t('A Career Complete').toUpperCase()}`, W / 2, 112);

  const img = await loadAvatar(player.look, 340, club?.color, 'cheer');
  if (img) g.drawImage(img, W / 2 - 170, 140, 340, 340);

  g.fillStyle = '#fafafa';
  let size = 96;
  g.font = `800 ${size}px Inter, system-ui, sans-serif`;
  const name = player.name.toUpperCase();
  while (g.measureText(name).width > W - 200 && size > 48) {
    size -= 4;
    g.font = `800 ${size}px Inter, system-ui, sans-serif`;
  }
  g.fillText(name, W / 2, 570);
  const years = history.length ? `${history[0].year}–${last.year + 1}` : '';
  g.fillStyle = '#a1a1aa';
  g.font = '500 38px Inter, system-ui, sans-serif';
  g.fillText(`${t(nat.name)} · ${t(POSITION_LABEL[player.position])} · ${years}`, W / 2, 628);

  const boxes: [string, string | number][] = [
    [t('Peak OVR'), player.peakOvr],
    [t('Apps'), player.totals.apps],
    [t('Goals'), player.totals.goals],
    [t('Assists'), player.totals.assists],
  ];
  const boxW = 210;
  const gap = 28;
  const startX = (W - (boxW * 4 + gap * 3)) / 2;
  boxes.forEach(([label, v], i) => {
    const x = startX + i * (boxW + gap);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.beginPath();
    g.roundRect(x, 670, boxW, 170, 34);
    g.fill();
    g.strokeStyle = i === 0 ? 'rgba(242,193,78,0.6)' : 'rgba(255,255,255,0.1)';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = i === 0 ? '#fbe7a1' : '#fafafa';
    g.font = '800 84px Inter, system-ui, sans-serif';
    g.fillText(String(v), x + boxW / 2, 765);
    g.fillStyle = '#f2c14e';
    g.font = '700 28px Inter, system-ui, sans-serif';
    g.fillText(label.toUpperCase(), x + boxW / 2, 812);
  });

  // the cabinet, one line per title with its flag and its count
  const groups = groupHonours(player.trophies, history, player.clubId);
  g.fillStyle = '#f2c14e';
  g.font = '800 30px Inter, system-ui, sans-serif';
  g.fillText(`${t('Trophies').toUpperCase()}  ·  ${player.trophies.length}`, W / 2, 900);
  // every title fits: the more there are, the smaller the lines, and past seven they go in two or three columns
  const top = 950;
  const room = 305;
  const cols = groups.length > 14 ? 3 : groups.length > 7 ? 2 : 1;
  const perCol = Math.ceil(groups.length / cols);
  const step = Math.min(54, room / Math.max(1, perCol));
  const colW = (W - 160) / cols;
  for (let i = 0; i < groups.length; i++) {
    const gr = groups[i];
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const label = gr.count === 1 ? t(gr.labels[0]) : t(gr.title);
    const flag = gr.flag ? await loadFlag(gr.flag) : null;
    // shrink the line until it fits its column
    let px = Math.min(40, step * 0.76);
    let tw = 0;
    let fh = 0;
    let extra = 0;
    for (;;) {
      g.font = `700 ${px}px Inter, system-ui, sans-serif`;
      tw = g.measureText(label).width;
      fh = px * 0.92;
      extra = (flag ? fh * 1.32 + 14 : 0) + (gr.count > 1 ? px * 1.9 : 0) + 12;
      if (tw + extra <= colW - 12 || px <= 16) break;
      px -= 1;
    }
    const y = top + row * step + step * 0.72;
    let x = 80 + colW * (col + 0.5) - (tw + extra - 12) / 2;
    g.textAlign = 'left';
    g.fillStyle = gr.title.startsWith('Golden Star') ? '#86efac' : '#fafafa';
    g.fillText(label, x, y);
    x += tw + 12;
    if (flag) {
      const fw = fh * 1.32;
      g.save();
      g.beginPath();
      g.roundRect(x, y - fh * 0.86, fw, fh, 5);
      g.clip();
      g.drawImage(flag, x, y - fh * 0.86, fw, fh);
      g.restore();
      x += fw + 14;
    }
    if (gr.count > 1) {
      g.fillStyle = '#f2c14e';
      g.font = `800 ${px}px Inter, system-ui, sans-serif`;
      g.fillText(`×${gr.count}`, x, y);
    }
    g.textAlign = 'center';
  }
  if (groups.length === 0) {
    g.fillStyle = '#a1a1aa';
    g.font = '500 36px Inter, system-ui, sans-serif';
    g.fillText(t('No silverware — but plenty of memories.'), W / 2, 980);
  }

  g.fillStyle = '#52525b';
  g.font = '500 28px Inter, system-ui, sans-serif';
  g.fillText(t('Built in Ultime Player'), W / 2, 1290);
  return new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
}

export async function shareCareerCard(player: Player, history: SeasonRecord[], t: T): Promise<ShareResult> {
  try {
    const blob = await buildCareerCardImage(player, history, t);
    const text = t('{name}: {n} seasons, {g} goals, {tr} trophies. Can you beat my career?', { name: player.name, n: history.length, g: player.totals.goals, tr: player.trophies.length });
    return await shareImage(blob, `${player.name.replace(/\W+/g, '-').toLowerCase() || 'player'}-career.png`, text);
  } catch {
    return 'failed';
  }
}
