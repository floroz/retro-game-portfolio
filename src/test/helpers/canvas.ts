/**
 * Counts the pixels of a 2x canvas that break the art grid: any canvas px
 * that isn't fully opaque, or that differs from the rest of its 2x2 block.
 * Art and text alike have to line up with the scene's 640x320 grid.
 */
export function offGridPixels(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const px = (x: number, y: number) =>
    data.slice((y * width + x) * 4, (y * width + x) * 4 + 4).join();
  let off = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const c = px(x, y);
      if (data[(y * width + x) * 4 + 3] !== 255) off++;
      if (px(x + 1, y) !== c || px(x, y + 1) !== c || px(x + 1, y + 1) !== c) {
        off++;
      }
    }
  }
  return off;
}
