/**
 * Browser/WebView text-to-speech for 90 PDF.
 * No document text is sent to an application server by this module.
 * Actual voice availability depends on Android System TTS and installed voices.
 */
export interface SpeechOptions {
  language?: string;
  rate?: number;
  pitch?: number;
}

export function availableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

let activeSpeech = 0;
let activeReject: ((reason: Error) => void) | null = null;

function splitSpeechText(text: string, limit = 180): string[] {
  const words = text.trim().split(/\\s+/u);
  const chunks: string[] = [];
  let current = '';
  for (const word of words) {
    if (word.length > limit) {
      if (current) { chunks.push(current); current = ''; }
      for (let i = 0; i < word.length; i += limit) chunks.push(word.slice(i, i + limit));
      continue;
    }
    if (current && current.length + word.length + 1 > limit) {
      chunks.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function speakText(text: string, options: SpeechOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.reject(new Error('Text-to-speech is not supported by this device'));
  }
  if (!text.trim()) return Promise.reject(new Error('No text available for speech'));

  stopSpeech();
  const id = ++activeSpeech;
  const chunks = splitSpeechText(text);
  const rate = options.rate == null || !Number.isFinite(options.rate) ? 1 : Math.min(2, Math.max(0.5, options.rate));
  const pitch = options.pitch == null || !Number.isFinite(options.pitch) ? 1 : Math.min(2, Math.max(0, options.pitch));

  return new Promise<void>((resolve, reject) => {
    let index = 0;
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      if (activeSpeech === id) activeReject = null;
      if (error) reject(error);
      else resolve();
    };
    activeReject = (error) => finish(error);
    const next = () => {
      if (finished || activeSpeech !== id) return;
      if (index >= chunks.length) { finish(); return; }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = options.language || 'ar';
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.onend = next;
      utterance.onerror = (event) => finish(new Error('Speech failed: ' + event.error));
      try { window.speechSynthesis.speak(utterance); }
      catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
    };
    next();
  });
}

export function pauseSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.pause();
}

export function resumeSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.resume();
}

export function stopSpeech(): void {
  activeSpeech++;
  const rejectPrevious = activeReject;
  activeReject = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  rejectPrevious?.(new Error('Speech cancelled'));
}
