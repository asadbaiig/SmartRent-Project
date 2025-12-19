const { expect } = require("chai");
const hre = require("hardhat");

describe("RentalContract", function () {
  let rentalContract;
  let owner;
  let landlord;
  let tenant;

  beforeEach(async function () {
    const { ethers } = hre;
    
    // Get signers
    [owner, landlord, tenant] = await ethers.getSigners();

    // Deploy contract
    const RentalContractFactory = await ethers.getContractFactory("RentalContract");
    rentalContract = await RentalContractFactory.deploy();
    await rentalContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await rentalContract.owner()).to.equal(owner.address);
    });

    it("Should start with zero contracts", async function () {
      expect(await rentalContract.getTotalContracts()).to.equal(0);
    });
  });

  describe("Contract Creation", function () {
    it("Should create a new contract", async function () {
      const { ethers } = hre;
      
      const contractId = "contract-123";
      const propertyId = "property-456";
      const monthlyRent = ethers.parseEther("1.0");
      const securityDeposit = ethers.parseEther("2.0");
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + (365 * 24 * 60 * 60); // 1 year later
      const termsHash = "QmTesthash123";

      await expect(
        rentalContract.createContract(
          contractId,
          propertyId,
          landlord.address,
          tenant.address,
          monthlyRent,
          securityDeposit,
          startDate,
          endDate,
          termsHash
        )
      )
        .to.emit(rentalContract, "ContractCreated")
        .withArgs(contractId, landlord.address, tenant.address, monthlyRent, startDate);

      const totalContracts = await rentalContract.getTotalContracts();
      expect(totalContracts).to.equal(1);
    });

    it("Should not create duplicate contracts", async function () {
      const { ethers } = hre;
      
      const contractId = "contract-123";
      const propertyId = "property-456";
      const monthlyRent = ethers.parseEther("1.0");
      const securityDeposit = ethers.parseEther("2.0");
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + (365 * 24 * 60 * 60);
      const termsHash = "QmTesthash123";

      // Create first contract
      await rentalContract.createContract(
        contractId,
        propertyId,
        landlord.address,
        tenant.address,
        monthlyRent,
        securityDeposit,
        startDate,
        endDate,
        termsHash
      );

      // Try to create duplicate
      await expect(
        rentalContract.createContract(
          contractId,
          propertyId,
          landlord.address,
          tenant.address,
          monthlyRent,
          securityDeposit,
          startDate,
          endDate,
          termsHash
        )
      ).to.be.revertedWith("Contract already exists");
    });

    it("Should require valid addresses", async function () {
      const { ethers } = hre;
      
      const contractId = "contract-123";
      const propertyId = "property-456";
      const monthlyRent = ethers.parseEther("1.0");
      const securityDeposit = ethers.parseEther("2.0");
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + (365 * 24 * 60 * 60);
      const termsHash = "QmTesthash123";
      const zeroAddress = "0x0000000000000000000000000000000000000000";

      await expect(
        rentalContract.createContract(
          contractId,
          propertyId,
          zeroAddress,
          tenant.address,
          monthlyRent,
          securityDeposit,
          startDate,
          endDate,
          termsHash
        )
      ).to.be.revertedWith("Invalid landlord address");
    });
  });

  describe("Contract Retrieval", function () {
    beforeEach(async function () {
      const { ethers } = hre;
      
      const contractId = "contract-123";
      const propertyId = "property-456";
      const monthlyRent = ethers.parseEther("1.0");
      const securityDeposit = ethers.parseEther("2.0");
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + (365 * 24 * 60 * 60);
      const termsHash = "QmTesthash123";

      await rentalContract.createContract(
        contractId,
        propertyId,
        landlord.address,
        tenant.address,
        monthlyRent,
        securityDeposit,
        startDate,
        endDate,
        termsHash
      );
    });

    it("Should retrieve contract details", async function () {
      const contractId = "contract-123";
      const contractData = await rentalContract.getContract(contractId);

      expect(contractData[0]).to.equal("property-456"); // propertyId
      expect(contractData[1]).to.equal(landlord.address); // landlord
      expect(contractData[2]).to.equal(tenant.address); // tenant
      expect(contractData[8]).to.equal(0); // status (draft)
    });

    it("Should get contracts by landlord", async function () {
      const landlordContracts = await rentalContract.getContractsByLandlord(landlord.address);
      expect(landlordContracts.length).to.equal(1);
      expect(landlordContracts[0]).to.equal("contract-123");
    });

    it("Should get contracts by tenant", async function () {
      const tenantContracts = await rentalContract.getContractsByTenant(tenant.address);
      expect(tenantContracts.length).to.equal(1);
      expect(tenantContracts[0]).to.equal("contract-123");
    });
  });

  describe("Contract Status Updates", function () {
    beforeEach(async function () {
      const { ethers } = hre;
      
      const contractId = "contract-123";
      const propertyId = "property-456";
      const monthlyRent = ethers.parseEther("1.0");
      const securityDeposit = ethers.parseEther("2.0");
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + (365 * 24 * 60 * 60);
      const termsHash = "QmTesthash123";

      await rentalContract.createContract(
        contractId,
        propertyId,
        landlord.address,
        tenant.address,
        monthlyRent,
        securityDeposit,
        startDate,
        endDate,
        termsHash
      );
    });

    it("Should update contract status", async function () {
      const contractId = "contract-123";
      
      await expect(
        rentalContract.connect(landlord).updateContractStatus(contractId, 1)
      )
        .to.emit(rentalContract, "ContractStatusUpdated");

      const contractData = await rentalContract.getContract(contractId);
      expect(contractData[8]).to.equal(1); // status should be active
    });

    it("Should allow tenant to update status", async function () {
      const contractId = "contract-123";
      
      await expect(
        rentalContract.connect(tenant).updateContractStatus(contractId, 1)
      ).to.not.be.reverted;
    });
  });

  describe("Contract Termination", function () {
    beforeEach(async function () {
      const { ethers } = hre;
      
      const contractId = "contract-123";
      const propertyId = "property-456";
      const monthlyRent = ethers.parseEther("1.0");
      const securityDeposit = ethers.parseEther("2.0");
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + (365 * 24 * 60 * 60);
      const termsHash = "QmTesthash123";

      await rentalContract.createContract(
        contractId,
        propertyId,
        landlord.address,
        tenant.address,
        monthlyRent,
        securityDeposit,
        startDate,
        endDate,
        termsHash
      );
    });

    it("Should terminate contract", async function () {
      const contractId = "contract-123";
      
      await expect(
        rentalContract.connect(landlord).terminateContract(contractId)
      )
        .to.emit(rentalContract, "ContractTerminated");

      const contractData = await rentalContract.getContract(contractId);
      expect(contractData[8]).to.equal(3); // status should be terminated
    });

    it("Should not terminate already terminated contract", async function () {
      const contractId = "contract-123";
      
      await rentalContract.connect(landlord).terminateContract(contractId);
      
      await expect(
        rentalContract.connect(landlord).terminateContract(contractId)
      ).to.be.revertedWith("Contract already terminated");
    });
  });

  describe("Contract Verification", function () {
    beforeEach(async function () {
      const { ethers } = hre;
      
      const contractId = "contract-123";
      const propertyId = "property-456";
      const monthlyRent = ethers.parseEther("1.0");
      const securityDeposit = ethers.parseEther("2.0");
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + (365 * 24 * 60 * 60);
      const termsHash = "QmTesthash123";

      await rentalContract.createContract(
        contractId,
        propertyId,
        landlord.address,
        tenant.address,
        monthlyRent,
        securityDeposit,
        startDate,
        endDate,
        termsHash
      );
    });

    it("Should verify valid contract", async function () {
      const { ethers } = hre;
      
      const contractId = "contract-123";
      const monthlyRent = ethers.parseEther("1.0");
      
      const isValid = await rentalContract.verifyContract(
        contractId,
        landlord.address,
        tenant.address,
        monthlyRent
      );
      
      expect(isValid).to.be.true;
    });

    it("Should reject invalid contract data", async function () {
      const { ethers } = hre;
      
      const contractId = "contract-123";
      const wrongRent = ethers.parseEther("2.0");
      
      const isValid = await rentalContract.verifyContract(
        contractId,
        landlord.address,
        tenant.address,
        wrongRent
      );
      
      expect(isValid).to.be.false;
    });
  });
});
