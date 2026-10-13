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

export function speakText(text: string, options: SpeechOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      reject(new Error('Text-to-speech is not supported by this device'));
      return;
    }
    if (!text.trim()) {
      reject(new Error('No text available for speech'));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.language || 'ar';
    utterance.rate = Math.min(2, Math.max(0.5, options.rate ?? 1));
    utterance.pitch = Math.min(2, Math.max(0, options.pitch ?? 1));
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error('Speech failed: ' + event.error));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function pauseSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.pause();
}

export function resumeSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.resume();
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
