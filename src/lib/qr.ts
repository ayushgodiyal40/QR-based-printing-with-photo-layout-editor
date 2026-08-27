import QRCode from "qrcode";

/**
 * Generate QR code as a data URL (PNG).
 */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
}

/**
 * Generate QR code as SVG string.
 */
export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
}

/**
 * Generate QR code as PNG buffer.
 */
export async function generateQrBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: 800,
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
}
