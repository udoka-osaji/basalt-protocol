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