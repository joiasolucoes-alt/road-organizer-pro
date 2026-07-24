/**
 * Reduz uma foto de comprovante para um dataURL pequeno, no próprio navegador.
 * Guardamos o comprovante dentro do payload do lote (jsonb) apenas na PoC, então
 * o tamanho precisa ser modesto — daí o limite de dimensão e a compressão JPEG.
 * Em produção isso vai para um bucket de storage, com só a URL no banco.
 */
export async function compressImage(
  file: File,
  { maxSize = 900, quality = 0.55 }: { maxSize?: number; quality?: number } = {},
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const escala = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * escala);
  const h = Math.round(img.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // sem canvas, devolve o original
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}
