// file-type.util.ts
// Content-based file type detection (magic bytes) and a safe extension →
// Content-Type map for serving stored files. The client-supplied MIME type and
// filename are never trusted on their own.

export interface DetectedFileType {
  mime: string;
  /** Extension including the leading dot, e.g. ".png" */
  ext: string;
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

function asciiAt(buffer: Buffer, offset: number, length: number): string {
  if (buffer.length < offset + length) return '';
  return buffer.toString('latin1', offset, offset + length);
}

/**
 * Detect the real type of a file from its leading bytes.
 * Returns null when the content does not match any supported type.
 */
export function detectFileType(buffer?: Buffer | null): DetectedFileType | null {
  if (!buffer || buffer.length < 4) return null;

  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', ext: '.png' };
  }
  if (asciiAt(buffer, 0, 5) === '%PDF-') {
    return { mime: 'application/pdf', ext: '.pdf' };
  }
  if (asciiAt(buffer, 0, 4) === 'RIFF') {
    const format = asciiAt(buffer, 8, 4);
    if (format === 'WEBP') return { mime: 'image/webp', ext: '.webp' };
    if (format === 'AVI ') return { mime: 'video/x-msvideo', ext: '.avi' };
    return null;
  }
  if (asciiAt(buffer, 4, 4) === 'ftyp') {
    const brand = asciiAt(buffer, 8, 4);
    if (brand === 'qt  ') return { mime: 'video/quicktime', ext: '.mov' };
    return { mime: 'video/mp4', ext: '.mp4' };
  }
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { mime: 'video/x-matroska', ext: '.mkv' };
  }

  return null;
}

/**
 * Content types served inline. Anything not listed here is served as an
 * application/octet-stream attachment so browsers never render it.
 */
export const INLINE_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
};
