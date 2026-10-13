/** Split long Arabic/English documents into speech-engine-safe utterances. */
export function splitSpeechText(text: string, maxLength = 220): string[] {
  const limit = Number.isFinite(maxLength) ? Math.max(20, Math.floor(maxLength)) : 220;
  const source = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let position = 0;

  while (position < source.length) {
    let end = Math.min(position + limit, source.length);
    if (end < source.length) {
      const segment = source.slice(position, end);
      const punctuation = Math.max(
        segment.lastIndexOf('. '), segment.lastIndexOf('! '),
        segment.lastIndexOf('? '), segment.lastIndexOf('؟ '),
        segment.lastIndexOf('، '), segment.lastIndexOf('؛ ')
      );
      const space = segment.lastIndexOf(' ');
      if (punctuation >= Math.floor(limit / 3)) end = position + punctuation + 1;
      else if (space >= Math.floor(limit / 3)) end = position + space + 1;
    }
    const chunk = source.slice(position, end).trim();
    if (chunk) chunks.push(chunk);
    position = end;
  }
  return chunks;
}
