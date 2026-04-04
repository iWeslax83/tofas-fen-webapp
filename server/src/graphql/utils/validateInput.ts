/**
 * GraphQL Input Validation & Sanitization
 * Prevents XSS and NoSQL injection in GraphQL mutations
 */

import DOMPurify from 'isomorphic-dompurify';
import { GraphQLError } from 'graphql';

/**
 * Recursively sanitize GraphQL input:
 * - Strip HTML tags from all string values
 * - Remove keys starting with '$' (MongoDB operator injection)
 */
export function sanitizeGraphQLInput<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeGraphQLInput(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (key.startsWith('$')) {
        continue; // Strip MongoDB operators
      }
      sanitized[key] = sanitizeGraphQLInput(value);
    }
    return sanitized as T;
  }

  // Primitives (number, boolean) pass through unchanged
  return input;
}

/**
 * Validate announcement creation input
 */
export function validateAnnouncementInput(input: { title?: string; content?: string }): void {
  if (!input.title || input.title.trim().length === 0) {
    throw new GraphQLError('title is required', {
      extensions: { code: 'BAD_USER_INPUT', field: 'title' },
    });
  }

  if (input.title.length > 200) {
    throw new GraphQLError('title must be at most 200 characters', {
      extensions: { code: 'BAD_USER_INPUT', field: 'title' },
    });
  }

  if (input.content && input.content.length > 5000) {
    throw new GraphQLError('content must be at most 5000 characters', {
      extensions: { code: 'BAD_USER_INPUT', field: 'content' },
    });
  }
}

/**
 * Validate evci (leave) request creation input
 */
export function validateEvciRequestInput(input: {
  startDate?: string;
  endDate?: string;
  destination?: string;
}): void {
  if (!input.startDate || input.startDate.trim().length === 0) {
    throw new GraphQLError('startDate is required', {
      extensions: { code: 'BAD_USER_INPUT', field: 'startDate' },
    });
  }

  if (!input.endDate || input.endDate.trim().length === 0) {
    throw new GraphQLError('endDate is required', {
      extensions: { code: 'BAD_USER_INPUT', field: 'endDate' },
    });
  }

  if (!input.destination || input.destination.trim().length === 0) {
    throw new GraphQLError('destination is required', {
      extensions: { code: 'BAD_USER_INPUT', field: 'destination' },
    });
  }

  if (input.destination.length > 200) {
    throw new GraphQLError('destination must be at most 200 characters', {
      extensions: { code: 'BAD_USER_INPUT', field: 'destination' },
    });
  }
}
