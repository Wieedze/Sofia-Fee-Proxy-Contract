import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SofiaFeeProxy (V1 legacy)", function () {
  const GNOSIS_SAFE = "0x68c72d6c3d81B20D8F81e4E41BA2F373973141eD";
  const DEPOSIT_FEE = ethers.parseEther("0.1"); // 0.1 TRUST fixed fee per deposit
  const DEPOSIT_PERCENTAGE = 200n; // 2%
  const FEE_DENOMINATOR = 10000n;

  async function deployFixture() {
    const [owner, admin1, admin2, admin3, user, nonAdmin] = await ethers.getSigners();

    const MockMultiVaultFactory = await ethers.getContractFactory("MockMultiVault");
    const mockMultiVault = await MockMultiVaultFactory.deploy();
    await mockMultiVault.waitForDeployment();

    const SofiaFeeProxyFactory = await ethers.getContractFactory("SofiaFeeProxy");
    const proxy = await SofiaFeeProxyFactory.deploy(
      await mockMultiVault.getAddress(),
      GNOSIS_SAFE,
      DEPOSIT_FEE,
      DEPOSIT_PERCENTAGE,
      [admin1.address, admin2.address, admin3.address]
    );
    await proxy.waitForDeployment();

    return { proxy, mockMultiVault, owner, admin1, admin2, admin3, user, nonAdmin };
  }

  describe("Initialization", function () {
    it("Should set correct MultiVault address", async function () {
      const { proxy, mockMultiVault } = await loadFixture(deployFixture);
      expect(await proxy.ethMultiVault()).to.equal(await mockMultiVault.getAddress());
    });

    it("Should set correct fee recipient", async function () {
      const { proxy } = await loadFixture(deployFixture);
      expect(await proxy.feeRecipient()).to.equal(GNOSIS_SAFE);
    });

    it("Should set correct deposit fees", async function () {
      const { proxy } = await loadFixture(deployFixture);
      expect(await proxy.depositFixedFee()).to.equal(DEPOSIT_FEE);
      expect(await proxy.depositPercentageFee()).to.equal(DEPOSIT_PERCENTAGE);
    });

    it("Should whitelist initial admins", async function () {
      const { proxy, admin1, admin2, admin3 } = await loadFixture(deployFixture);
      expect(await proxy.whitelistedAdmins(admin1.address)).to.be.true;
      expect(await proxy.whitelistedAdmins(admin2.address)).to.be.true;
      expect(await proxy.whitelistedAdmins(admin3.address)).to.be.true;
    });

    it("Should not whitelist non-admins", async function () {
      const { proxy, nonAdmin } = await loadFixture(deployFixture);
      expect(await proxy.whitelistedAdmins(nonAdmin.address)).to.be.false;
    });

    it("Should revert on zero MultiVault address", async function () {
      const [admin] = await ethers.getSigners();
      const SofiaFeeProxyFactory = await ethers.getContractFactory("SofiaFeeProxy");

      await expect(
        SofiaFeeProxyFactory.deploy(
          ethers.ZeroAddress,
          GNOSIS_SAFE,
          DEPOSIT_FEE,
          DEPOSIT_PERCENTAGE,
          [admin.address]
        )
      ).to.be.revertedWithCustomError(SofiaFeeProxyFactory, "SofiaFeeProxy_InvalidMultiVaultAddress");
    });

    it("Should revert on zero fee recipient address", async function () {
      const { mockMultiVault } = await loadFixture(deployFixture);
      const [admin] = await ethers.getSigners();
      const SofiaFeeProxyFactory = await ethers.getContractFactory("SofiaFeeProxy");

      await expect(
        SofiaFeeProxyFactory.deploy(
          await mockMultiVault.getAddress(),
          ethers.ZeroAddress,
          DEPOSIT_FEE,
          DEPOSIT_PERCENTAGE,
          [admin.address]
        )
      ).to.be.revertedWithCustomError(SofiaFeeProxyFactory, "SofiaFeeProxy_InvalidMultisigAddress");
    });
  });

  describe("Fee Calculations", function () {
    it("Should calculate deposit fee correctly", async function () {
      const { proxy } = await loadFixture(deployFixture);
      const depositAmount = ethers.parseEther("10");

      // 1 deposit of 10 TRUST: 0.1 fixed + 10 * 2% = 0.3 TRUST
      const expectedFee = DEPOSIT_FEE + (depositAmount * DEPOSIT_PERCENTAGE / FEE_DENOMINATOR);
      expect(await proxy.calculateDepositFee(1n, depositAmount)).to.equal(expectedFee);
      expect(expectedFee).to.equal(ethers.parseEther("0.3"));
    });

    it("Should calculate deposit fee for multiple deposits", async function () {
      const { proxy } = await loadFixture(deployFixture);
      const totalDeposit = ethers.parseEther("10");

      // 3 deposits totaling 10 TRUST: 0.1 * 3 + 10 * 2% = 0.5 TRUST
      const expectedFee = (DEPOSIT_FEE * 3n) + (totalDeposit * DEPOSIT_PERCENTAGE / FEE_DENOMINATOR);
      expect(await proxy.calculateDepositFee(3n, totalDeposit)).to.equal(expectedFee);
    });

    it("Should calculate total deposit cost correctly", async function () {
      const { proxy } = await loadFixture(deployFixture);
      const depositAmount = ethers.parseEther("10");

      const fee = await proxy.calculateDepositFee(1n, depositAmount);
      const totalCost = await proxy.getTotalDepositCost(depositAmount);
      expect(totalCost).to.equal(depositAmount + fee);
    });

    it("Should calculate total creation cost correctly", async function () {
      const { proxy } = await loadFixture(deployFixture);
      const depositCount = 3n;
      const totalDeposit = ethers.parseEther("1");
      const multiVaultCost = ethers.parseEther("2");

      const fee = await proxy.calculateDepositFee(depositCount, totalDeposit);
      const totalCost = await proxy.getTotalCreationCost(depositCount, totalDeposit, multiVaultCost);
      expect(totalCost).to.equal(multiVaultCost + fee);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to set deposit fee", async function () {
      const { proxy, admin2 } = await loadFixture(deployFixture);
      const newFee = ethers.parseEther("0.05");

      await expect(proxy.connect(admin2).setDepositFixedFee(newFee))
        .to.emit(proxy, "DepositFixedFeeUpdated")
        .withArgs(DEPOSIT_FEE, newFee);

      expect(await proxy.depositFixedFee()).to.equal(newFee);
    });

    it("Should allow admin to set deposit percentage", async function () {
      const { proxy, admin3 } = await loadFixture(deployFixture);
      const newPercentage = 500n; // 5%

      await expect(proxy.connect(admin3).setDepositPercentageFee(newPercentage))
        .to.emit(proxy, "DepositPercentageFeeUpdated")
        .withArgs(DEPOSIT_PERCENTAGE, newPercentage);

      expect(await proxy.depositPercentageFee()).to.equal(newPercentage);
    });

    it("Should allow admin to set fee recipient", async function () {
      const { proxy, admin1, user } = await loadFixture(deployFixture);

      await expect(proxy.connect(admin1).setFeeRecipient(user.address))
        .to.emit(proxy, "FeeRecipientUpdated")
        .withArgs(GNOSIS_SAFE, user.address);

      expect(await proxy.feeRecipient()).to.equal(user.address);
    });

    it("Should allow admin to whitelist new admin", async function () {
      const { proxy, admin1, nonAdmin } = await loadFixture(deployFixture);

      await expect(proxy.connect(admin1).setWhitelistedAdmin(nonAdmin.address, true))
        .to.emit(proxy, "AdminWhitelistUpdated")
        .withArgs(nonAdmin.address, true);

      expect(await proxy.whitelistedAdmins(nonAdmin.address)).to.be.true;
    });

    it("Should allow admin to remove admin", async function () {
      const { proxy, admin1, admin2 } = await loadFixture(deployFixture);

      await proxy.connect(admin1).setWhitelistedAdmin(admin2.address, false);
      expect(await proxy.whitelistedAdmins(admin2.address)).to.be.false;
    });

    it("Should revert when non-admin tries to set fees", async function () {
      const { proxy, nonAdmin } = await loadFixture(deployFixture);

      await expect(proxy.connect(nonAdmin).setDepositFixedFee(ethers.parseEther("0.5")))
        .to.be.revertedWithCustomError(proxy, "SofiaFeeProxy_NotWhitelistedAdmin");
    });

    it("Should revert when setting fee recipient to zero address", async function () {
      const { proxy, admin1 } = await loadFixture(deployFixture);

      await expect(proxy.connect(admin1).setFeeRecipient(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(proxy, "SofiaFeeProxy_ZeroAddress");
    });

    it("Should revert when percentage fee is too high", async function () {
      const { proxy, admin1 } = await loadFixture(deployFixture);

      await expect(proxy.connect(admin1).setDepositPercentageFee(10001n))
        .to.be.revertedWithCustomError(proxy, "SofiaFeeProxy_FeePercentageTooHigh");
    });
  });

  describe("Proxy Functions - createAtoms", function () {
    it("Should collect fees on createAtoms", async function () {
      const { proxy, mockMultiVault, user } = await loadFixture(deployFixture);

      const data = [ethers.toUtf8Bytes("ipfs://atom1"), ethers.toUtf8Bytes("ipfs://atom2")];
      const assets = [ethers.parseEther("0.01"), ethers.parseEther("0.01")];
      const curveId = 1n;
      const totalAssets = ethers.parseEther("0.02");

      const sofiaFee = await proxy.calculateDepositFee(2n, totalAssets);
      const atomCost = await mockMultiVault.getAtomCost();
      const multiVaultCost = (atomCost * 2n) + totalAssets;
      const totalRequired = sofiaFee + multiVaultCost;

      const initialBalance = await ethers.provider.getBalance(GNOSIS_SAFE);

      await expect(proxy.connect(user).createAtoms(user.address, data, assets, curveId, { value: totalRequired }))
        .to.emit(proxy, "FeesCollected")
        .withArgs(user.address, sofiaFee, "createAtoms");

      const finalBalance = await ethers.provider.getBalance(GNOSIS_SAFE);
      expect(finalBalance - initialBalance).to.equal(sofiaFee);
    });

    it("Should revert on insufficient value for createAtoms", async function () {
      const { proxy, user } = await loadFixture(deployFixture);

      const data = [ethers.toUtf8Bytes("ipfs://atom1")];
      const assets = [ethers.parseEther("0.01")];
      const curveId = 1n;

      await expect(
        proxy.connect(user).createAtoms(user.address, data, assets, curveId, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWithCustomError(proxy, "SofiaFeeProxy_InsufficientValue");
    });
  });

  describe("Proxy Functions - createTriples", function () {
    it("Should collect fees on createTriples", async function () {
      const { proxy, mockMultiVault, user } = await loadFixture(deployFixture);

      const subjectIds = [ethers.zeroPadValue("0x01", 32)];
      const predicateIds = [ethers.zeroPadValue("0x02", 32)];
      const objectIds = [ethers.zeroPadValue("0x03", 32)];
      const assets = [ethers.parseEther("0.01")];
      const curveId = 1n;
      const totalAssets = ethers.parseEther("0.01");

      const sofiaFee = await proxy.calculateDepositFee(1n, totalAssets);
      const tripleCost = await mockMultiVault.getTripleCost();
      const multiVaultCost = tripleCost + totalAssets;
      const totalRequired = sofiaFee + multiVaultCost;

      const initialBalance = await ethers.provider.getBalance(GNOSIS_SAFE);

      await expect(proxy.connect(user).createTriples(user.address, subjectIds, predicateIds, objectIds, assets, curveId, { value: totalRequired }))
        .to.emit(proxy, "FeesCollected")
        .withArgs(user.address, sofiaFee, "createTriples");

      const finalBalance = await ethers.provider.getBalance(GNOSIS_SAFE);
      expect(finalBalance - initialBalance).to.equal(sofiaFee);
    });

    it("Should revert on wrong array lengths", async function () {
      const { proxy, user } = await loadFixture(deployFixture);

      const subjectIds = [ethers.zeroPadValue("0x01", 32), ethers.zeroPadValue("0x04", 32)];
      const predicateIds = [ethers.zeroPadValue("0x02", 32)];
      const objectIds = [ethers.zeroPadValue("0x03", 32), ethers.zeroPadValue("0x05", 32)];
      const assets = [ethers.parseEther("0.01"), ethers.parseEther("0.01")];
      const curveId = 1n;

      await expect(
        proxy.connect(user).createTriples(user.address, subjectIds, predicateIds, objectIds, assets, curveId, { value: ethers.parseEther("10") })
      ).to.be.revertedWithCustomError(proxy, "SofiaFeeProxy_WrongArrayLengths");
    });
  });

  describe("Proxy Functions - deposit", function () {
    it("Should collect fees on deposit (inverse calculation)", async function () {
      const { proxy, user } = await loadFixture(deployFixture);

      const desiredDepositAmount = ethers.parseEther("10");
      const totalToSend = await proxy.getTotalDepositCost(desiredDepositAmount);

      const initialBalance = await ethers.provider.getBalance(GNOSIS_SAFE);
      const termId = ethers.zeroPadValue("0x01", 32);

      await expect(proxy.connect(user).deposit(user.address, termId, 1n, 0n, { value: totalToSend }))
        .to.emit(proxy, "FeesCollected");

      const finalBalance = await ethers.provider.getBalance(GNOSIS_SAFE);
      const collectedFee = finalBalance - initialBalance;
      const expectedFee = await proxy.calculateDepositFee(1n, desiredDepositAmount);
      expect(collectedFee).to.be.closeTo(expectedFee, 1);
    });

    it("Should calculate multiVaultAmount correctly", async function () {
      const { proxy } = await loadFixture(deployFixture);

      const totalSent = ethers.parseEther("10.3");
      const multiVaultAmount = await proxy.getMultiVaultAmountFromValue(totalSent);

      expect(multiVaultAmount).to.be.closeTo(ethers.parseEther("10"), ethers.parseEther("0.001"));
    });

    it("Should revert when sending only fixed fee or less", async function () {
      const { proxy, user } = await loadFixture(deployFixture);

      const termId = ethers.zeroPadValue("0x01", 32);

      await expect(
        proxy.connect(user).deposit(user.address, termId, 1n, 0n, { value: DEPOSIT_FEE })
      ).to.be.revertedWithCustomError(proxy, "SofiaFeeProxy_InsufficientValue");

      await expect(
        proxy.connect(user).deposit(user.address, termId, 1n, 0n, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWithCustomError(proxy, "SofiaFeeProxy_InsufficientValue");
    });

    it("Should return 0 from getMultiVaultAmountFromValue for insufficient value", async function () {
      const { proxy } = await loadFixture(deployFixture);

      expect(await proxy.getMultiVaultAmountFromValue(DEPOSIT_FEE)).to.equal(0n);
      expect(await proxy.getMultiVaultAmountFromValue(ethers.parseEther("0.05"))).to.equal(0n);
    });
  });

  describe("Proxy Functions - depositBatch", function () {
    it("Should collect fees on depositBatch", async function () {
      const { proxy, user } = await loadFixture(deployFixture);

      const termIds = [ethers.zeroPadValue("0x01", 32), ethers.zeroPadValue("0x02", 32)];
      const curveIds = [1n, 1n];
      const assets = [ethers.parseEther("5"), ethers.parseEther("5")];
      const minShares = [0n, 0n];

      const totalDeposit = ethers.parseEther("10");
      const sofiaFee = (DEPOSIT_FEE * 2n) + ((totalDeposit * DEPOSIT_PERCENTAGE) / FEE_DENOMINATOR);
      const totalRequired = totalDeposit + sofiaFee;

      const initialBalance = await ethers.provider.getBalance(GNOSIS_SAFE);

      await expect(proxy.connect(user).depositBatch(user.address, termIds, curveIds, assets, minShares, { value: totalRequired }))
        .to.emit(proxy, "FeesCollected")
        .withArgs(user.address, sofiaFee, "depositBatch");

      const finalBalance = await ethers.provider.getBalance(GNOSIS_SAFE);
      expect(finalBalance - initialBalance).to.equal(sofiaFee);
    });

    it("Should revert on wrong array lengths in depositBatch", async function () {
      const { proxy, user } = await loadFixture(deployFixture);

      const termIds = [ethers.zeroPadValue("0x01", 32), ethers.zeroPadValue("0x02", 32)];
      const curveIds = [1n];
      const assets = [ethers.parseEther("5"), ethers.parseEther("5")];
      const minShares = [0n, 0n];

      await expect(
        proxy.connect(user).depositBatch(user.address, termIds, curveIds, assets, minShares, { value: ethers.parseEther("20") })
      ).to.be.revertedWithCustomError(proxy, "SofiaFeeProxy_WrongArrayLengths");
    });
  });

  describe("View Functions (Passthrough)", function () {
    it("Should return atom cost from MultiVault", async function () {
      const { proxy, mockMultiVault } = await loadFixture(deployFixture);
      expect(await proxy.getAtomCost()).to.equal(await mockMultiVault.getAtomCost());
    });

    it("Should return triple cost from MultiVault", async function () {
      const { proxy, mockMultiVault } = await loadFixture(deployFixture);
      expect(await proxy.getTripleCost()).to.equal(await mockMultiVault.getTripleCost());
    });

    it("Should return isTermCreated from MultiVault", async function () {
      const { proxy, mockMultiVault } = await loadFixture(deployFixture);
      const termId = ethers.zeroPadValue("0x01", 32);
      await mockMultiVault.setTermCreated(termId, true);
      expect(await proxy.isTermCreated(termId)).to.be.true;
    });

    it("Should return shares from MultiVault", async function () {
      const { proxy, mockMultiVault, user } = await loadFixture(deployFixture);
      const termId = ethers.zeroPadValue("0x01", 32);
      await mockMultiVault.setShares(user.address, termId, 1n, 1000n);
      expect(await proxy.getShares(user.address, termId, 1n)).to.equal(1000n);
    });
  });
});
