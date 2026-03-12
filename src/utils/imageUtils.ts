export const addWatermark = (
  imageSrc: string,
  text: string = "Gidna"
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Setup watermark style
      const fontSize = Math.max(20, Math.floor(canvas.width / 25));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      // Add watermark at bottom right
      const padding = Math.floor(canvas.width / 50);
      const x = canvas.width - padding;
      const y = canvas.height - padding;

      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
};
