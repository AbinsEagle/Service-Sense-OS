// Sound level from the phone's microphone (PRD §5.2: no hardware sound sensor).
// Phone mics aren't calibrated, so this is an estimate: RMS level in dBFS plus a
// fixed offset that puts a quiet room near 35-45 dB. Tune SPL_OFFSET against a
// sound level meter before the numbers are used for pass/fail.
const SPL_OFFSET = 94;

export async function measureSound(ms = 3000): Promise<number> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ctx = new AudioContext();
  try {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let sum = 0;
    let n = 0;
    const end = performance.now() + ms;
    while (performance.now() < end) {
      await new Promise((res) => setTimeout(res, 50));
      analyser.getFloatTimeDomainData(buf);
      for (const s of buf) sum += s * s;
      n += buf.length;
    }
    const rms = Math.sqrt(sum / Math.max(n, 1));
    const db = 20 * Math.log10(Math.max(rms, 1e-7)) + SPL_OFFSET;
    return Math.round(Math.min(150, Math.max(0, db)));
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  }
}
