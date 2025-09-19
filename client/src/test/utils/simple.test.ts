import { describe, it, expect } from 'vitest';

// Simple utility functions for testing
export const add = (a: number, b: number): number => a + b;
export const multiply = (a: number, b: number): number => a * b;
export const divide = (a: number, b: number): number => {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
};

describe('Simple Math Functions', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
      expect(add(0, 0)).toBe(0);
      expect(add(10, 20)).toBe(30);
    });

    it('should add negative numbers', () => {
      expect(add(-2, -3)).toBe(-5);
      expect(add(-1, 1)).toBe(0);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', () => {
      expect(multiply(2, 3)).toBe(6);
      expect(multiply(0, 5)).toBe(0);
      expect(multiply(-2, 3)).toBe(-6);
    });
  });

  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(divide(6, 2)).toBe(3);
      expect(divide(10, 5)).toBe(2);
      expect(divide(7, 2)).toBe(3.5);
    });

    it('should throw error when dividing by zero', () => {
      expect(() => divide(5, 0)).toThrow('Division by zero');
    });
  });
});
