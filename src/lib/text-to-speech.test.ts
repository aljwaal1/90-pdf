import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speakText, stopSpeech } from './text-to-speech';

type FakeUtterance = {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

describe('long document speech', () => {
  const queued: FakeUtterance[] = [];
  const speak = vi.fn((utterance: FakeUtterance) => queued.push(utterance));
  const cancel = vi.fn();

  beforeEach(() => {
    queued.length = 0;
    speak.mockClear();
    cancel.mockClear();
    vi.stubGlobal('window', { speechSynthesis: { speak, cancel, pause: vi.fn(), resume: vi.fn() } });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      constructor(text: string) { this.text = text; }
    });
  });

  afterEach(() => {
    stopSpeech();
    vi.unstubAllGlobals();
  });

  it('reads long Arabic documents in bounded sequential chunks', async () => {
    const original = Array(150).fill('مرحبا بالعالم').join(' ');
    const completion = speakText(original, { language: 'ar' });
    let processed = 0;
    while (processed < queued.length) {
      const utterance = queued[processed++];
      expect(utterance.text.length).toBeLessThanOrEqual(180);
      expect(utterance.lang).toBe('ar');
      utterance.onend?.();
    }
    await completion;
    expect(processed).toBeGreaterThan(1);
    expect(queued.map(x => x.text).join(' ')).toBe(original);
  });

  it('splits oversized unbroken text without dropping characters', async () => {
    const original = 'أ'.repeat(510);
    const completion = speakText(original, { language: 'ar' });
    let processed = 0;
    while (processed < queued.length) {
      const utterance = queued[processed++];
      expect(utterance.text.length).toBeLessThanOrEqual(180);
      utterance.onend?.();
    }
    await completion;
    expect(processed).toBe(3);
    expect(queued.map(x => x.text).join('')).toBe(original);
  });

  it('rejects speech engine errors instead of reporting success', async () => {
    const completion = speakText('مرحبا');
    queued[0].onerror?.({ error: 'voice-unavailable' });
    await expect(completion).rejects.toThrow('voice-unavailable');
  });

  it('rejects cancelled speech instead of reporting completion', async () => {
    const completion = speakText('one two three');
    stopSpeech();
    await expect(completion).rejects.toThrow('Speech cancelled');
  });

  it('clamps non-finite voice settings', async () => {
    const completion = speakText('hello', { rate: Number.NaN, pitch: Infinity });
    expect(queued[0].rate).toBe(1);
    expect(queued[0].pitch).toBe(1);
    queued[0].onend?.();
    await completion;
  });
});
