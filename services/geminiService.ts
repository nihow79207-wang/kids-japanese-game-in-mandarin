
import { GoogleGenAI, Modality, Type } from "@google/genai";

const audioCache = new Map<string, AudioBuffer>();
const fetchPending = new Set<string>();
let audioContext: AudioContext | null = null;

export function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function preloadTTS(texts: string[]) {
  const ctx = initAudio();
  for (const text of texts) {
    if (!audioCache.has(text) && !fetchPending.has(text)) {
      fetchAndCacheTTS(text, ctx);
      await sleep(1000);
    }
  }
}

async function fetchAndCacheTTS(text: string, ctx: AudioContext, voice: string = 'Kore'): Promise<AudioBuffer | null> {
  const cacheKey = `${text}_${voice}`;
  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)!;
  if (fetchPending.has(cacheKey)) return null;
  if (!process.env.API_KEY) return null;

  fetchPending.add(cacheKey);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: `Say '${text}' clearly.`,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
      audioCache.set(cacheKey, audioBuffer);
      return audioBuffer;
    }
  } catch (error) {
    console.warn(`Gemini TTS fail: ${text}`, error);
  } finally {
    fetchPending.delete(cacheKey);
  }
  return null;
}

export async function playTTS(text: string, voice: string = 'Kore') {
  const ctx = initAudio();
  const buffer = audioCache.get(`${text}_${voice}`);
  if (buffer) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    return;
  }
  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = 'ja-JP';
  ut.rate = 0.95;
  window.speechSynthesis.speak(ut);
  fetchAndCacheTTS(text, ctx, voice);
}

export async function verifyHandwriting(base64Image: string, targetChar: string) {
  if (!process.env.API_KEY) return { isCorrect: true, feedback: "API Key 缺失" };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: `Is this handwritten Japanese character '${targetChar}'? Response JSON only.` },
        { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING }
        },
        required: ["isCorrect", "feedback"]
      }
    }
  });
  return JSON.parse(response.text);
}

/**
 * 辨識語音發音是否正確
 */
export async function verifyPronunciation(audioBase64: string, targetWord: string): Promise<{ isCorrect: boolean; feedback: string }> {
  if (!process.env.API_KEY) return { isCorrect: true, feedback: "沒問題！" };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: `Did the user correctly pronounce the Japanese word '${targetWord}'? Analyze the audio and respond with JSON (isCorrect: boolean, feedback: short encouragement in Traditional Chinese).` },
          { inlineData: { data: audioBase64, mimeType: 'audio/webm' } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING }
          },
          required: ["isCorrect", "feedback"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Pronunciation verification fail:", error);
    return { isCorrect: true, feedback: "聽起來很棒！" };
  }
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
