import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
// import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { impersonateAccount } from "@nomicfoundation/hardhat-network-helpers";

describe("Relayer", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployContractFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, relayerAccount] = await ethers.getSigners();

    const Relayer = await ethers.getContractFactory("Relayer");
    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    const erc20Token = await ERC20Token.deploy();
    const relayer = await Relayer.deploy();

    await relayer.setup(
      erc20Token.address,
      ethers.utils.parseUnits("1", "gwei"),
      0,
      "0x6a761202"
    );

    return { relayer, erc20Token, owner, otherAccount, relayerAccount };
  }

  describe("Deployment", function () {
    it("Should set the right parameters", async function () {
      const { relayer, erc20Token } = await loadFixture(deployContractFixture);

      expect(await relayer.token()).to.equal(erc20Token.address);
      expect(await relayer.maxPriorityFee()).to.equal(1000000000);
      expect(await relayer.relayerFee()).to.equal(0);
      expect(await relayer.method()).to.equal("0x6a761202");
    });

    it("Should set the right owner", async function () {
      const { relayer, owner } = await loadFixture(deployContractFixture);

      expect(await relayer.owner()).to.equal(owner.address);
    });

    it("Should fail if token is empty", async function () {
      // We don't use the fixture here because we want a different deployment
      const Relayer = await ethers.getContractFactory("Relayer");
      const relayer = await Relayer.deploy();
      await expect(
        relayer.setup(
          ethers.constants.AddressZero,
          ethers.utils.parseUnits("1", "gwei"),
          0,
          "0x6a761202"
        )
      ).to.be.revertedWith("Token cannot be empty");
    });

    it("Should fail if priority fee is zero", async function () {
      const Relayer = await ethers.getContractFactory("Relayer");
      const relayer = await Relayer.deploy();
      const [, random_address] = await ethers.getSigners();
      await expect(
        relayer.setup(random_address.address, 0, 0, "0x6a761202")
      ).to.be.revertedWith("MaxPriorityFee must be higher than 0");
    });

    it("Should fail if setup called twice", async function () {
      const { relayer } = await loadFixture(deployContractFixture);
      await expect(
        relayer.setup(
          ethers.constants.AddressZero,
          ethers.utils.parseUnits("1", "gwei"),
          0,
          "0x6a761202"
        )
      ).to.be.revertedWith("Setup was already called");
    });
  });

  describe("Operating", function () {
    it("Should allow to recover tokens sent", async function () {
      const { relayer, erc20Token, otherAccount } = await loadFixture(
        deployContractFixture
      );
      const amount = 48;
      await erc20Token.transfer(relayer.address, amount);
      expect(await erc20Token.balanceOf(otherAccount.address)).to.equal(0);
      await relayer.recoverFunds(erc20Token.address, otherAccount.address);
      expect(await erc20Token.balanceOf(otherAccount.address)).to.equal(amount);
    });

    it("Should not relay when exceeding maxPriorityFee", async function () {
      const { relayer } = await loadFixture(deployContractFixture);
      const maxPriorityFee = await relayer.maxPriorityFee();

      // This address is not relevant
      const random_address = relayer.address;

      await expect(
        relayer.relay(random_address, "0x", ethers.constants.AddressZero, {
          maxPriorityFeePerGas: maxPriorityFee.add(1),
        })
      ).to.be.revertedWith("maxPriorityFee is higher than expected");
    });

    it("Should relay a Safe transaction", async function () {
      const { relayer, erc20Token, owner, otherAccount, relayerAccount } =
        await loadFixture(deployContractFixture);
      const GnosisSafe = await ethers.getContractFactory("ExampleGnosisSafe");
      const gnosisSafe = await GnosisSafe.deploy({ gasLimit: 10000000 });
      // Don't use proxies for testing
      expect(await gnosisSafe.getThreshold()).to.equal(0);
      await gnosisSafe.setup(
        [owner.address],
        1,
        ethers.constants.AddressZero,
        "0x",
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero
      );

      // Send some ether to the Safe
      const amount = ethers.utils.parseEther("1");
      await expect(
        await owner.sendTransaction({ to: gnosisSafe.address, value: amount })
      ).to.changeEtherBalance(gnosisSafe.address, amount);

      // Send payment tokens to the Safe
      await erc20Token.transfer(
        gnosisSafe.address,
        ethers.utils.parseEther("1")
      );

      // Craft Safe Tx to send ether out
      const amountToSend = ethers.BigNumber.from(23);
      const transactionHash = await gnosisSafe.getTransactionHash(
        otherAccount.address,
        amountToSend,
        "0x",
        0,
        0,
        0,
        0,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0
      );

      let signature = await owner.signMessage(
        ethers.utils.arrayify(transactionHash)
      );
      // Increase v by 4
      const v = parseInt("0x" + signature.slice(-2)) + 4;
      signature = signature.slice(0, -2) + v.toString(16);

      const { data } = await gnosisSafe.populateTransaction.execTransaction(
        otherAccount.address,
        amountToSend,
        "0x",
        0,
        0,
        0,
        0,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        signature
      );

      const dataWithoutMethod = "0x" + data?.slice(10);

      await expect(
        relayer.relay(
          gnosisSafe.address,
          dataWithoutMethod,
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");

      // Approve token from the Safe (impersonating)
      await impersonateAccount(gnosisSafe.address);
      const safeSigner = await ethers.provider.getSigner(gnosisSafe.address);
      await erc20Token
        .connect(safeSigner)
        .approve(relayer.address, ethers.utils.parseEther("1"));

      // Init relayer weth storage with 1 wei so gas fees are not
      // really high for storage initialization
      await erc20Token.transfer(relayerAccount.address, "1");

      // If transaction is executed and relayed, `amountToSend` ether will be sent from Safe to `otherAccount`
      const safeBalanceBefore = await ethers.provider.getBalance(
        gnosisSafe.address
      );
      const otherAccountBalanceBefore = await ethers.provider.getBalance(
        otherAccount.address
      );
      const safeWethBefore = await erc20Token.balanceOf(gnosisSafe.address);
      const relayerWethBefore = await erc20Token.balanceOf(
        relayerAccount.address
      );

      // 1 wei on the relayer
      expect(relayerWethBefore).to.be.eq(1);

      const tx = await relayer
        .connect(relayerAccount)
        .relay(
          gnosisSafe.address,
          dataWithoutMethod,
          ethers.constants.AddressZero
        );
      const receipt = await tx.wait();

      expect(await ethers.provider.getBalance(gnosisSafe.address)).to.be.equal(
        safeBalanceBefore.sub(amountToSend)
      );
      expect(
        await ethers.provider.getBalance(otherAccount.address)
      ).to.be.equal(otherAccountBalanceBefore.add(amountToSend));
      expect(await erc20Token.balanceOf(gnosisSafe.address)).to.be.lessThan(
        safeWethBefore
      );

      // Check relayer was refunded a fair amount
      expect(
        await erc20Token.balanceOf(relayerAccount.address)
      ).to.be.greaterThan(receipt.gasUsed.mul(receipt.effectiveGasPrice));

      // If Safe transaction is not valid, everything should revert and no funds must be transferred
      // Use same transaction again
      await expect(
        relayer.relay(
          gnosisSafe.address,
          dataWithoutMethod,
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith("Could not successfully call target");
    });
  });
});
