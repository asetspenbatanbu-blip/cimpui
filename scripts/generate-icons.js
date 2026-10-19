import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([138, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: truecolor (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data: filter byte (0) + width * 3 bytes per scanline
  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineLength;
    rawData[offset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const pxOffset = offset + 1 + x * 3;
      // Soft rounded border / inner circle pattern
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < width * 0.42) {
        // Inner warm cream color (#FDFBF7) with accent
        if (dist > width * 0.38) {
          rawData[pxOffset] = 192;   // #C04000
          rawData[pxOffset + 1] = 64;
          rawData[pxOffset + 2] = 0;
        } else {
          rawData[pxOffset] = 253;
          rawData[pxOffset + 1] = 251;
          rawData[pxOffset + 2] = 247;
        }
      } else {
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcBuf);

  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public');
}

// Generate PWA icons in #8A9A5B color (138, 154, 91)
fs.writeFileSync('./public/pwa-192x192.png', createPNG(192, 192, 138, 154, 91));
fs.writeFileSync('./public/pwa-512x512.png', createPNG(512, 512, 138, 154, 91));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPNG(512, 512, 138, 154, 91));
fs.writeFileSync('./public/apple-touch-icon.png', createPNG(180, 180, 138, 154, 91));
fs.writeFileSync('./public/favicon.ico', createPNG(32, 32, 138, 154, 91));
console.log('PWA PNG icons generated successfully!');
