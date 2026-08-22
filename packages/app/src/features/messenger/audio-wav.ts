/** 将任意可解码音频 Blob 转为契约要求的 WAV data-URL（≥600ms 由调用方校验） */
export async function audioBlobToWavDataUrl(
  blob: Blob,
): Promise<{ dataUrl: string; durationMs: number }> {
  const ctx = new AudioContext();
  try {
    const raw = await blob.arrayBuffer();
    const buffer = await ctx.decodeAudioData(raw.slice(0));
    const durationMs = Math.round(buffer.duration * 1000);
    const wav = encodeWav(buffer);
    return { dataUrl: `data:audio/wav;base64,${arrayBufferToBase64(wav)}`, durationMs };
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** 16-bit PCM WAV（混音为 mono） */
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const sampleRate = buffer.sampleRate;
  const channels = 1;
  const samples = buffer.length;
  const dataSize = samples * channels * 2;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const mixed = mixToMono(buffer);
  let offset = 44;
  for (let i = 0; i < mixed.length; i += 1) {
    const s = Math.max(-1, Math.min(1, mixed[i]!));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return out;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const len = buffer.length;
  const out = new Float32Array(len);
  const chCount = buffer.numberOfChannels;
  for (let c = 0; c < chCount; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < len; i += 1) {
      out[i] = (out[i] ?? 0) + data[i]! / chCount;
    }
  }
  return out;
}

function writeStr(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
