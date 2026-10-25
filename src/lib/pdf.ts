/** Page size of the PDF, the same as the slide frame on the print page. */
export const PDF_W = 1600;
export const PDF_H = 900;

/**
 * Renders each page element to a JPEG and downloads one PDF at exactly
 * 1600×900 per page, so the size never depends on the browser's print settings.
 * Libraries load on demand: they are only needed here.
 */
export async function downloadPdf(pages: HTMLElement[], filename: string, onProgress?: (done: number, total: number) => void) {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  (document.activeElement as HTMLElement | null)?.blur?.();
  await document.fonts.ready;
  // Slide photos load lazily: fetch them all now, then leave out any that failed.
  const imgs = pages.flatMap((p) => [...p.querySelectorAll("img")]);
  imgs.forEach((img) => (img.loading = "eager"));
  await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
  const broken = new Set(imgs.filter((img) => !img.complete || img.naturalWidth === 0));

  const opts = {
    width: PDF_W,
    height: PDF_H,
    pixelRatio: 2,
    quality: 0.9,
    // Empty photo pickers ("+") are for the screen only.
    filter: (n: HTMLElement) =>
      !broken.has(n as HTMLImageElement) && !(n.classList?.contains("xs-fill-img") && !n.querySelector("img")),
  };
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [PDF_W, PDF_H], hotfixes: ["px_scaling"], compress: true });
  for (let i = 0; i < pages.length; i++) {
    // The first capture can miss fonts and images that are still being inlined; a warm-up pass fixes it.
    if (i === 0) await toJpeg(pages[i], opts);
    const img = await toJpeg(pages[i], opts);
    if (i > 0) pdf.addPage([PDF_W, PDF_H], "landscape");
    pdf.addImage(img, "JPEG", 0, 0, PDF_W, PDF_H);
    onProgress?.(i + 1, pages.length);
  }
  pdf.save(filename);
}
