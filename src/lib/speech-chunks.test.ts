import { describe, expect, it } from 'vitest';
import { splitSpeechText } from './speech-chunks';

describe('splitSpeechText', () => {
  it('handles empty input and short phrases', () => {
    expect(splitSpeechText(' \n ')).toEqual([]);
    expect(splitSpeechText('مرحبا Hello')).toEqual(['مرحبا Hello']);
  });

  it('preserves the normalized text of long Arabic documents', () => {
    const input = 'مرحبا بكم في تطبيق تسعين PDF. '.repeat(160);
    const parts = splitSpeechText(input);
    expect(parts.length).toBeGreaterThan(10);
    expect(parts.every((part) => part.length <= 220)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(input.trim().replace(/\s+/g, ' '));
  });

  it('splits English text and unspaced input within bounds', () => {
    const english = 'Hello world. How are you? '.repeat(70);
    const chunks = splitSpeechText(english, 80);
    expect(chunks.every((part) => part.length <= 80)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(english.trim());
    expect(splitSpeechText('a'.repeat(650)).every((part) => part.length <= 220)).toBe(true);
  });

  it('falls back safely for non-finite chunk sizes', () => {
    expect(splitSpeechText('x'.repeat(450), Infinity).map((part) => part.length))
      .toEqual([220, 220, 10]);
  });
});
