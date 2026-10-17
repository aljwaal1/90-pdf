/**
 * 90 PDF privacy-conscious diagnostics.
 * Keep reports local and exclude document contents, file names and paths.
 */
export type DiagnosticEvent = {
  time: string;
  tool: string;
  stage: string;
  message: string;
  platform: string;
};

const events: DiagnosticEvent[] = [];
const MAX_EVENTS = 100;
const STORAGE_KEY = '90pdf_local_diagnostics_v2';

function restoreEvents(): void {
  if (typeof window === 'undefined' || events.length) return;
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(stored)) {
      for (const item of stored.slice(-MAX_EVENTS)) {
        if (item && typeof item === 'object' &&
            typeof item.time === 'string' && typeof item.tool === 'string' &&
            typeof item.stage === 'string' && typeof item.message === 'string' &&
            typeof item.platform === 'string') {
          events.push({ time: item.time.slice(0, 40), tool: item.tool.slice(0, 80),
            stage: item.stage.slice(0, 80), message: redact(item.message), platform: item.platform.slice(0, 40) });
        }
      }
    }
  } catch { /* Private mode or invalid storage */ }
}

function persistEvents(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch { /* Storage unavailable */ }
}

function redact(message: string): string {
  return message
    .replace(/(?:content|file):\/\/[^\s"'<>]+/gi, '[private-uri]')
    .replace(/(?:[A-Za-z]:\\|\/)(?:[^\s"'<>]+[\\/])*[^\s"'<>]+/g, '[private-path]')
    .slice(0, 500);
}

export function recordToolError(tool: string, stage: string, error: unknown): void {
  restoreEvents();
  const message = error instanceof Error ? error.message : String(error);
  events.push({
    time: new Date().toISOString(),
    tool: tool.slice(0, 80),
    stage: stage.slice(0, 80),
    message: redact(message),
    platform: typeof navigator === 'undefined' ? 'unknown' : /Android/i.test(navigator.userAgent) ? 'Android' : 'Web/Desktop',
  });
  if (events.length > MAX_EVENTS) events.shift();
  persistEvents();
}

export function getDiagnosticReport(): string {
  restoreEvents();
  return [
    '90 PDF - Local Diagnostic Report',
    'Generated: ' + new Date().toISOString(),
    'No document content is intentionally collected.',
    ...events.map((e, i) => [
      '#'+(i+1), 'Time: '+e.time, 'Tool: '+e.tool,
      'Stage: '+e.stage, 'Platform: '+e.platform,
      'Error: '+e.message,
    ].join('\n')),
  ].join('\n\n');
}

export function clearDiagnosticReport(): void {
  events.length = 0;
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage unavailable */ }
  }
}
