import { Transform } from 'class-transformer';

const TRUE_VALUES = new Set(['true', '1']);
const FALSE_VALUES = new Set(['false', '0']);

/**
 * Maps a raw query-string value to a boolean.
 *
 * - "true" / "1"  -> true
 * - "false" / "0" -> false
 * - undefined / "" -> undefined (parameter not provided)
 * - anything else is returned untouched so `@IsBoolean()` rejects it with a 400.
 */
export function parseOptionalBool(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  return value;
}

/**
 * Property decorator for boolean query DTO fields.
 *
 * The global ValidationPipe runs with `enableImplicitConversion`, which turns any
 * non-empty string (including "false") into `true`. Reading the raw value from
 * `obj[key]` bypasses that conversion so "false"/"0" are parsed correctly.
 */
export function ToOptionalBool(): PropertyDecorator {
  return Transform(({ obj, key }) => parseOptionalBool(obj[key]));
}
