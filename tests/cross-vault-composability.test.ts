import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("cross-vault composability", () => {
  it("both vaults can operate independently in the same ecosystem", () => {
    // Deposit into basalt-vault directly
    const basaltDeposit = simnet.callPublicFn(
      "basalt-vault",
      "deposit",
      [Cl.uint(5000)],
      wallet1
    );
    expect(basaltDeposit.result).toBeOk(Cl.uint(5000));

    // Deposit into lending-strategy-vault
    const lendingDeposit = simnet.callPublicFn(
      "lending-strategy-vault",
      "deposit",
      [Cl.uint(3000)],
      wallet2
    );
    expect(lendingDeposit.result).toBeOk(Cl.uint(3000));

    // Each vault tracks its own state independently
    const basaltAssets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(basaltAssets.result).toBeOk(Cl.uint(5000));

    const lendingAssets = simnet.callReadOnlyFn("lending-strategy-vault", "get-total-assets", [], deployer);
    expect(lendingAssets.result).toBeOk(Cl.uint(3000));
  });

  it("meta-vault (sbtc-yield-vault) composes with basalt-vault", () => {
    // Deposit through meta-vault into basalt-vault
    const metaDeposit = simnet.callPublicFn(
      "sbtc-yield-vault",
      "deposit",
      [Cl.uint(2000)],
      wallet1
    );
    expect(metaDeposit.result).toBeOk(Cl.uint(2000));

    // basalt-vault should contain the deposit
    const basaltAssets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(basaltAssets.result).toBeOk(Cl.uint(2000));

    // basalt-vault depositor is the meta-vault contract
    const metaVaultPrincipal = `${deployer}.sbtc-yield-vault`;
    const basaltBalance = simnet.callReadOnlyFn(
      "basalt-vault",
      "get-share-balance",
      [Cl.principal(metaVaultPrincipal)],
      deployer
    );
    expect(basaltBalance.result).toBeOk(Cl.uint(2000));
  });

  it("lending-strategy-vault composes with mock-lending-pool", () => {
    // Deposit through strategy vault into lending pool
    const strategyDeposit = simnet.callPublicFn(
      "lending-strategy-vault",
      "deposit",
      [Cl.uint(4000)],
      wallet1
    );
    expect(strategyDeposit.result).toBeOk(Cl.uint(4000));

    // Lending pool should have the deposit from the vault contract
    const vaultPrincipal = `${deployer}.lending-strategy-vault`;
    const poolBalance = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-depositor-balance",
      [Cl.principal(vaultPrincipal)],
      deployer
    );
    expect(poolBalance.result).toBeOk(
      Cl.tuple({ "principal-amount": Cl.uint(4000), "interest-earned": Cl.uint(0) })
    );
  });

  it("all vault implementations share the same trait interface", () => {
    // All three vault contracts implement the same trait
    // Verify they all respond to the same set of read-only calls

    const vaults = ["basalt-vault", "sbtc-yield-vault", "lending-strategy-vault"];

    for (const vault of vaults) {
      const assets = simnet.callReadOnlyFn(vault, "get-total-assets", [], deployer);
      expect(assets.result).toBeOk(Cl.uint(0));

      const shares = simnet.callReadOnlyFn(vault, "get-total-shares", [], deployer);
      expect(shares.result).toBeOk(Cl.uint(0));

      const balance = simnet.callReadOnlyFn(
        vault,
        "get-share-balance",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(balance.result).toBeOk(Cl.uint(0));

      const toShares = simnet.callReadOnlyFn(
        vault,
        "convert-to-shares",
        [Cl.uint(1000)],
        deployer
      );
      expect(toShares.result).toBeOk(Cl.uint(1000));

      const toAssets = simnet.callReadOnlyFn(
        vault,
        "convert-to-assets",
        [Cl.uint(1000)],
        deployer
      );
      expect(toAssets.result).toBeOk(Cl.uint(1000));

      const previewDep = simnet.callReadOnlyFn(
        vault,
        "preview-deposit",
        [Cl.uint(1000)],
        deployer
      );
      expect(previewDep.result).toBeOk(Cl.uint(1000));

      const previewWith = simnet.callReadOnlyFn(
        vault,
        "preview-withdraw",
        [Cl.uint(1000)],
        deployer
      );
      expect(previewWith.result).toBeOk(Cl.uint(1000));
    }
  });

  it("multi-user multi-vault scenario", () => {
    // wallet1 deposits into basalt-vault
    simnet.callPublicFn("basalt-vault", "deposit", [Cl.uint(10000)], wallet1);

    // wallet2 deposits into lending-strategy-vault
    simnet.callPublicFn("lending-strategy-vault", "deposit", [Cl.uint(8000)], wallet2);

    // wallet3 deposits into meta-vault (sbtc-yield-vault -> basalt-vault)
    simnet.callPublicFn("sbtc-yield-vault", "deposit", [Cl.uint(6000)], wallet3);

    // basalt-vault now has 10000 (direct) + 6000 (from meta-vault) = 16000
    const basaltTotal = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(basaltTotal.result).toBeOk(Cl.uint(16000));

    // lending pool has 8000 from strategy vault
    const vaultPrincipal = `${deployer}.lending-strategy-vault`;
    const poolWithdrawable = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-withdrawable-amount",
      [Cl.principal(vaultPrincipal)],
      deployer
    );
    expect(poolWithdrawable.result).toBeOk(Cl.uint(8000));

    // Everyone can withdraw independently
    const w1Withdraw = simnet.callPublicFn(
      "basalt-vault",
      "withdraw",
      [Cl.uint(10000)],
      wallet1
    );
    expect(w1Withdraw.result).toBeOk(Cl.uint(10000));

    const w2Withdraw = simnet.callPublicFn(
      "lending-strategy-vault",
      "withdraw",
      [Cl.uint(8000)],
      wallet2
    );
    expect(w2Withdraw.result).toBeOk(Cl.uint(8000));

    const w3Withdraw = simnet.callPublicFn(
      "sbtc-yield-vault",
      "withdraw",
      [Cl.uint(6000)],
      wallet3
    );
    expect(w3Withdraw.result).toBeOk(Cl.uint(6000));
  });