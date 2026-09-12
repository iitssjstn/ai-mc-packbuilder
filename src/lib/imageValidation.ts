const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

export interface ImageValidationResult {
  mimeType: "image/png" | "image/jpeg";
  width: number;
  height: number;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION = 2048;
const MIN_DIMENSION = 16;

/**
 * Validates a server-logo upload by sniffing real magic bytes (never
 * trusting the client-supplied Content-Type or file extension) and, for
 * PNG, reading the IHDR chunk directly for width/height. Rejects anything
 * that isn't a plausible small PNG/JPEG (spec §27: file type, size,
 * dimensions, MIME must all be checked server-side).
 */
export function validateLogoUpload(buffer: Buffer): ImageValidationResult {
  if (buffer.length === 0) throw new Error("Empty file");
  if (buffer.length > MAX_LOGO_BYTES) throw new Error(`Logo exceeds ${MAX_LOGO_BYTES / 1024 / 1024}MB limit`);

  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    // IHDR chunk is always the first chunk, right after the 8-byte
    // signature: 4 bytes length, 4 bytes "IHDR", 4 bytes width, 4 bytes height.
    if (buffer.length < 24) throw new Error("Malformed PNG: too short to contain IHDR");
    const chunkType = buffer.subarray(12, 16).toString("ascii");
    if (chunkType !== "IHDR") throw new Error("Malformed PNG: missing IHDR as first chunk");
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    assertDimensions(width, height);
    return { mimeType: "image/png", width, height };
  }

  if (buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) {
    const { width, height } = readJpegDimensions(buffer);
    assertDimensions(width, height);
    return { mimeType: "image/jpeg", width, height };
  }

  throw new Error("Unsupported file type — only PNG or JPEG logos are allowed");
}

function assertDimensions(width: number, height: number) {
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) throw new Error("Image is too small");
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) throw new Error(`Image exceeds ${MAX_DIMENSION}px in a dimension`);
}

/** Walks JPEG markers looking for an SOF (start-of-frame) segment, which
 * carries the real pixel dimensions. */
function readJpegDimensions(buffer: Buffer): { width: number; height: number } {
  let offset = 2; // skip the initial 0xFFD8 marker
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) throw new Error("Malformed JPEG: expected marker");
    const marker = buffer[offset + 1];
    const isSOF = (marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    offset += 2 + segmentLength;
  }
  throw new Error("Malformed JPEG: no SOF segment found");
}
