import { Employee } from '../../types';

export function adjHex(hex: string, amt: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string | CanvasGradient,
) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Illustrated office avatar. Anchor (px, py) is the floor contact under the chair. */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  av: Employee['avatar'] = {},
  shirt: string,
  gender: 'M' | 'F',
  phase: number,
  isLead: boolean,
  _deptId: string = 'nhan-su',
  _role: string = '',
  status: string = 'present',
  isSeated: boolean = true,
) {
  const isAway = status === 'absent' || status === 'leave' || status === 'off';
  const isLate = status === 'late';

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (isAway) ctx.filter = 'grayscale(100%) opacity(55%)';

  const bob = isAway ? 0 : Math.sin(phase * 2.2) * 0.35;
  const nod = isAway ? 0.8 : Math.sin(phase * 1.5) * 0.18;
  const typing = isAway ? 0 : isLate ? 10 : 7.4;
  const lTap = isAway ? 0 : Math.sin(phase * typing) * 0.55;
  const rTap = isAway ? 0 : Math.cos(phase * typing + 0.4) * 0.55;

  const skin = av.skin || (gender === 'F' ? '#f3c7a6' : '#e8b892');
  const hair = av.hairColor || '#2a2118';
  const style = av.hair ?? 0;
  const skinLight = adjHex(skin, 26);
  const skinShade = adjHex(skin, -22);
  const hairLight = adjHex(hair, 38);
  const hairMid = hair;
  const hairDark = adjHex(hair, -28);

  const hy = py - 33.5 + bob + nod;
  const torsoY = py - 22 + bob;

  // Ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.beginPath();
  ctx.ellipse(px, py + 2.2, isSeated ? 13 : 8, isSeated ? 4.6 : 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isSeated) drawChair(ctx, px, py);

  drawLegs(ctx, px, py, isSeated);
  drawTorso(ctx, px, torsoY, shirt, isLead, skin);
  drawArms(ctx, px, torsoY, shirt, skin, skinLight, skinShade, lTap, rTap);

  drawHairSilhouette(ctx, px, hy, gender, style, hairLight, hairMid, hairDark);

  rr(ctx, px - 2.1, hy + 5.6, 4.2, 5.2, 1.6);
  ctx.fillStyle = skinShade;
  ctx.fill();

  fillEllipse(ctx, px - 6.15, hy + 1.1, 1.15, 1.7, skinShade);
  fillEllipse(ctx, px + 6.15, hy + 1.1, 1.15, 1.7, adjHex(skin, -8));

  const face = ctx.createRadialGradient(px - 2.2, hy - 2.4, 1, px + 0.4, hy + 1, 8.2);
  face.addColorStop(0, skinLight);
  face.addColorStop(0.72, skin);
  face.addColorStop(1, skinShade);
  fillEllipse(ctx, px, hy + 0.8, 6.15, 6.9, face);

  drawFace(ctx, px, hy, skin, hairDark, isAway, !!av.glasses);
  drawHairAccent(ctx, px, hy, gender, style, hairLight, hairMid, hairDark);

  ctx.restore();
}

