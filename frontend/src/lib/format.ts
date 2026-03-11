/**
 * Format raw sBTC amount (8 decimals) to human-readable string
 * Rules from PRD:
 * - If 0: display "0.00"
 * - If < 0.00000001: display "< 0.00000001"
 * - Show up to 8 decimals, trim trailing zeros but keep at least 2
 */
export function formatSbtc(raw: bigint): string {
  const num = Number(raw) / 1e8;
  
  if (num === 0) return '0.00';
  if (num < 0.00000001 && num > 0) return '< 0.00000001';
  
  // Format with up to 8 decimals
  const formatted = num.toFixed(8);
  
  // Remove trailing zeros but keep at least 2 decimal places
  const [intPart, decPart] = formatted.split('.');
  let trimmedDec = decPart.replace(/0+$/, '');
  
  // Pad to minimum 2 decimals
  if (trimmedDec.length < 2) {
    trimmedDec = trimmedDec.padEnd(2, '0');
  }
  
  // Format integer part with locale separators
  const formattedInt = Number(intPart).toLocaleString('en-US');
  
  return `${formattedInt}.${trimmedDec}`;
}

/**
 * Format share count with comma separators
 */
export function formatShares(shares: bigint): string {
  return Number(shares).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

/**
 * Truncate Stacks address for display
 * Format: ST1VZ...DZ1D
 */
export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Truncate transaction hash for display
 * Format: 0xb507...d690
 */
export function truncateTxHash(txId: string) {
  const hash = txId.startsWith('0x') ? txId : `0x${txId}`;
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/**
 * Parse user input to raw sBTC amount (bigint)
 * Handles decimal input like "1.5" -> 150000000n
 */
export function parseInputToRaw(input: string): bigint {
  const num = parseFloat(input);
  if (isNaN(num) || num < 0) return 0n;
  return BigInt(Math.floor(num * 1e8));
}

/**
 * Calculate share price from total assets and shares
 */
export function calculateSharePrice(totalAssets: bigint, totalShares: bigint): number {
  if (totalShares === 0n) return 1;
  return Number(totalAssets) / Number(totalShares);
}

/**
 * Calculate estimated APY from share price deviation
 * Returns percentage (e.g. 5.25 for 5.25%)
 */
export function calculateEstimatedApy(sharePrice: number): number {
  return (sharePrice - 1) * 100;
}

/**
 * Format APY for display
 */
export function formatApy(apy: number): string {
  if (apy === 0) return '0.00%';
  return `${apy >= 0 ? '+' : ''}${apy.toFixed(2)}%`;
}
