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
const MAX_EVENTS = 40;

function redact(message: string): string {
  return message
    .replace(/(?:content|file):\/\/[^\s"'<>]+/gi, '[private-uri]')
    .replace(/(?:[A-Za-z]:\\|\/)(?:[^\s"'<>]+[\\/])*[^\s"'<>]+/g, '[private-path]')
    .slice(0, 500);
}

export function recordToolError(tool: string, stage: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  events.push({
    time: new Date().toISOString(),
    tool: tool.slice(0, 80),
    stage: stage.slice(0, 80),
    message: redact(message),
    platform: typeof navigator === 'undefined' ? 'unknown' : /Android/i.test(navigator.userAgent) ? 'Android' : 'Web/Desktop',
  });
  if (events.length > MAX_EVENTS) events.shift();
}

export function getDiagnosticReport(): string {
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
}
