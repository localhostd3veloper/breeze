import { genUiSchema, type GenUiSpec } from './schema';

export type ParseResult =
  | { ok: true; spec: GenUiSpec }
  /**
   * The text is a prefix of a valid spec — the fence is still arriving. The
   * renderer shows a skeleton, never an error. Distinguishing this from a real
   * failure is what stops a widget flashing red on every token mid-stream.
   */
  | { ok: false; incomplete: true }
  | { ok: false; incomplete: false; error: string };

/**
 * True when `json` is a truncated prefix rather than malformed: braces or
 * brackets still open, or the text ends inside a string literal.
 *
 * Scans character by character so that punctuation *inside* strings — the `{`
 * in `"a { b"`, an escaped quote — cannot skew the depth count.
 */
function looksTruncated(json: string): boolean {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (const ch of json) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
  }

  return inString || depth > 0;
}

/**
 * Strip trailing commas (`,}` / `,]`), which small models emit routinely.
 *
 * Applied only after `JSON.parse` has already failed, and skipped while inside a
 * string literal so a comma in prose is never touched.
 */
function stripTrailingCommas(json: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escaped) {
      escaped = false;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ',') {
      // Look ahead past whitespace: a comma before `}` or `]` is trailing.
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) j++;
      if (json[j] === '}' || json[j] === ']') continue;
    }
    out += ch;
  }

  return out;
}

/**
 * Parse the body of a ```breeze-ui fence into a validated spec. Never throws.
 *
 * Tolerates the shapes a model actually produces: surrounding prose, a nested
 * fence marker, trailing commas. It does not tolerate anything outside the
 * schema — an unknown widget type is a failure, not a render.
 */
export function parseGenUiSpec(raw: string): ParseResult {
  const text = raw.trim();
  if (text === '') return { ok: false, incomplete: true };

  // The model occasionally re-opens a fence inside the fence.
  const unfenced = text.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');

  const open = unfenced.indexOf('{');
  if (open === -1) {
    // No object yet — either the fence just opened, or it is prose.
    return looksTruncated(unfenced) || unfenced.length < 2
      ? { ok: false, incomplete: true }
      : { ok: false, incomplete: false, error: 'No JSON object found' };
  }

  const close = unfenced.lastIndexOf('}');
  const candidate = close > open ? unfenced.slice(open, close + 1) : unfenced.slice(open);

  if (looksTruncated(candidate)) return { ok: false, incomplete: true };

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    try {
      parsed = JSON.parse(stripTrailingCommas(candidate));
    } catch {
      return { ok: false, incomplete: false, error: 'Malformed JSON' };
    }
  }

  const result = genUiSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path?.length ? ` (at ${issue.path.join('.')})` : '';
    return {
      ok: false,
      incomplete: false,
      error: `${issue?.message ?? 'Invalid spec'}${path}`,
    };
  }

  return { ok: true, spec: result.data };
}
