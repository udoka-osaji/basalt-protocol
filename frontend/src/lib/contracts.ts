import {
  fetchCallReadOnlyFunction,
  cvToValue,
  Cl,
  ClarityType,
  Pc,
} from '@stacks/transactions';
import { request } from '@stacks/connect';
import { DEPLOYER, API_URL, NETWORK } from '@/config/contracts';

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
    network: NETWORK,
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
    [Cl.standardPrincipal(user)],
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
    [Cl.uint(amount)],
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
    [Cl.uint(shares)],
    sender
  );
  return BigInt(result);
}

// ── sBTC token contract identifier ──────────────────────────────────

// On testnet, sBTC is deployed by this address
const SBTC_CONTRACT = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token';
const SBTC_ASSET = 'sbtc-token';

// ── Write operations ────────────────────────────────────────────────

export async function deposit(
  vault: string,
  amount: bigint,
  senderAddress: string
): Promise<string> {
  // Post-condition: the user (sender) will send at most `amount` sBTC
  const postCondition = Pc.principal(senderAddress)
    .willSendLte(amount)
    .ft(SBTC_CONTRACT, SBTC_ASSET);

  const result = await request('stx_callContract', {
    contract: `${DEPLOYER}.${vault}`,
    functionName: 'deposit',
    functionArgs: [Cl.uint(amount)],
    network: NETWORK,
    postConditions: [postCondition],
    postConditionMode: 'deny',
  });

  return result.txid ?? '';
}

export async function withdraw(
  vault: string,
  shares: bigint
): Promise<string> {
  const result = await request('stx_callContract', {
    contract: `${DEPLOYER}.${vault}`,
    functionName: 'withdraw',
    functionArgs: [Cl.uint(shares)],
    network: NETWORK,
    postConditionMode: 'allow',
  });

  return result.txid ?? '';
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
