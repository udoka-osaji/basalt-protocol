export const DEPLOYER = 'ST1VZVQT5H74YFFEN8VD4KDQEZVW21ZJ6EVK8DZ1D';
export const NETWORK = 'testnet' as const;
export const API_URL = 'https://api.testnet.hiro.so';
export const EXPLORER_URL = 'https://explorer.hiro.so';

export const ERROR_MESSAGES: Record<number, string> = {
  // basalt-vault
  1000: 'Not authorized to perform this action.',
  1001: 'Amount must be greater than zero.',
  1002: 'Insufficient share balance for this withdrawal.',
  1003: 'sBTC transfer failed. Please try again.',
  1004: 'Deposit too small to mint any shares at current price.',
  1005: 'Vault has zero supply — unexpected state.',
  // sbtc-yield-vault
  2000: 'Not authorized to perform this action.',
  2001: 'Amount must be greater than zero.',
  2002: 'Insufficient share balance for this withdrawal.',
  2003: 'sBTC transfer failed. Please try again.',
  2004: 'Deposit too small to mint any shares at current price.',
  // lending-strategy-vault
  3000: 'Not authorized to perform this action.',
  3001: 'Amount must be greater than zero.',
  3002: 'Insufficient share balance for this withdrawal.',
  3003: 'sBTC transfer failed. Please try again.',
  // vault-trait / general
  4000: 'Not authorized to perform this action.',
  4001: 'Amount must be greater than zero.',
  4002: 'Insufficient share balance for this withdrawal.',
  4003: 'sBTC transfer failed. Please try again.',
  4004: 'Deposit too small to mint any shares at current price.',
};

export function getErrorMessage(code: number): string {
  return ERROR_MESSAGES[code] || `Unknown error (code: ${code})`;
}

export function getExplorerUrl(txId: string): string {
  return `${EXPLORER_URL}/txid/${txId}?chain=${NETWORK}`;
}

export function getAddressExplorerUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}?chain=${NETWORK}`;
}
