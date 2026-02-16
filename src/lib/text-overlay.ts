// Text overlay utility — server-side only
// Uses dynamic import of 'canvas' which may not be available in all environments.

export async function addTextOverlay(
  imageBase64: string,
  text: string,
  position: 'bottom' | 'center' = 'bottom'
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let canvasModule: any;
  try {
    const mod = 'canvas';
    canvasModule = await import(mod);
  } catch {
    console.warn('canvas module not available — returning image without overlay');
    return imageBase64;
  }

  const { createCanvas, loadImage } = canvasModule;
  const raw = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buf = Buffer.from(raw, 'base64');
  const img = await loadImage(buf);

  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const fontSize = Math.max(Math.round(img.height * 0.065), 24);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';

  const maxWidth = img.width * 0.85;
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const lineHeight = fontSize * 1.3;
  const blockHeight = lines.length * lineHeight + fontSize;
  const yStart = position === 'center' ? (img.height - blockHeight) / 2 : img.height * 0.67;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, yStart - fontSize * 0.3, img.width, blockHeight + fontSize * 0.3);

  ctx.fillStyle = '#ffffff';
  lines.forEach((line: string, i: number) => {
    ctx.fillText(line, img.width / 2, yStart + fontSize + i * lineHeight);
  });

  return canvas.toBuffer('image/png').toString('base64');
}
