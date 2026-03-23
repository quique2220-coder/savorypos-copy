import { describe, it, expect } from 'vitest';
import { costPerBaseUnit } from '../recipeCalculator';
import { getConversionFactor } from '../units';

describe('getConversionFactor', () => {
  it('should convert 7.5 liters to milliliters (l -> ml)', () => {
    const factor = getConversionFactor('l', 'ml');
    expect(factor).toBe(1000);
  });

  it('should convert 1 kilogram to grams (kg -> g)', () => {
    const factor = getConversionFactor('kg', 'g');
    expect(factor).toBe(1000);
  });

  it('should return 1 for same unit (g -> g)', () => {
    const factor = getConversionFactor('g', 'g');
    expect(factor).toBe(1);
  });

  it('should return null for invalid conversion (l -> g)', () => {
    const factor = getConversionFactor('l', 'g');
    expect(factor).toBeNull();
  });

  it('should handle inverse conversions (ml -> l)', () => {
    const factor = getConversionFactor('ml', 'l');
    expect(factor).toBe(0.001);
  });

  it('should handle inverse conversions (g -> kg)', () => {
    const factor = getConversionFactor('g', 'kg');
    expect(factor).toBe(0.001);
  });
});

describe('costPerBaseUnit', () => {
  it('should calculate cost for 7.5L at $5.95 to ml = $0.0007933', () => {
    const ingredient = {
      purchase_price: 5.95,
      purchase_quantity: 7.5,
      purchase_unit: 'l',
      base_unit: 'ml',
      yield_percent: 100,
    };
    const cost = costPerBaseUnit(ingredient);
    expect(cost).toBeCloseTo(0.0007933, 6);
  });

  it('should calculate cost for 1kg at $10 to g = $0.01', () => {
    const ingredient = {
      purchase_price: 10,
      purchase_quantity: 1,
      purchase_unit: 'kg',
      base_unit: 'g',
      yield_percent: 100,
    };
    const cost = costPerBaseUnit(ingredient);
    expect(cost).toBeCloseTo(0.01, 6);
  });

  it('should handle same unit conversion (g -> g)', () => {
    const ingredient = {
      purchase_price: 5,
      purchase_quantity: 500,
      purchase_unit: 'g',
      base_unit: 'g',
      yield_percent: 100,
    };
    const cost = costPerBaseUnit(ingredient);
    expect(cost).toBeCloseTo(0.01, 6);
  });

  it('should return 0 for invalid unit conversion (l -> g)', () => {
    const ingredient = {
      purchase_price: 5.95,
      purchase_quantity: 7.5,
      purchase_unit: 'l',
      base_unit: 'g',
      yield_percent: 100,
    };
    const cost = costPerBaseUnit(ingredient);
    expect(cost).toBe(0);
  });

  it('should increase cost with 80% yield', () => {
    const ingredient = {
      purchase_price: 10,
      purchase_quantity: 1,
      purchase_unit: 'kg',
      base_unit: 'g',
      yield_percent: 80,
    };
    const cost = costPerBaseUnit(ingredient);
    const expectedCost = 0.01 / (80 / 100);
    expect(cost).toBeCloseTo(expectedCost, 6);
  });

  it('should return 0 for null ingredient', () => {
    const cost = costPerBaseUnit(null);
    expect(cost).toBe(0);
  });

  it('should handle missing purchase_unit and base_unit gracefully', () => {
    const ingredient = {
      purchase_price: 10,
      purchase_quantity: 1,
      yield_percent: 100,
    };
    const cost = costPerBaseUnit(ingredient);
    expect(cost).toBe(0);
  });
});