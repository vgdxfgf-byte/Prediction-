const MAX_DATA_URL_LENGTH = 460000;

function renderScaledJpeg(img: HTMLImageElement, maxDim: number, quality: number): string {
  const ratio = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not process image in browser');
  }

  ctx.fillStyle = '#060b0e';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressChatImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPG, PNG, or WebP).');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image is too large (max 15 MB).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read the selected image.'));
      el.src = objectUrl;
    });

    const attempts: Array<[number, number]> = [
      [960, 0.74],
      [760, 0.62],
      [580, 0.5]
    ];

    for (const [maxDim, quality] of attempts) {
      const dataUrl = renderScaledJpeg(img, maxDim, quality);
      if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
        return dataUrl;
      }
    }

    throw new Error('Image is still too detailed after compression. Please pick a smaller screenshot.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
