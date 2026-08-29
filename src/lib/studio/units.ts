import { MeasurementUnit, PageOrientation } from './types';

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const SCREEN_DPI = 96; // Standard screen DPI
export const MM_TO_PX_RATIO = SCREEN_DPI / 25.4; // approx 3.7795 px per mm
export const PRINT_DPI = 300; // Print resolution DPI
export const PRINT_MM_TO_PX = PRINT_DPI / 25.4; // approx 11.811 px per mm

export function getA4Dimensions(orientation: PageOrientation): { width: number; height: number } {
  if (orientation === 'landscape') {
    return { width: A4_HEIGHT_MM, height: A4_WIDTH_MM }; // 297 x 210
  }
  return { width: A4_WIDTH_MM, height: A4_HEIGHT_MM }; // 210 x 297
}

/**
 * Convert millimeters to target display unit
 */
export function mmToUnit(valMm: number, targetUnit: MeasurementUnit): number {
  switch (targetUnit) {
    case 'mm':
      return Math.round(valMm * 10) / 10;
    case 'cm':
      return Math.round((valMm / 10) * 100) / 100;
    case 'inch':
      return Math.round((valMm / 25.4) * 1000) / 1000;
    case 'px':
      return Math.round(valMm * MM_TO_PX_RATIO);
    default:
      return valMm;
  }
}

/**
 * Convert value from given unit to millimeters
 */
export function unitToMm(value: number, fromUnit: MeasurementUnit): number {
  switch (fromUnit) {
    case 'mm':
      return value;
    case 'cm':
      return value * 10;
    case 'inch':
      return value * 25.4;
    case 'px':
      return value / MM_TO_PX_RATIO;
    default:
      return value;
  }
}

/**
 * Format mm value with unit label
 */
export function formatValueWithUnit(valMm: number, unit: MeasurementUnit, precision = 1): string {
  const converted = mmToUnit(valMm, unit);
  switch (unit) {
    case 'mm':
      return `${converted.toFixed(precision)} mm`;
    case 'cm':
      return `${converted.toFixed(precision + 1)} cm`;
    case 'inch':
      return `${converted.toFixed(precision + 2)}"`;
    case 'px':
      return `${Math.round(converted)} px`;
  }
}

export const SIZE_PRESETS = [
  {
    name: 'Indian Passport (35 × 45 mm)',
    category: 'ID / Passport' as const,
    widthMm: 35,
    heightMm: 45,
    description: 'Standard passport / visa photo size for India & Schengen',
  },
  {
    name: 'US / Pan Card 2×2" (50.8 × 50.8 mm)',
    category: 'ID / Passport' as const,
    widthMm: 50.8,
    heightMm: 50.8,
    description: 'US Passport / OCI / Square ID photo size',
  },
  {
    name: 'Stamp Size (20 × 25 mm)',
    category: 'ID / Passport' as const,
    widthMm: 20,
    heightMm: 25,
    description: 'Mini stamp photo for government forms & cards',
  },
  {
    name: 'Standard 4×6" (101.6 × 152.4 mm)',
    category: 'Standard Prints' as const,
    widthMm: 101.6,
    heightMm: 152.4,
    description: 'Postcard / Album photo size (2 fit per A4)',
  },
  {
    name: 'Medium 5×7" (127 × 177.8 mm)',
    category: 'Standard Prints' as const,
    widthMm: 127,
    heightMm: 177.8,
    description: 'Desk frame photo size',
  },
  {
    name: 'Mini Print 3.5×5" (88.9 × 127 mm)',
    category: 'Standard Prints' as const,
    widthMm: 88.9,
    heightMm: 127,
    description: 'Classic pocket album size (4 fit per A4)',
  },
  {
    name: 'Wallet Size 2.5×3.5" (63.5 × 88.9 mm)',
    category: 'Standard Prints' as const,
    widthMm: 63.5,
    heightMm: 88.9,
    description: 'Standard wallet photo size (9 fit per A4)',
  },
  {
    name: 'Full A4 Margined (190 × 277 mm)',
    category: 'Document' as const,
    widthMm: 190,
    heightMm: 277,
    description: 'Full page photo with 10mm border',
  },
];
