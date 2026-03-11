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