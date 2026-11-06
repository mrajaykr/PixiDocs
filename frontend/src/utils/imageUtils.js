export const loadImage = (fileOrBlob) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = typeof fileOrBlob === "string" ? fileOrBlob : URL.createObjectURL(fileOrBlob);
  });

export const mergeImages = async (files, direction = "horizontal") => {
  const images = await Promise.all(files.map(loadImage));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (direction === "horizontal") {
    canvas.width = images.reduce((sum, img) => sum + img.width, 0);
    canvas.height = Math.max(...images.map((img) => img.height));

    let x = 0;
    images.forEach((img) => {
      ctx.drawImage(img, x, 0);
      x += img.width;
    });
  } else {
    canvas.width = Math.max(...images.map((img) => img.width));
    canvas.height = images.reduce((sum, img) => sum + img.height, 0);

    let y = 0;
    images.forEach((img) => {
      ctx.drawImage(img, 0, y);
      y += img.height;
    });
  }

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/png")
  );
};

export const resizeImage = (file, width, height) =>
  new Promise(async (resolve) => {
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = parseInt(width) || img.width;
    canvas.height = parseInt(height) || img.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      resolve({
        name: `resized_${width}x${height}_${file.name}`,
        size: blob.size,
        blob,
      });
    }, "image/png");
  });

export const rotateImage = (file, angle = 90) =>
  new Promise(async (resolve) => {
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (angle === 90 || angle === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    canvas.toBlob((blob) => {
      resolve({
        name: `rotated_${angle}_${file.name}`,
        size: blob.size,
        blob,
      });
    }, "image/png");
  });

export const watermarkImage = (file, text = "CONFIDENTIAL") =>
  new Promise(async (resolve) => {
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);
    ctx.font = `bold ${Math.max(24, Math.floor(canvas.width / 18))}px sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 3;
    ctx.textAlign = "center";

    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    canvas.toBlob((blob) => {
      resolve({
        name: `watermarked_${file.name}`,
        size: blob.size,
        blob,
      });
    }, "image/png");
  });

export const convertImageFormat = (file, targetFormat = "image/jpeg", ext = "jpg") =>
  new Promise(async (resolve) => {
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    if (targetFormat === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      resolve({
        name: `${baseName}.${ext}`,
        size: blob.size,
        blob,
      });
    }, targetFormat, 0.92);
  });

export const compressImage = (file, quality = 0.7) =>
  new Promise(async (resolve) => {
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    canvas.toBlob(
      (blob) => {
        resolve({
          name: `compressed_${file.name}`,
          size: blob.size,
          blob,
        });
      },
      "image/jpeg",
      quality
    );
  });

export const enhanceImage = async (file) => {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  // Moderate upscale for quality preservation
  canvas.width = Math.floor(img.width * 1.2);
  canvas.height = Math.floor(img.height * 1.2);
  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  
  // Real client-side enhancement using canvas filters (Contrast, Saturation, Brightness)
  ctx.filter = "contrast(1.15) saturate(1.2) brightness(1.05)";
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Apply a basic sharpening kernel manually
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;
  const mix = 0.5; // sharpness intensity

  // Simple unsharp mask approx
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top = copy[((y - 1) * w + x) * 4 + c];
        const left = copy[(y * w + (x - 1)) * 4 + c];
        const right = copy[(y * w + (x + 1)) * 4 + c];
        const bottom = copy[((y + 1) * w + x) * 4 + c];
        const center = copy[idx + c];
        
        // Laplacian edge detection + original
        let val = center + mix * (center * 4 - top - left - right - bottom);
        data[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({
        name: `enhanced_${file.name}`,
        size: blob.size,
        originalSize: file.size,
        blob,
      });
    }, file.type === "image/png" ? "image/png" : "image/jpeg", 0.95);
  });
};

// Add this to imageUtils.js
export const compressImageToTargetSize = async (file, targetKB) => {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  let low = 0.0;
  let high = 1.0;
  let bestBlob = null;
  let quality = 0.8;

  // Binary search for quality
  for (let i = 0; i < 7; i++) {
    quality = (low + high) / 2;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob.size / 1024 <= targetKB) {
      bestBlob = blob;
      low = quality; // Try to get higher quality that still fits
    } else {
      high = quality; // Too big, need lower quality
    }
  }
  
  if (!bestBlob) {
    bestBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.1));
  }

  return {
    name: `compressed_${targetKB}kb_${file.name}`,
    size: bestBlob.size,
    blob: bestBlob
  };
};

export const cropImageToBlob = async (file, pixelCrop) => {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png", 1.0));
  return {
    name: `cropped_${file.name}`,
    size: blob.size,
    blob: blob
  };
};
