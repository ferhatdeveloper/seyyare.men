// Voice Agent — OpenRouter audio transcription + speech synthesis
// Push-to-talk: kullanıcı mikrofona basar, ses kaydeder, backend'e gönderir
// Backend: OpenRouter /api/v1/audio/transcriptions endpoint'i kullanır

const API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

export interface TranscriptionResult {
  text: string;
  language: string;
  durationSec: number;
  model: string;
  costUsd: number;
  durationMs: number;
}

export async function transcribeAudio(opts: {
  audioBase64: string;
  mimeType: string;
  language?: string;
  model?: string;
}): Promise<TranscriptionResult> {
  if (!API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

  const start = Date.now();
  const model = opts.model ?? "openai/whisper-large-v3";

  // multipart/form-data oluştur (fetch + Blob)
  const binaryString = atob(opts.audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: opts.mimeType });

  const formData = new FormData();
  formData.append("file", blob, "recording." + (opts.mimeType.split("/")[1] ?? "webm"));
  formData.append("model", model);
  if (opts.language) formData.append("language", opts.language);

  const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Transcription ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { text: string; language?: string; duration?: number };
  const costUsd = estimateWhisperCost(model, opts.audioBase64.length);

  return {
    text: data.text,
    language: data.language ?? opts.language ?? "unknown",
    durationSec: data.duration ?? 0,
    model,
    costUsd,
    durationMs: Date.now() - start,
  };
}

function estimateWhisperCost(model: string, audioBytes: number): number {
  // Whisper $0.006 / dakika (yaklaşık)
  const minutes = audioBytes / (1024 * 1024 * 0.5); // rough estimate
  return minutes * 0.006;
}

export interface SpeechResult {
  audioBase64: string;
  mimeType: string;
  model: string;
  costUsd: number;
  durationMs: number;
}

export async function synthesizeSpeech(opts: {
  text: string;
  voice?: string;
  format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
  model?: string;
}): Promise<SpeechResult> {
  if (!API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

  const start = Date.now();
  const model = opts.model ?? "openai/tts-1";
  const format = opts.format ?? "mp3";

  const res = await fetch(`${BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: opts.text,
      voice: opts.voice ?? "alloy",
      response_format: format,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Speech ${res.status}: ${text.slice(0, 300)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  return {
    audioBase64: base64,
    mimeType: `audio/${format}`,
    model,
    costUsd: estimateSpeechCost(model, opts.text.length),
    durationMs: Date.now() - start,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function estimateSpeechCost(model: string, textLength: number): number {
  // TTS $0.015 / 1K karakter (yaklaşık)
  return (textLength / 1000) * 0.015;
}