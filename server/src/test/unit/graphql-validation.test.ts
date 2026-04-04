import { describe, it, expect } from 'vitest';

import {
  sanitizeGraphQLInput,
  validateAnnouncementInput,
  validateEvciRequestInput,
} from '../../graphql/utils/validateInput';

describe('sanitizeGraphQLInput', () => {
  it('strips HTML tags from strings', () => {
    const input = { title: '<script>alert("xss")</script>Hello' };
    const result = sanitizeGraphQLInput(input);
    expect(result.title).toBe('Hello');
  });

  it('strips MongoDB $ operators from keys', () => {
    const input = { $gt: 100, name: 'test', $where: 'evil' };
    const result = sanitizeGraphQLInput(input);
    expect(result).not.toHaveProperty('$gt');
    expect(result).not.toHaveProperty('$where');
    expect(result).toHaveProperty('name', 'test');
  });

  it('handles nested objects', () => {
    const input = {
      outer: {
        $ne: 'bad',
        inner: '<b>bold</b> text',
      },
    };
    const result = sanitizeGraphQLInput(input);
    expect(result.outer).not.toHaveProperty('$ne');
    expect(result.outer.inner).toBe('bold text');
  });

  it('handles arrays', () => {
    const input = {
      items: ['<em>one</em>', '<b>two</b>', 'three'],
    };
    const result = sanitizeGraphQLInput(input);
    expect(result.items).toEqual(['one', 'two', 'three']);
  });

  it('preserves non-string primitives', () => {
    const input = { count: 42, active: true, value: null, score: 3.14 };
    const result = sanitizeGraphQLInput(input);
    expect(result).toEqual({ count: 42, active: true, value: null, score: 3.14 });
  });
});

describe('validateAnnouncementInput', () => {
  const validInput = {
    title: 'Test Announcement',
    content: 'This is a test announcement body.',
  };

  it('throws on missing title', () => {
    expect(() => validateAnnouncementInput({ ...validInput, title: '' })).toThrow('title');
  });

  it('throws on title >200 chars', () => {
    expect(() => validateAnnouncementInput({ ...validInput, title: 'a'.repeat(201) })).toThrow(
      'title',
    );
  });

  it('passes on valid input', () => {
    expect(() => validateAnnouncementInput(validInput)).not.toThrow();
  });
});

describe('validateEvciRequestInput', () => {
  const validInput = {
    startDate: '2026-04-10',
    endDate: '2026-04-12',
    destination: 'Ankara',
  };

  it('throws on missing startDate', () => {
    expect(() => validateEvciRequestInput({ ...validInput, startDate: '' })).toThrow('startDate');
  });

  it('throws on missing destination', () => {
    expect(() => validateEvciRequestInput({ ...validInput, destination: '' })).toThrow(
      'destination',
    );
  });

  it('passes on valid input', () => {
    expect(() => validateEvciRequestInput(validInput)).not.toThrow();
  });
});
