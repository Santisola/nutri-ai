// Utilidades de imagen para el cliente (usan DOM: solo corren en el navegador).

export const PENDING_PHOTOS_KEY = "nutriai:pendingFoodPhotos";
export const PHOTOS_EVENT = "nutriai:foodphotos";

/** Redimensiona a máx `max`px y exporta JPEG (data URL) para acotar el payload. */
export function fileToScaledDataUrl(file: File, max = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

/** Guarda fotos pendientes (data URLs) para que las tome la pantalla de Hoy. */
export function savePendingPhotos(urls: string[]) {
  try {
    sessionStorage.setItem(PENDING_PHOTOS_KEY, JSON.stringify(urls));
  } catch {
    // sessionStorage no disponible — ignorar
  }
}

/** Lee y limpia las fotos pendientes. */
export function takePendingPhotos(): string[] {
  try {
    const raw = sessionStorage.getItem(PENDING_PHOTOS_KEY);
    if (!raw) return [];
    sessionStorage.removeItem(PENDING_PHOTOS_KEY);
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
