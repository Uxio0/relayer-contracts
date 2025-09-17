import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  encodeFunctionData,
  parseEther,
  parseGwei,
  isAddressEqual,
  zeroAddress,
} from "viem";

describe("Relayer", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();
  const [owner, otherAccount, relayerAccount] = await viem.getWalletClients();

  async function deployAndSetup() {
    const erc20Token = await viem.deployContract("ERC20Token");
    const relayer = await viem.deployContract("Relayer");
    await relayer.write.setup([
      erc20Token.address,
      parseGwei("1"),
      0n,
      "0x6a761202",
    ]);
    return { erc20Token, relayer };
  }

  describe("Deployment", function () {
    it("Should set the right parameters", async function () {
      const { erc20Token, relayer } = await deployAndSetup();

      assert.ok(
        isAddressEqual(await relayer.read.token(), erc20Token.address),
      );
      assert.equal(await relayer.read.maxPriorityFee(), 1_000_000_000n);
      assert.equal(await relayer.read.relayerFee(), 0n);
      assert.equal(await relayer.read.method(), "0x6a761202");
    });

    it("Should set the right owner", async function () {
      const { relayer } = await deployAndSetup();
      assert.ok(
        isAddressEqual(await relayer.read.owner(), owner.account.address),
      );
    });

    it("Should fail if token is empty", async function () {
      const relayer = await viem.deployContract("Relayer");
      await viem.assertions.revertWith(
        relayer.write.setup([zeroAddress, parseGwei("1"), 0n, "0x6a761202"]),
        "Token cannot be empty",
      );
    });

    it("Should fail if priority fee is zero", async function () {
      const relayer = await viem.deployContract("Relayer");
      await viem.assertions.revertWith(
        relayer.write.setup([
          otherAccount.account.address,
          0n,
          0n,
          "0x6a761202",
        ]),
        "MaxPriorityFee must be higher than 0",
      );
    });

    it("Should fail if setup called twice", async function () {
      const { relayer, erc20Token } = await deployAndSetup();
      await viem.assertions.revertWith(
        relayer.write.setup([
          erc20Token.address,
          parseGwei("1"),
          0n,
          "0x6a761202",
        ]),
        "Setup was already called",
      );
    });
  });

  describe("Operating", function () {
    it("Should allow to recover tokens sent", async function () {
      const { erc20Token, relayer } = await deployAndSetup();

      const amount = 48n;
      await erc20Token.write.transfer([relayer.address, amount]);
      assert.equal(
        await erc20Token.read.balanceOf([otherAccount.account.address]),
        0n,
      );

      await relayer.write.recoverFunds([
        erc20Token.address,
        otherAccount.account.address,
      ]);

      assert.equal(
        await erc20Token.read.balanceOf([otherAccount.account.address]),
        amount,
      );
    });

    it("Should not relay when exceeding maxPriorityFee", async function () {
      const { relayer } = await deployAndSetup();
      const maxPriorityFee = await relayer.read.maxPriorityFee();

      const randomAddress = relayer.address; // any address

      await viem.assertions.revertWith(
        relayer.write.relay([
          randomAddress,
          "0x",
          zeroAddress,
        ], {
          account: owner.account,
          maxPriorityFeePerGas: maxPriorityFee + 1n,
        }),
        "maxPriorityFee is higher than expected",
      );
    });

    it("Should relay a Safe transaction", async function () {
      const { erc20Token, relayer } = await deployAndSetup();

      const gnosisSafe = await viem.deployContract("ExampleGnosisSafe", []);
      assert.equal(await gnosisSafe.read.getThreshold(), 0n);
      await gnosisSafe.write.setup([
        [owner.account.address],
        1n,
        zeroAddress,
        "0x",
        zeroAddress,
        zeroAddress,
        0n,
        zeroAddress,
      ]);

      // Fund Safe with ether
      const amountEth = parseEther("1");
      await owner.sendTransaction({ to: gnosisSafe.address, value: amountEth });

      // Fund Safe with payment tokens
      await erc20Token.write.transfer([gnosisSafe.address, parseEther("1")]);

      // Craft Safe Tx to send ether out
      const amountToSend = 23n;
      const transactionHash = await gnosisSafe.read.getTransactionHash([
        otherAccount.account.address,
        amountToSend,
        "0x",
        0n,
        0n,
        0n,
        0n,
        zeroAddress,
        zeroAddress,
        0n,
      ]);

      // Owner signs the tx hash (eth_sign)
      let signature = await owner.signMessage({
        account: owner.account,
        message: { raw: transactionHash },
      });
      // bump v by 4 per Safe's signature scheme
      const v = parseInt("0x" + signature.slice(-2)) + 4;
      signature = signature.slice(0, -2) + v.toString(16);

      const data = encodeFunctionData({
        abi: gnosisSafe.abi,
        functionName: "execTransaction",
        args: [
          otherAccount.account.address,
          amountToSend,
          "0x",
          0n,
          0n,
          0n,
          0n,
          zeroAddress,
          zeroAddress,
          signature as `0x${string}`,
        ],
      });

      const dataWithoutMethod = ("0x" + data.slice(10)) as `0x${string}`;

      await viem.assertions.revertWithCustomError(
        relayer.write.relay([
          gnosisSafe.address,
          dataWithoutMethod,
          zeroAddress,
        ]),
        erc20Token,
        "ERC20InsufficientAllowance",
      );

      // Approve token from the Safe (impersonating)
      await testClient.impersonateAccount({ address: gnosisSafe.address });
      await erc20Token.write.approve(
        [relayer.address, parseEther("1")],
        { account: gnosisSafe.address },
      );

      // Init relayer token storage with 1 wei
      await erc20Token.write.transfer([relayerAccount.account.address, 1n]);

      const safeBalanceBefore = await publicClient.getBalance({
        address: gnosisSafe.address,
      });
      const otherAccountBalanceBefore = await publicClient.getBalance({
        address: otherAccount.account.address,
      });
      const safeWethBefore = await erc20Token.read.balanceOf([gnosisSafe.address]);
      const relayerWethBefore = await erc20Token.read.balanceOf([
        relayerAccount.account.address,
      ]);

      assert.equal(relayerWethBefore, 1n);

      const hash = await relayer.write.relay(
        [gnosisSafe.address, dataWithoutMethod, zeroAddress],
        { account: relayerAccount.account },
      );
      const receipt = await publicClient.getTransactionReceipt({ hash });

      assert.equal(
        await publicClient.getBalance({ address: gnosisSafe.address }),
        safeBalanceBefore - amountToSend,
      );
      assert.equal(
        await publicClient.getBalance({ address: otherAccount.account.address }),
        otherAccountBalanceBefore + amountToSend,
      );
      assert((await erc20Token.read.balanceOf([gnosisSafe.address])) < safeWethBefore);

      // Check relayer was refunded a fair amount
      const relayerWethAfter = await erc20Token.read.balanceOf([
        relayerAccount.account.address,
      ]);
      assert(
        relayerWethAfter >
          receipt.gasUsed * (receipt.effectiveGasPrice ?? 0n),
      );

      // If Safe transaction is not valid, it should revert
      await viem.assertions.revertWith(
        relayer.write.relay([
          gnosisSafe.address,
          dataWithoutMethod,
          zeroAddress,
        ]),
        "Could not successfully call target",
      );
    });
  });
});
