import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

// Minimal 1x1 transparent PNG header + IHDR + IDAT + IEND
// We can generate clean valid PNGs of arbitrary size with pure Node using zlib
import { deflateSync } from 'zlib';

function createPNG(size: number, r: number, g: number, b: number, a: number): Buffer {
  const width = size;
  const height = size;

  // Raw image data: filter byte (0) + RGBA for each pixel per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Draw a subtle rounded geometric icon (Portal portal circle)
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = width * 0.45;
      const innerRadius = width * 0.25;

      if (dist <= radius && dist >= innerRadius) {
        // Gradient indigo/cyan ring
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = a;
      } else if (dist < innerRadius) {
        // Subtle core
        rawData[pixelOffset] = Math.min(255, r + 40);
        rawData[pixelOffset + 1] = Math.min(255, g + 40);
        rawData[pixelOffset + 2] = Math.min(255, b + 50);
        rawData[pixelOffset + 3] = Math.round(a * 0.8);
      } else {
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressed = deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA (6)
  ihdrData[10] = 0; // Compression: Deflate
  ihdrData[11] = 0; // Filter: Adaptive
  ihdrData[12] = 0; // Interlace: None
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const iconsDir = resolve(process.cwd(), 'public/icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Generate indigo/cyan portal ring icon (R: 99, G: 102, B: 241, A: 255)
[16, 48, 128].forEach((size) => {
  const pngBuf = createPNG(size, 99, 102, 241, 255);
  writeFileSync(resolve(iconsDir, `icon-${size}.png`), pngBuf);
  console.log(`Generated icon-${size}.png (${pngBuf.length} bytes)`);
});
