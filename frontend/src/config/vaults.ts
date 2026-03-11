export interface VaultConfig {
  slug: string;
  contractName: string;
  name: string;
  badge: string;
  badgeColor: 'orange' | 'blue' | 'purple';
  description: string;
  longDescription: string;
  flowSteps: string[];
}

export const VAULTS: VaultConfig[] = [
  {
    slug: 'basalt-vault',
    contractName: 'basalt-vault',
    name: 'Basalt Vault',
    badge: 'Fee Accruing',
    badgeColor: 'orange',
    description: 'Earn yield from protocol fee accrual on deposited sBTC.',
    longDescription:
      'The reference Basalt Vault accepts sBTC deposits and mints proportional vault shares. The protocol owner periodically calls harvest-yield to inject additional sBTC, increasing the asset-per-share ratio. Early depositors accumulate more value as the share price appreciates over time.',
    flowSteps: ['User sBTC', 'Basalt Vault', 'Yield Accrual'],
  },
  {
    slug: 'lending-strategy',
    contractName: 'lending-strategy-vault',
    name: 'Lending Strategy',
    badge: 'Lending',
    badgeColor: 'blue',
    description: 'Automated sBTC lending through a DeFi lending market.',
    longDescription:
      'This vault deposits sBTC into a lending pool to earn interest automatically. When the vault owner calls sync-yield, accrued interest from the lending market is reflected in the vault share price. Depositors earn lending yield without managing positions directly.',
    flowSteps: ['User sBTC', 'Strategy Vault', 'Lending Pool', 'Interest'],
  },
  {
    slug: 'sbtc-yield',
    contractName: 'sbtc-yield-vault',
    name: 'sBTC Yield',
    badge: 'Meta-Vault',
    badgeColor: 'purple',
    description: 'Composable vault-on-vault strategy through Basalt Vault.',
    longDescription:
      'A meta-vault demonstrating Basalt composability. It deposits into the Basalt Vault and issues its own shares. Yield from the underlying Basalt Vault flows through to this vault, showcasing how protocols can build layered strategies on top of the vault standard.',
    flowSteps: ['User sBTC', 'Yield Vault', 'Basalt Vault', 'Yield Accrual'],
  },
];

export function getVaultBySlug(slug: string): VaultConfig | undefined {
  return VAULTS.find((v) => v.slug === slug);
}
