// Normalizes Indian mobile numbers to E.164 (+91XXXXXXXXXX).
// Accepts: 9876543210, 09876543210, 919876543210, +91 98765-43210, etc.
// Returns null if it doesn't look like a valid Indian mobile number.
// TODO: support non-Indian numbers (NRI patients) when a clinic needs it.
export function normalizeIndianPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)

  // Indian mobiles are 10 digits starting with 6-9
  if (!/^[6-9]\d{9}$/.test(digits)) return null
  return `+91${digits}`
}