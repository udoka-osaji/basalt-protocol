import {
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  standardPrincipalCV,
  ClarityType,
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import { openContractCall } from '@stacks/connect';
import { DEPLOYER, API_URL } from '@/config/contracts';

// ── Read-only helpers ───────────────────────────────────────────────

async function readVault(
  contractName: string,
  functionName: string,
  args: any[] = [],
  senderAddress: string
): Promise<any> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName,
    functionName,
    functionArgs: args,
    network: STACKS_TESTNET,
    senderAddress,
  });

  if (result.type === ClarityType.ResponseOk) {
    return cvToValue(result.value);
  }

  throw new Error(`Contract error: ${JSON.stringify(cvToValue(result))}`);
}

// Get total sBTC in a vault
export async function getTotalAssets(
  vault: string,
  sender: string
): Promise<bigint> {
  const result = await readVault(vault, 'get-total-assets', [], sender);
  return BigInt(result);
}

// Get total shares issued
export async function getTotalShares(
  vault: string,
  sender: string
): Promise<bigint> {
  const result = await readVault(vault, 'get-total-shares', [], sender);
  return BigInt(result);
}

// Get user's share balance
export async function getShareBalance(
  vault: string,
  user: string,
  sender: string
): Promise<bigint> {
  const result = await readVault(
    vault,
    'get-share-balance',
    [standardPrincipalCV(user)],
    sender
  );
  return BigInt(result);
}

// Preview deposit: how many shares for X sBTC
export async function previewDeposit(
  vault: string,
  amount: bigint,
  sender: string
): Promise<bigint> {
  const result = await readVault(
    vault,
    'preview-deposit',
    [uintCV(amount)],
    sender
  );
  return BigInt(result);
}

// Preview withdraw: how many sBTC for X shares
export async function previewWithdraw(
  vault: string,
  shares: bigint,
  sender: string
): Promise<bigint> {
  const result = await readVault(
    vault,
    'preview-withdraw',
    [uintCV(shares)],
    sender
  );
  return BigInt(result);
}

// ── Write operations ────────────────────────────────────────────────

export async function deposit(
  vault: string,
  amount: bigint
): Promise<string> {
  return new Promise((resolve, reject) => {
    openContractCall({
      contractAddress: DEPLOYER,
      contractName: vault,
      functionName: 'deposit',
      functionArgs: [uintCV(amount)],
      network: STACKS_TESTNET,
      onFinish: (data) => resolve(data.txId),
      onCancel: () => reject(new Error('Transaction cancelled by user')),
    });
  });
}

export async function withdraw(
  vault: string,
  shares: bigint
): Promise<string> {
  return new Promise((resolve, reject) => {
    openContractCall({
      contractAddress: DEPLOYER,
      contractName: vault,
      functionName: 'withdraw',
      functionArgs: [uintCV(shares)],
      network: STACKS_TESTNET,
      onFinish: (data) => resolve(data.txId),
      onCancel: () => reject(new Error('Transaction cancelled by user')),
    });
  });
}

// ── sBTC Balance ────────────────────────────────────────────────────

export async function getSbtcBalance(address: string): Promise<bigint> {
  try {
    const res = await fetch(
      `${API_URL}/extended/v1/address/${address}/balances`
    );
    const data = await res.json();

    // sBTC is a fungible token under the deployer's sbtc-token contract
    const sbtcKey = Object.keys(data.fungible_tokens || {}).find((k) =>
      k.includes('sbtc-token::sbtc-token')
    );

    return sbtcKey ? BigInt(data.fungible_tokens[sbtcKey].balance) : 0n;
  } catch (error) {
    console.error('Failed to fetch sBTC balance:', error);
    return 0n;
  }
}
