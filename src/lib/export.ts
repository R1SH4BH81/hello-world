// Export utilities: PNG, SVG, MP4 / WebM video recording, and PNG frames ZIP

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

let crcTable: Uint32Array | null = null;
function getCrcTable(): Uint32Array {
  if (!crcTable) {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[n] = c >>> 0;
    }
    crcTable = t;
  }
  return crcTable;
}

function computeCrc(data: Uint8Array): number {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = table[(c ^ data[i]) & 255] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  name: string;
  data: Uint8Array;
}

export function createZipBlob(files: ZipFileInput[]): Blob {
  const enc = new TextEncoder();
  const parts: any[] = [];
  const centralDirectory: any[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = computeCrc(f.data);
    const size = f.data.length;

    // Local file header (30 bytes)
    const localHeader = new DataView(new ArrayBuffer(30));
    localHeader.setUint32(0, 0x04034b50, true);
    localHeader.setUint16(4, 20, true);
    localHeader.setUint16(8, 0, true);
    localHeader.setUint16(12, 33, true);
    localHeader.setUint32(14, crc, true);
    localHeader.setUint32(18, size, true);
    localHeader.setUint32(22, size, true);
    localHeader.setUint16(26, nameBytes.length, true);

    parts.push(localHeader.buffer, nameBytes, f.data);

    // Central directory header (46 bytes)
    const cdHeader = new DataView(new ArrayBuffer(46));
    cdHeader.setUint32(0, 0x02014b50, true);
    cdHeader.setUint16(4, 20, true);
    cdHeader.setUint16(6, 20, true);
    cdHeader.setUint16(14, 33, true);
    cdHeader.setUint32(16, crc, true);
    cdHeader.setUint32(20, size, true);
    cdHeader.setUint32(24, size, true);
    cdHeader.setUint16(28, nameBytes.length, true);
    cdHeader.setUint32(42, offset, true);

    centralDirectory.push(cdHeader.buffer, nameBytes);
    offset += 30 + nameBytes.length + size;
  }

  const cdSize = centralDirectory.reduce((sum, b) => sum + (b.byteLength || (b as any).length), 0);
  const endRecord = new DataView(new ArrayBuffer(22));
  endRecord.setUint32(0, 0x06054b50, true);
  endRecord.setUint16(8, files.length, true);
  endRecord.setUint16(10, files.length, true);
  endRecord.setUint32(12, cdSize, true);
  endRecord.setUint32(16, offset, true);

  return new Blob([...parts, ...centralDirectory, endRecord.buffer] as any, {
    type: "application/zip",
  });
}
