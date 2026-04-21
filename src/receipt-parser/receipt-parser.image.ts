import sharp from 'sharp';
import { ImageProcessingError } from './errors';

/**
 * Supported input formats (per CONTEXT.md format allowlist).
 * Sharp always outputs JPEG regardless of input.
 *
 * HEIC/HEIF runtime support requires libheif linked into libvips at image-build
 * time — see plan 10-01 (Dockerfile switches to node:22-bookworm-slim with
 * libheif-dev + libde265-dev, and sharp is rebuilt from source against system libvips).
 */
const ALLOWED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'heic', 'heif']);

const MAX_LONG_EDGE = 1024;
const JPEG_QUALITY = 85;

/**
 * Prepare a receipt image buffer for the vision LLM call.
 *
 * Pipeline:
 *   1. Validate buffer is non-empty.
 *   2. Probe format via sharp().metadata() — throws ImageProcessingError if not in allowlist.
 *      (Metadata probe is on a fresh sharp() — NOT after .rotate() — because .rotate()
 *       metadata is pre-rotation per Pitfall G in RESEARCH.md.)
 *   3. Decode → EXIF autoOrient (.rotate() with no args) → resize(≤1024 long edge,
 *      withoutEnlargement:true) → JPEG q=85 → .withMetadata() (retains EXIF/GPS on output,
 *      per orchestrator decision 3 — Pitfall 6 PII tension acknowledged in CONTEXT.md).
 *   4. Return the re-encoded JPEG buffer.
 *
 * Always re-encodes — no "skip if already small" optimization (CONTEXT.md lock).
 * Deterministic output; ensures rotation is always applied regardless of input size.
 *
 * @throws ImageProcessingError when the buffer is empty, format is not allowlisted,
 *         or sharp's decode/rotate/encode pipeline fails.
 */
export async function prepareImage(buf: Buffer): Promise<Buffer> {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    throw new ImageProcessingError('Empty or invalid image buffer');
  }

  let format: string;
  try {
    const meta = await sharp(buf).metadata();
    format = (meta.format ?? '').toLowerCase();
  } catch (err) {
    throw new ImageProcessingError(
      `Unable to read image metadata: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  if (!ALLOWED_FORMATS.has(format)) {
    throw new ImageProcessingError(
      `Unsupported image format: ${format || 'unknown'}. Allowed: ${[...ALLOWED_FORMATS].join(', ')}`,
      { format },
    );
  }

  try {
    return await sharp(buf)
      .rotate() // EXIF autoOrient; strips the orientation tag from output so downstream doesn't double-rotate.
      .resize({
        width: MAX_LONG_EDGE,
        height: MAX_LONG_EDGE,
        fit: 'inside',
        withoutEnlargement: true, // never upscale small receipt crops
      })
      .jpeg({ quality: JPEG_QUALITY })
      // .withMetadata() is LITERAL per orchestrator decision 3 — retains EXIF/GPS on output JPEG.
      // Sharp's DEFAULT is to STRIP metadata; this call overrides that.
      // PII tension with Pitfall 6 is acknowledged in CONTEXT.md; accepted at practice-project scale.
      // If the app ever goes multi-user/public, drop .withMetadata() (or switch to .withMetadata({ orientation: undefined })).
      .withMetadata()
      .toBuffer();
  } catch (err) {
    throw new ImageProcessingError(
      `sharp pipeline failed: ${err instanceof Error ? err.message : String(err)}`,
      { format, cause: err },
    );
  }
}
