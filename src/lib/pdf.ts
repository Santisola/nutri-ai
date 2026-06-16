// Extracción de texto de PDFs en el navegador (cliente). pdfjs se carga lazy.

export const PDF_MIN_TEXT = 60; // menos texto que esto ⇒ probablemente escaneado

/** Extrae el texto de un PDF digital. Devuelve "" si no tiene texto (escaneado). */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text +=
      content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .trim() + "\n";
  }
  return text.trim();
}
