import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("mock-lending-pool", () => {
  it("initializes with zero deposits", () => {
    const deposits = simnet.callReadOnlyFn("mock-lending-pool", "get-total-deposits", [], deployer);
    expect(deposits.result).toBeOk(Cl.uint(0));

    const interest = simnet.callReadOnlyFn("mock-lending-pool", "get-total-interest-accrued", [], deployer);
    expect(interest.result).toBeOk(Cl.uint(0));
  });

  it("returns zero balance for unknown depositor", () => {
    const balance = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-depositor-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(balance.result).toBeOk(
      Cl.tuple({ "principal-amount": Cl.uint(0), "interest-earned": Cl.uint(0) })
    );
  });

  it("allows supply of sBTC", () => {
    const { result } = simnet.callPublicFn(
      "mock-lending-pool",
      "supply",
      [Cl.uint(5000)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(5000));

    const deposits = simnet.callReadOnlyFn("mock-lending-pool", "get-total-deposits", [], deployer);
    expect(deposits.result).toBeOk(Cl.uint(5000));

    const balance = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-depositor-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(balance.result).toBeOk(
      Cl.tuple({ "principal-amount": Cl.uint(5000), "interest-earned": Cl.uint(0) })
    );
  });

  it("rejects supply of zero amount", () => {
    const { result } = simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(0)], wallet1);
    expect(result).toBeErr(Cl.uint(3001));
  });

  it("allows multiple deposits from same user", () => {
    simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(1000)], wallet1);
    simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(2000)], wallet1);

    const balance = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-depositor-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(balance.result).toBeOk(
      Cl.tuple({ "principal-amount": Cl.uint(3000), "interest-earned": Cl.uint(0) })
    );
  });

  it("allows multiple depositors", () => {
    simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(1000)], wallet1);
    simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(3000)], wallet2);

    const deposits = simnet.callReadOnlyFn("mock-lending-pool", "get-total-deposits", [], deployer);
    expect(deposits.result).toBeOk(Cl.uint(4000));
  });

  it("accrues interest to a depositor (owner only)", () => {
    simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(5000)], wallet1);

    const { result } = simnet.callPublicFn(
      "mock-lending-pool",
      "accrue-interest",
      [Cl.principal(wallet1), Cl.uint(250)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(250));

    const balance = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-depositor-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(balance.result).toBeOk(
      Cl.tuple({ "principal-amount": Cl.uint(5000), "interest-earned": Cl.uint(250) })
    );

    const withdrawable = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-withdrawable-amount",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(withdrawable.result).toBeOk(Cl.uint(5250));
  });

  it("rejects accrue-interest from non-owner", () => {
    simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(1000)], wallet1);
    const { result } = simnet.callPublicFn(
      "mock-lending-pool",
      "accrue-interest",
      [Cl.principal(wallet1), Cl.uint(100)],
      wallet2
    );
    expect(result).toBeErr(Cl.uint(3000));
  });

  it("rejects accrue-interest for non-depositor", () => {
    const { result } = simnet.callPublicFn(
      "mock-lending-pool",
      "accrue-interest",
      [Cl.principal(wallet1), Cl.uint(100)],
      deployer
    );
    expect(result).toBeErr(Cl.uint(3002));
  });

  it("allows full redemption of principal + interest", () => {
    simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(5000)], wallet1);
    simnet.callPublicFn(
      "mock-lending-pool",
      "accrue-interest",
      [Cl.principal(wallet1), Cl.uint(500)],
      deployer
    );

    const { result } = simnet.callPublicFn(
      "mock-lending-pool",
      "redeem",
      [Cl.uint(5500)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(5500));

    const balance = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-depositor-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(balance.result).toBeOk(
      Cl.tuple({ "principal-amount": Cl.uint(0), "interest-earned": Cl.uint(0) })
    );
  });

  it("allows partial redemption", () => {
    simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(5000)], wallet1);
    simnet.callPublicFn(
      "mock-lending-pool",
      "accrue-interest",
      [Cl.principal(wallet1), Cl.uint(1000)],
      deployer
    );

    // Redeem 800: should first consume interest (800 from 1000)
    const { result } = simnet.callPublicFn(
      "mock-lending-pool",
      "redeem",
      [Cl.uint(800)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(800));

    const balance = simnet.callReadOnlyFn(
      "mock-lending-pool",
      "get-depositor-balance",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(balance.result).toBeOk(
      Cl.tuple({ "principal-amount": Cl.uint(5000), "interest-earned": Cl.uint(200) })
    );
  });

  it("rejects redemption of zero amount", () => {
    const { result } = simnet.callPublicFn("mock-lending-pool", "redeem", [Cl.uint(0)], wallet1);
    expect(result).toBeErr(Cl.uint(3001));
  });

  it("rejects redemption exceeding balance", () => {
    simnet.callPublicFn("mock-lending-pool", "supply", [Cl.uint(1000)], wallet1);
    const { result } = simnet.callPublicFn(
      "mock-lending-pool",
      "redeem",
      [Cl.uint(2000)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(3002));
  });
});
