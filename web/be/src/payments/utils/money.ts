export function rupeesStringToPaise(rupees: string | number | undefined | null): number {
  if (rupees === undefined || rupees === null) return 0;
  
  // Convert number to fixed string to prevent binary float conversion issues
  const str = typeof rupees === 'string' ? rupees.trim() : rupees.toFixed(2);
  if (!str || str === 'NaN') return 0;

  const parts = str.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';

  const integerPaise = parseInt(integerPart || '0', 10) * 100;

  // Pad or slice decimal part to exactly 2 digits (e.g. "3" -> "30", "356" -> "35")
  const paddedDecimal = (decimalPart + '00').slice(0, 2);
  const decimalPaise = parseInt(paddedDecimal, 10);

  const sign = str.startsWith('-') ? -1 : 1;
  const absIntegerPaise = Math.abs(integerPaise);

  return sign * (absIntegerPaise + decimalPaise);
}

export function paiseToRupeesString(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const integerPart = Math.floor(absPaise / 100);
  const decimalPart = absPaise % 100;
  const paddedDecimal = (decimalPart < 10 ? '0' : '') + decimalPart;
  return (isNegative ? '-' : '') + `${integerPart}.${paddedDecimal}`;
}

export function parseRateToBasisPoints(rateInput: string | number): number {
  if (rateInput === undefined || rateInput === null) {
    throw new Error('Earning rate configuration is missing.');
  }
  const rateStr = rateInput.toString();
  const val = rateStr.trim();
  if (!/^\d+(\.\d+)?$/.test(val)) {
    throw new Error(`Invalid earning rate configuration format: "${rateStr}"`);
  }

  const parts = val.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts[1] || '';

  const integerBps = parseInt(integerPart, 10) * 10000;
  const paddedDecimal = (decimalPart + '0000').slice(0, 4);
  const decimalBps = parseInt(paddedDecimal, 10);

  const bps = integerBps + decimalBps;
  if (bps < 0 || bps > 50000) {
    throw new Error(`Earning rate is out of valid range (0 to 50000 bps): "${rateStr}"`);
  }

  return bps;
}
