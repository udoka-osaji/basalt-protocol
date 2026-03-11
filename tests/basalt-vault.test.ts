
import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("basalt-vault", () => {
  it("initializes with zero totals", () => {
    const assets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(assets.result).toBeOk(Cl.uint(0));

    const shares = simnet.callReadOnlyFn("basalt-vault", "get-total-shares", [], deployer);
    expect(shares.result).toBeOk(Cl.uint(0));
  });

  it("returns zero share balance for unknown user", () => {
    const balance = simnet.callReadOnlyFn(
      "basalt-vault",
      "get-share-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(balance.result).toBeOk(Cl.uint(0));
  });

  it("converts 1:1 when vault is empty", () => {
    const shares = simnet.callReadOnlyFn(
      "basalt-vault",
      "convert-to-shares",
      [Cl.uint(1000)],
      deployer
    );
    expect(shares.result).toBeOk(Cl.uint(1000));

    const assets = simnet.callReadOnlyFn(
      "basalt-vault",
      "convert-to-assets",
      [Cl.uint(1000)],
      deployer
    );
    expect(assets.result).toBeOk(Cl.uint(1000));
  });

  it("rejects deposit of zero amount", () => {
    const { result } = simnet.callPublicFn("basalt-vault", "deposit", [Cl.uint(0)], wallet1);
    expect(result).toBeErr(Cl.uint(1001));
  });

  it("allows deposit and mints shares 1:1 on first deposit", () => {
    const depositAmount = 1000;
    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "deposit",
      [Cl.uint(depositAmount)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(depositAmount));

    // Check total assets updated
    const assets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(assets.result).toBeOk(Cl.uint(depositAmount));

    // Check total shares updated
    const shares = simnet.callReadOnlyFn("basalt-vault", "get-total-shares", [], deployer);
    expect(shares.result).toBeOk(Cl.uint(depositAmount));

    // Check user share balance
    const balance = simnet.callReadOnlyFn(
      "basalt-vault",
      "get-share-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(balance.result).toBeOk(Cl.uint(depositAmount));
  });

  it("allows second deposit from different user", () => {
    // First deposit
    simnet.callPublicFn("basalt-vault", "deposit", [Cl.uint(1000)], wallet1);

    // Second deposit
    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "deposit",
      [Cl.uint(2000)],
      wallet2
    );
    expect(result).toBeOk(Cl.uint(2000));

    // Total assets should be 3000
    const assets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(assets.result).toBeOk(Cl.uint(3000));
  });

  it("allows full withdrawal", () => {
    // Deposit first
    simnet.callPublicFn("basalt-vault", "deposit", [Cl.uint(1000)], wallet1);

    // Withdraw all shares
    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "withdraw",
      [Cl.uint(1000)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(1000));

    // Check balances are zero
    const assets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(assets.result).toBeOk(Cl.uint(0));

    const shares = simnet.callReadOnlyFn("basalt-vault", "get-total-shares", [], deployer);
    expect(shares.result).toBeOk(Cl.uint(0));

    const balance = simnet.callReadOnlyFn(
      "basalt-vault",
      "get-share-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(balance.result).toBeOk(Cl.uint(0));
  });

  it("rejects withdrawal of zero shares", () => {
    const { result } = simnet.callPublicFn("basalt-vault", "withdraw", [Cl.uint(0)], wallet1);
    expect(result).toBeErr(Cl.uint(1001));
  });

  it("rejects withdrawal exceeding balance", () => {
    simnet.callPublicFn("basalt-vault", "deposit", [Cl.uint(500)], wallet1);
    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "withdraw",
      [Cl.uint(1000)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(1002));
  });

  it("harvest-yield increases asset-per-share ratio", () => {
    // Deposit 1000 sBTC
    simnet.callPublicFn("basalt-vault", "deposit", [Cl.uint(1000)], wallet1);

    // Deployer harvests 500 sBTC yield
    const harvestResult = simnet.callPublicFn(
      "basalt-vault",
      "harvest-yield",
      [Cl.uint(500)],
      deployer
    );
    expect(harvestResult.result).toBeOk(Cl.uint(500));

    // Total assets should be 1500, shares still 1000
    const assets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(assets.result).toBeOk(Cl.uint(1500));

    const shares = simnet.callReadOnlyFn("basalt-vault", "get-total-shares", [], deployer);
    expect(shares.result).toBeOk(Cl.uint(1000));

    // Withdrawing all 1000 shares should return 1500 assets
    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "withdraw",
      [Cl.uint(1000)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(1500));
  });

  it("harvest-yield rejects non-owner", () => {
    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "harvest-yield",
      [Cl.uint(100)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("harvest-yield rejects zero amount", () => {
    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "harvest-yield",
      [Cl.uint(0)],
      deployer
    );
    expect(result).toBeErr(Cl.uint(1001));
  });

  it("new depositor after yield gets fewer shares", () => {
    // wallet1 deposits 1000
    simnet.callPublicFn("basalt-vault", "deposit", [Cl.uint(1000)], wallet1);

    // Yield of 1000 injected (total assets = 2000, shares = 1000)
    simnet.callPublicFn("basalt-vault", "harvest-yield", [Cl.uint(1000)], deployer);

    // wallet2 deposits 1000 -> should get 500 shares (1000 * 1000 / 2000)
    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "deposit",
      [Cl.uint(1000)],
      wallet2
    );
    expect(result).toBeOk(Cl.uint(500));

    // Total: 3000 assets, 1500 shares
    const assets = simnet.callReadOnlyFn("basalt-vault", "get-total-assets", [], deployer);
    expect(assets.result).toBeOk(Cl.uint(3000));

    const shares = simnet.callReadOnlyFn("basalt-vault", "get-total-shares", [], deployer);
    expect(shares.result).toBeOk(Cl.uint(1500));
  });

  it("preview-deposit matches actual deposit", () => {
    simnet.callPublicFn("basalt-vault", "deposit", [Cl.uint(1000)], wallet1);
    simnet.callPublicFn("basalt-vault", "harvest-yield", [Cl.uint(500)], deployer);

    const preview = simnet.callReadOnlyFn(
      "basalt-vault",
      "preview-deposit",
      [Cl.uint(600)],
      deployer
    );

    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "deposit",
      [Cl.uint(600)],
      wallet2
    );

    expect(result).toEqual(preview.result);
  });

  it("preview-withdraw matches actual withdrawal", () => {
    simnet.callPublicFn("basalt-vault", "deposit", [Cl.uint(1000)], wallet1);

    const preview = simnet.callReadOnlyFn(
      "basalt-vault",
      "preview-withdraw",
      [Cl.uint(500)],
      deployer
    );

    const { result } = simnet.callPublicFn(
      "basalt-vault",
      "withdraw",
      [Cl.uint(500)],
      wallet1
    );

    expect(result).toEqual(preview.result);
  });
});
