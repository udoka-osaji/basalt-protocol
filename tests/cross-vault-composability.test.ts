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