function drawChair(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(px, py - 7);
  ctx.lineTo(px, py + 0.4);
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(px, py + 1.1, 7.4, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();

  const back = ctx.createLinearGradient(px - 8, py - 31, px + 8, py - 14);
  back.addColorStop(0, '#475569');
  back.addColorStop(1, '#1e293b');
  rr(ctx, px - 8.2, py - 31, 16.4, 17, 5);
  ctx.fillStyle = back;
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  rr(ctx, px - 6.2, py - 28.5, 4.6, 12, 2.4);
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(px, py - 13.5, 9.2, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(px, py - 14.4, 7.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLegs(ctx: CanvasRenderingContext2D, px: number, py: number, seated: boolean) {
  const cloth = '#1e293b';
  const clothDark = '#0f172a';
  if (seated) {
    rr(ctx, px - 6.4, py - 14, 5.4, 9.5, 2.2);
    ctx.fillStyle = cloth;
    ctx.fill();
    rr(ctx, px + 1, py - 14, 5.4, 9.5, 2.2);
    ctx.fillStyle = clothDark;
    ctx.fill();
    rr(ctx, px - 7.2, py - 5.2, 6.2, 3.1, 1.4);
    ctx.fillStyle = '#0b1220';
    ctx.fill();
    rr(ctx, px + 1.1, py - 5.2, 6.2, 3.1, 1.4);
    ctx.fillStyle = '#111827';
    ctx.fill();
    return;
  }
  rr(ctx, px - 5.2, py - 16, 4.2, 15.5, 2);
  ctx.fillStyle = cloth;
  ctx.fill();
  rr(ctx, px + 1, py - 16, 4.2, 15.5, 2);
  ctx.fillStyle = clothDark;
  ctx.fill();
  rr(ctx, px - 5.8, py - 2.2, 5.2, 2.6, 1.2);
  ctx.fillStyle = '#0b1220';
  ctx.fill();
  rr(ctx, px + 0.8, py - 2.2, 5.2, 2.6, 1.2);
  ctx.fillStyle = '#111827';
  ctx.fill();
}

function drawTorso(
  ctx: CanvasRenderingContext2D,
  px: number,
  torsoY: number,
  shirt: string,
  isLead: boolean,
  skin: string,
) {
  const body = ctx.createLinearGradient(px - 9, torsoY, px + 9, torsoY + 16);
  body.addColorStop(0, adjHex(shirt, 22));
  body.addColorStop(0.55, shirt);
  body.addColorStop(1, adjHex(shirt, -26));

  if (isLead) {
    rr(ctx, px - 9.2, torsoY, 18.4, 16.5, 5);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    rr(ctx, px - 3.4, torsoY + 1.2, 6.8, 14.2, 2);
    ctx.fillStyle = body;
    ctx.fill();
  } else {
    rr(ctx, px - 8.6, torsoY, 17.2, 16.2, 5.2);
    ctx.fillStyle = body;
    ctx.fill();
  }

  // Collar
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(px - 3.3, torsoY + 1.1);
  ctx.lineTo(px, torsoY + 5.4);
  ctx.lineTo(px + 3.3, torsoY + 1.1);
  ctx.quadraticCurveTo(px, torsoY + 2.6, px - 3.3, torsoY + 1.1);
  ctx.fill();

  ctx.strokeStyle = 'rgba(15,23,42,0.18)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(px, torsoY + 5.2);
  ctx.lineTo(px, torsoY + 12);
  ctx.stroke();

  // ID badge
  rr(ctx, px + 1.6, torsoY + 7.2, 4.4, 5.2, 0.8);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.fillStyle = shirt;
  ctx.fillRect(px + 2.1, torsoY + 7.8, 3.4, 1.1);
  fillEllipse(ctx, px + 3.8, torsoY + 10.4, 0.7, 0.7, adjHex(skin, -10));

  if (isLead) {
    fillEllipse(ctx, px - 5.4, torsoY + 5.2, 1.15, 1.15, '#f5c451');
  }
}

function drawArms(
  ctx: CanvasRenderingContext2D,
  px: number,
  torsoY: number,
  shirt: string,
  skin: string,
  skinLight: string,
  skinShade: string,
  lTap: number,
  rTap: number,
) {
  rr(ctx, px - 11.4, torsoY + 2.2, 4.2, 9.2, 2);
  ctx.fillStyle = adjHex(shirt, 8);
  ctx.fill();
  rr(ctx, px + 7.2, torsoY + 2.2, 4.2, 9.2, 2);
  ctx.fillStyle = adjHex(shirt, -16);
  ctx.fill();

  fillEllipse(ctx, px - 9.2, torsoY + 11.2 + lTap, 2.15, 1.7, skinLight);
  fillEllipse(ctx, px + 9.2, torsoY + 11.2 + rTap, 2.15, 1.7, skinShade);
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  px: number,
  hy: number,
  skin: string,
  brow: string,
  isAway: boolean,
  glasses: boolean,
) {
  const eyeY = hy + 0.7;

  ctx.fillStyle = adjHex(skin, 18);
  ctx.globalAlpha = 0.45;
  fillEllipse(ctx, px - 3.3, hy + 2.6, 1.5, 0.85, adjHex(skin, 10));
  fillEllipse(ctx, px + 3.3, hy + 2.6, 1.5, 0.85, adjHex(skin, 10));
  ctx.globalAlpha = 1;

  ctx.strokeStyle = brow;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(px - 4.5, eyeY - 2.55);
  ctx.quadraticCurveTo(px - 3.1, eyeY - 3.15, px - 1.7, eyeY - 2.45);
  ctx.moveTo(px + 1.7, eyeY - 2.45);
  ctx.quadraticCurveTo(px + 3.1, eyeY - 3.15, px + 4.5, eyeY - 2.55);
  ctx.stroke();

  if (isAway) {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(px - 4.1, eyeY);
    ctx.quadraticCurveTo(px - 3, eyeY + 0.7, px - 1.8, eyeY);
    ctx.moveTo(px + 1.8, eyeY);
    ctx.quadraticCurveTo(px + 3, eyeY + 0.7, px + 4.1, eyeY);
    ctx.stroke();
  } else {
    fillEllipse(ctx, px - 3.05, eyeY, 1.25, 1.45, '#1e293b');
    fillEllipse(ctx, px + 3.05, eyeY, 1.25, 1.45, '#1e293b');
    fillEllipse(ctx, px - 2.65, eyeY - 0.45, 0.38, 0.38, '#ffffff');
    fillEllipse(ctx, px + 3.45, eyeY - 0.45, 0.38, 0.38, '#ffffff');
  }

  ctx.strokeStyle = adjHex(skin, -48);
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.arc(px, hy + 3.15, 2.15, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  if (!glasses) return;

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.95;
  rr(ctx, px - 5.35, eyeY - 2.15, 4.5, 3.7, 1.2);
  ctx.stroke();
  rr(ctx, px + 0.85, eyeY - 2.15, 4.5, 3.7, 1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px - 0.85, eyeY - 0.2);
  ctx.lineTo(px + 0.85, eyeY - 0.2);
  ctx.moveTo(px - 5.35, eyeY - 0.1);
  ctx.lineTo(px - 6.3, eyeY + 0.3);
  ctx.moveTo(px + 5.35, eyeY - 0.1);
  ctx.lineTo(px + 6.3, eyeY + 0.3);
  ctx.stroke();

  if (!isAway) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(px - 4.7, eyeY - 1.5, 1.5, 0.7);
  }
}

function hairGradient(
  ctx: CanvasRenderingContext2D,
  px: number,
  top: number,
  bottom: number,
  light: string,
  mid: string,
  dark: string,
) {
  const g = ctx.createLinearGradient(px, top, px, bottom);
  g.addColorStop(0, light);
  g.addColorStop(0.42, mid);
  g.addColorStop(1, dark);
  return g;
}

function drawHairSilhouette(
  ctx: CanvasRenderingContext2D,
  px: number,
  hy: number,
  gender: 'M' | 'F',
  style: number,
  light: string,
  mid: string,
  dark: string,
) {
  const g = hairGradient(ctx, px - 2, hy - 12, hy + (gender === 'F' && style === 1 ? 18 : 8), light, mid, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  if (gender === 'F' && style === 1) {
    ctx.moveTo(px, hy - 11.2);
    ctx.bezierCurveTo(px + 9, hy - 11, px + 10, hy - 2, px + 8.4, hy + 16);
    ctx.quadraticCurveTo(px + 6.2, hy + 18, px + 5.2, hy + 14);
    ctx.bezierCurveTo(px + 7.2, hy - 1, px + 6, hy - 6, px, hy - 7.4);
    ctx.bezierCurveTo(px - 6, hy - 6, px - 7.2, hy - 1, px - 5.2, hy + 14);
    ctx.quadraticCurveTo(px - 6.2, hy + 18, px - 8.4, hy + 16);
    ctx.bezierCurveTo(px - 10, hy - 2, px - 9, hy - 11, px, hy - 11.2);
  } else if (gender === 'F' && style === 3) {
    ctx.moveTo(px, hy - 10.8);
    ctx.bezierCurveTo(px + 9, hy - 10, px + 9.2, hy, px + 7.6, hy + 10);
    ctx.quadraticCurveTo(px + 5.6, hy + 11.4, px + 5, hy + 8);
    ctx.bezierCurveTo(px + 7, hy - 1, px + 5.5, hy - 6, px, hy - 7);
    ctx.bezierCurveTo(px - 5.5, hy - 6, px - 7, hy - 1, px - 5, hy + 8);
    ctx.quadraticCurveTo(px - 5.6, hy + 11.4, px - 7.6, hy + 10);
    ctx.bezierCurveTo(px - 9.2, hy, px - 9, hy - 10, px, hy - 10.8);
  } else if (gender === 'F') {
    const chin = style === 2 ? hy + 1.5 : hy + 6.2;
    ctx.moveTo(px, hy - 10.8);
    ctx.bezierCurveTo(px + 9.2, hy - 10.2, px + 9.4, hy - 2, px + 7.4, chin);
    ctx.quadraticCurveTo(px + 5.4, chin + 1.2, px + 4.6, chin - 2);
    ctx.quadraticCurveTo(px, hy - 6.6, px - 4.6, chin - 2);
    ctx.quadraticCurveTo(px - 5.4, chin + 1.2, px - 7.4, chin);
    ctx.bezierCurveTo(px - 9.4, hy - 2, px - 9.2, hy - 10.2, px, hy - 10.8);
  } else if (style === 3) {
    ctx.ellipse(px, hy - 3.1, 6.4, 6.2, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(px, hy - 2.5, 7.5, 7.2, 0, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawHairAccent(
  ctx: CanvasRenderingContext2D,
  px: number,
  hy: number,
  gender: 'M' | 'F',
  style: number,
  light: string,
  mid: string,
  dark: string,
) {
  if (gender === 'F' && style === 2) {
    fillEllipse(ctx, px, hy - 11.4, 3.6, 3.2, light);
    fillEllipse(ctx, px + 0.4, hy - 10.6, 2.6, 2.3, mid);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(px, hy - 8.8, 2.15, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (gender === 'M' && style === 1) {
    ctx.fillStyle = hairGradient(ctx, px, hy - 14, hy - 4, light, mid, dark);
    ctx.beginPath();
    ctx.moveTo(px - 3.2, hy - 6);
    ctx.quadraticCurveTo(px - 1, hy - 13.4, px + 4.6, hy - 7.4);
    ctx.quadraticCurveTo(px + 2.2, hy - 5.2, px - 1.2, hy - 6.4);
    ctx.fill();
  } else if (gender === 'M' && style === 2) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(px - 0.4, hy - 8.6);
    ctx.quadraticCurveTo(px - 2.6, hy - 4, px - 2.2, hy - 1.6);
    ctx.quadraticCurveTo(px - 0.8, hy - 3.2, px - 0.2, hy - 8.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 0.4, hy - 8.6);
    ctx.quadraticCurveTo(px + 2.6, hy - 4, px + 2.2, hy - 1.6);
    ctx.quadraticCurveTo(px + 0.8, hy - 3.2, px + 0.2, hy - 8.2);
    ctx.fill();
  } else if (gender === 'M' && style === 0) {
    ctx.strokeStyle = light;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(px - 1.1, hy - 9.2);
    ctx.quadraticCurveTo(px - 2.6, hy - 5, px - 3.4, hy - 2.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(px - 1.6, hy - 7.4, 2.2, 1.05, -0.45, 0, Math.PI * 2);
  ctx.fill();
}
