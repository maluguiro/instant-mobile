export function formatAmountInput(value: string): string {
  const cleaned = value.replace(/[^\d,.-]/g, '');
  if (!cleaned) return '';

  const negative = cleaned.startsWith('-');
  const unsigned = cleaned.replace(/-/g, '');
  const keepsTrailingComma = unsigned.endsWith(',');
  const normalized = unsigned.replace(/\./g, '');
  const [rawInteger = '', ...decimalParts] = normalized.split(',');
  const integerDigits = rawInteger.replace(/\D/g, '');
  const decimalDigits = decimalParts.join('').replace(/\D/g, '');

  const formattedInteger = integerDigits
    ? integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : '0';

  if (keepsTrailingComma && !decimalDigits) {
    return `${negative ? '-' : ''}${formattedInteger},`;
  }

  if (decimalParts.length > 0) {
    return `${negative ? '-' : ''}${formattedInteger},${decimalDigits}`;
  }

  return `${negative ? '-' : ''}${formattedInteger}`;
}

export function parseAmountInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;

  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}
