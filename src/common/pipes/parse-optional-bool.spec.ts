import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync, IsBoolean, IsOptional } from 'class-validator';
import { parseOptionalBool, ToOptionalBool } from './parse-optional-bool';

class BoolQuery {
  @IsOptional()
  @ToOptionalBool()
  @IsBoolean()
  flag?: boolean;
}

const toQuery = (plain: Record<string, unknown>) =>
  plainToInstance(BoolQuery, plain, { enableImplicitConversion: true });

describe('parseOptionalBool', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['TRUE', true],
    ['false', false],
    ['0', false],
    ['False', false],
    [true, true],
    [false, false],
  ])('maps %p to %p', (input, expected) => {
    expect(parseOptionalBool(input)).toBe(expected);
  });

  it('returns undefined when the value is missing', () => {
    expect(parseOptionalBool(undefined)).toBeUndefined();
    expect(parseOptionalBool('')).toBeUndefined();
  });

  it('leaves unknown values untouched so validation can reject them', () => {
    expect(parseOptionalBool('yes')).toBe('yes');
  });
});

describe('ToOptionalBool', () => {
  it('parses "false" as false despite implicit conversion', () => {
    const query = toQuery({ flag: 'false' });
    expect(query.flag).toBe(false);
    expect(validateSync(query)).toHaveLength(0);
  });

  it('parses "true" and "1" as true', () => {
    expect(toQuery({ flag: 'true' }).flag).toBe(true);
    expect(toQuery({ flag: '1' }).flag).toBe(true);
  });

  it('parses "0" as false', () => {
    expect(toQuery({ flag: '0' }).flag).toBe(false);
  });

  it('keeps the field undefined when omitted', () => {
    const query = toQuery({});
    expect(query.flag).toBeUndefined();
    expect(validateSync(query)).toHaveLength(0);
  });

  it('fails validation for unrecognised values', () => {
    expect(validateSync(toQuery({ flag: 'maybe' }))).toHaveLength(1);
  });
});
