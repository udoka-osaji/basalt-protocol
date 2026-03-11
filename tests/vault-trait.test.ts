
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;

describe("vault-trait", () => {
  it("ensures simnet is initialized", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it("vault-trait contract is deployed", () => {
    // The trait contract should deploy without errors
    // We can verify by checking that contracts referencing it compile
    const result = simnet.callReadOnlyFn(
      "basalt-vault",
      "get-total-assets",
      [],
      deployer
    );
    expect(result.result).toBeOk(expect.anything());
  });
});
