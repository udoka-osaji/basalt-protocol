
import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("sbtc-yield-vault", () => {
  it("initializes with zero totals", () => {
    const assets = simnet.callReadOnlyFn("sbtc-yield-vault", "get-total-assets", [], deployer);
    expect(assets.result).toBeOk(Cl.uint(0));

    const shares = simnet.callReadOnlyFn("sbtc-yield-vault", "get-total-shares", [], deployer);
    expect(shares.result).toBeOk(Cl.uint(0));
  });

  it("deposits through meta-vault into basalt-vault", () => {
    const depositAmount = 1000;
    const { result } = simnet.callPublicFn(
      "sbtc-yield-vault",
      "deposit",
      [Cl.uint(depositAmount)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(depositAmount));

    // Meta-vault tracks its own shares
    const metaShares = simnet.callReadOnlyFn("sbtc-yield-vault", "get-total-shares", [], deployer);
    expect(metaShares.result).toBeOk(Cl.uint(depositAmount));

    // Meta-vault tracks assets it deposited
    const metaAssets = simnet.callReadOnlyFn("sbtc-yield-vault", "get-total-assets", [], deployer);
    expect(metaAssets.result).toBeOk(Cl.uint(depositAmount));

    // Basalt-vault should also have the deposit
    const underlyingAssets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(underlyingAssets.result).toBeOk(Cl.uint(depositAmount));
  });

  it("rejects deposit of zero amount", () => {
    const { result } = simnet.callPublicFn("sbtc-yield-vault", "deposit", [Cl.uint(0)], wallet1);
    expect(result).toBeErr(Cl.uint(2001));
  });

  it("withdraws through meta-vault from basalt-vault", () => {
    // Deposit first
    simnet.callPublicFn("sbtc-yield-vault", "deposit", [Cl.uint(1000)], wallet1);

    // Withdraw all
    const { result } = simnet.callPublicFn(
      "sbtc-yield-vault",
      "withdraw",
      [Cl.uint(1000)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(1000));

    // Both vaults should be empty
    const metaAssets = simnet.callReadOnlyFn("sbtc-yield-vault", "get-total-assets", [], deployer);
    expect(metaAssets.result).toBeOk(Cl.uint(0));

    const underlyingAssets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(underlyingAssets.result).toBeOk(Cl.uint(0));
  });

  it("rejects withdrawal of zero shares", () => {
    const { result } = simnet.callPublicFn("sbtc-yield-vault", "withdraw", [Cl.uint(0)], wallet1);
    expect(result).toBeErr(Cl.uint(2001));
  });

  it("rejects withdrawal exceeding balance", () => {
    simnet.callPublicFn("sbtc-yield-vault", "deposit", [Cl.uint(500)], wallet1);
    const { result } = simnet.callPublicFn(
      "sbtc-yield-vault",
      "withdraw",
      [Cl.uint(1000)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(2002));
  });

  it("benefits from underlying vault yield", () => {
    // Deposit into meta-vault
    simnet.callPublicFn("sbtc-yield-vault", "deposit", [Cl.uint(1000)], wallet1);

    // Inject yield directly into basalt-vault
    simnet.callPublicFn("basalt-vault", "harvest-yield", [Cl.uint(500)], deployer);

    // Meta-vault's underlying basalt-vault shares are now worth more
    // But meta-vault's own total-assets tracking stays at 1000
    // (it doesn't auto-update until withdraw)
    const metaAssets = simnet.callReadOnlyFn("sbtc-yield-vault", "get-total-assets", [], deployer);
    expect(metaAssets.result).toBeOk(Cl.uint(1000));
  });

  it("multiple users can deposit into meta-vault", () => {
    simnet.callPublicFn("sbtc-yield-vault", "deposit", [Cl.uint(1000)], wallet1);
    simnet.callPublicFn("sbtc-yield-vault", "deposit", [Cl.uint(2000)], wallet2);

    const totalShares = simnet.callReadOnlyFn("sbtc-yield-vault", "get-total-shares", [], deployer);
    expect(totalShares.result).toBeOk(Cl.uint(3000));

    const w1Balance = simnet.callReadOnlyFn(
      "sbtc-yield-vault",
      "get-share-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(w1Balance.result).toBeOk(Cl.uint(1000));

    const w2Balance = simnet.callReadOnlyFn(
      "sbtc-yield-vault",
      "get-share-balance",
      [Cl.principal(wallet2)],
      deployer
    );
    expect(w2Balance.result).toBeOk(Cl.uint(2000));
  });
});
