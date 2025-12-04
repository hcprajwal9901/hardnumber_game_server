export function valid4UniqueDigits(s: string) {
  return (
    typeof s === 'string' &&
    /^\d{4}$/.test(s) &&
    new Set(s.split('')).size === 4
  );
}
