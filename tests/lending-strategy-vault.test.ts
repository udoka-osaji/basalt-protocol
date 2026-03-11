import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("lending-strategy-vault", () => {
  it("initializes with zero totals", () => {
    const assets = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-assets", [], deployer);
    expect(assets.result).toBeOk(Cl.uint(0));

    const shares = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-shares", [], deployer);
    expect(shares.result).toBeOk(Cl.uint(0));
  });

  it("deposits sBTC through vault into lending pool", () => {
    const depositAmount = 5000;
    const { result } = simnet.callPublicFn(
      "lending-strategy-vault",
      "deposit",
      [Cl.uint(depositAmount)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(depositAmount));

    // Vault tracks its own shares and assets
    const vaultShares = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-shares", [], deployer);
    expect(vaultShares.result).toBeOk(Cl.uint(depositAmount));

    const vaultAssets = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-assets", [], deployer);
    expect(vaultAssets.result).toBeOk(Cl.uint(depositAmount));

    // Lending pool should have the deposit from the vault contract
    const vaultPrincipal = `${deployer}.lending-strategy-vault`;
    const poolBalance = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-depositor-balance",
      [Cl.principal(vaultPrincipal)],
      deployer
    );
    expect(poolBalance.result).toBeOk(
      Cl.tuple({ "principal-amount": Cl.uint(depositAmount), "interest-earned": Cl.uint(0) })
    );
  });

  it("rejects deposit of zero amount", () => {
    const { result } = simnet.callPublicFn(
      "lending-strategy-vault",
      "deposit",
      [Cl.uint(0)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(4001));
  });

  it("withdraws sBTC from lending pool back to user", () => {
    simnet.callPublicFn("lending-strategy-vault", "deposit", [Cl.uint(5000)], wallet1);

    const { result } = simnet.callPublicFn(
      "lending-strategy-vault",
      "withdraw",
      [Cl.uint(5000)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(5000));

    // Vault should be empty
    const vaultAssets = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-assets", [], deployer);
    expect(vaultAssets.result).toBeOk(Cl.uint(0));

    const vaultShares = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-shares", [], deployer);
    expect(vaultShares.result).toBeOk(Cl.uint(0));

    // Lending pool should be empty for this vault
    const vaultPrincipal = `${deployer}.lending-strategy-vault`;
    const poolBalance = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-depositor-balance",
      [Cl.principal(vaultPrincipal)],
      deployer
    );
    expect(poolBalance.result).toBeOk(
      Cl.tuple({ "principal-amount": Cl.uint(0), "interest-earned": Cl.uint(0) })
    );
  });

  it("rejects withdrawal of zero shares", () => {
    const { result } = simnet.callPublicFn(
      "lending-strategy-vault",
      "withdraw",
      [Cl.uint(0)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(4001));
  });

  it("rejects withdrawal exceeding balance", () => {
    simnet.callPublicFn("lending-strategy-vault", "deposit", [Cl.uint(500)], wallet1);
    const { result } = simnet.callPublicFn(
      "lending-strategy-vault",
      "withdraw",
      [Cl.uint(1000)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(4002));
  });

  it("multiple users can deposit into strategy vault", () => {
    simnet.callPublicFn("lending-strategy-vault", "deposit", [Cl.uint(3000)], wallet1);
    simnet.callPublicFn("lending-strategy-vault", "deposit", [Cl.uint(7000)], wallet2);

    const totalShares = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-shares", [], deployer);
    expect(totalShares.result).toBeOk(Cl.uint(10000));

    const w1Balance = simnet.callReadOnlyFn(
      "lending-strategy-vault",
      "get-share-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(w1Balance.result).toBeOk(Cl.uint(3000));

    const w2Balance = simnet.callReadOnlyFn(
      "lending-strategy-vault",
      "get-share-balance",
      [Cl.principal(wallet2)],
      deployer
    );
    expect(w2Balance.result).toBeOk(Cl.uint(7000));
  });

  it("sync-yield captures lending pool interest", () => {
    // Deposit into vault
    simnet.callPublicFn("lending-strategy-vault", "deposit", [Cl.uint(10000)], wallet1);

    // Simulate interest accrual in the lending pool for the vault contract
    const vaultPrincipal = `${deployer}.lending-strategy-vault`;
    simnet.callPublicFn(
      "mock-lending-pool",
      "accrue-interest",
      [Cl.principal(vaultPrincipal), Cl.uint(500)],
      deployer
    );

    // Sync yield so vault recognizes the new interest
    const syncResult = simnet.callPublicFn(
      "lending-strategy-vault",
      "sync-yield",
      [],
      deployer
    );
    expect(syncResult.result).toBeOk(Cl.uint(500));

    // Vault total-assets should now be 10500
    const vaultAssets = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-assets", [], deployer);
    expect(vaultAssets.result).toBeOk(Cl.uint(10500));

    // Shares stay at 10000 -> share price increased
    const vaultShares = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-shares", [], deployer);
    expect(vaultShares.result).toBeOk(Cl.uint(10000));
  });