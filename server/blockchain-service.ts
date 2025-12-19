import { ethers } from "ethers";
import * as crypto from "crypto";

// Import the contract ABI (will be generated after compilation)
import * as path from "path";
import * as fs from "fs";

let RentalContractABI: any;
try {
  // Use absolute path resolution
  const abiPath = path.join(process.cwd(), "blockchain", "artifacts", "contracts", "RentalContract.sol", "RentalContract.json");
  if (fs.existsSync(abiPath)) {
    const abiData = fs.readFileSync(abiPath, "utf8");
    RentalContractABI = JSON.parse(abiData);
    console.log("[Blockchain] Contract ABI loaded successfully");
  } else {
    console.warn("[Blockchain] Contract ABI not found at:", abiPath);
  }
} catch (error) {
  console.warn("[Blockchain] Error loading contract ABI:", error);
}

export interface BlockchainContractData {
  contractId: string;
  propertyId: string;
  landlordAddress: string;
  tenantAddress: string;
  monthlyRent: string;
  securityDeposit: string;
  startDate: Date;
  endDate: Date;
  terms: any;
  status: number;
}

export class BlockchainService {
  private provider: ethers.Provider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;
  private enabled: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize immediately - allow .env to be loaded first
    // Call initialize() manually or it will be called on first use
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
      this.initialized = true;
    }
  }

  private initialize() {
    try {
      // Debug: Check all blockchain env variables
      console.log("[Blockchain] Checking environment variables...");
      console.log("[Blockchain] BLOCKCHAIN_ENABLED:", process.env.BLOCKCHAIN_ENABLED);
      console.log("[Blockchain] BLOCKCHAIN_RPC_URL:", process.env.BLOCKCHAIN_RPC_URL);
      console.log("[Blockchain] BLOCKCHAIN_PRIVATE_KEY:", process.env.BLOCKCHAIN_PRIVATE_KEY ? "SET" : "NOT SET");
      console.log("[Blockchain] RENTAL_CONTRACT_ADDRESS:", process.env.RENTAL_CONTRACT_ADDRESS);
      
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
      this.contractAddress = process.env.RENTAL_CONTRACT_ADDRESS || null;

      if (!privateKey) {
        console.warn("[Blockchain] BLOCKCHAIN_PRIVATE_KEY not set. Blockchain features disabled.");
        return;
      }

      if (!this.contractAddress) {
        console.warn("[Blockchain] RENTAL_CONTRACT_ADDRESS not set. Blockchain features disabled.");
        return;
      }

      if (!RentalContractABI) {
        console.warn("[Blockchain] Contract ABI not available. Please compile contracts.");
        return;
      }

      // Connect to the blockchain
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(
        this.contractAddress,
        RentalContractABI.abi,
        this.wallet
      );

      this.enabled = true;
      console.log("[Blockchain] Service initialized successfully");
      console.log(`[Blockchain] Connected to: ${rpcUrl}`);
      console.log(`[Blockchain] Contract address: ${this.contractAddress}`);
    } catch (error) {
      console.error("[Blockchain] Initialization failed:", error);
      this.enabled = false;
    }
  }

  public isEnabled(): boolean {
    this.ensureInitialized();
    return this.enabled;
  }

  /**
   * Generate a hash of contract terms for blockchain storage
   */
  private hashContractTerms(terms: any): string {
    const termsString = JSON.stringify(terms);
    return crypto.createHash("sha256").update(termsString).digest("hex");
  }

  /**
   * Convert PKR to wei (for demo purposes, using a conversion rate)
   * In production, you might want to use a stablecoin or oracle
   */
  private pkrToWei(pkr: string | number): bigint {
    const pkrAmount = typeof pkr === "string" ? parseFloat(pkr) : pkr;
    // For demo: 1 PKR = 1000000000000 wei (0.000001 ETH)
    // Adjust this based on your tokenomics
    return ethers.parseUnits((pkrAmount * 0.000001).toFixed(18), "ether");
  }

  /**
   * Generate a deterministic Ethereum address from a user ID
   * In production, users should have their own wallet addresses
   */
  private generateAddressFromId(userId: string): string {
    // Create a deterministic hash of the user ID
    const hash = crypto.createHash("sha256").update(userId).digest("hex");
    // Take first 40 characters (20 bytes) and prepend 0x
    return "0x" + hash.substring(0, 40);
  }

  /**
   * Create a contract on the blockchain
   */
  async createContract(data: BlockchainContractData): Promise<string | null> {
    this.ensureInitialized();
    if (!this.enabled || !this.contract) {
      console.warn("[Blockchain] Service not enabled. Skipping blockchain storage.");
      return null;
    }

    try {
      console.log(`[Blockchain] Creating contract ${data.contractId}...`);

      const termsHash = this.hashContractTerms(data.terms);
      const monthlyRentWei = this.pkrToWei(data.monthlyRent);
      const securityDepositWei = this.pkrToWei(data.securityDeposit);
      const startDateTimestamp = Math.floor(data.startDate.getTime() / 1000);
      const endDateTimestamp = Math.floor(data.endDate.getTime() / 1000);

      // Convert user IDs to valid Ethereum addresses
      // In production, users would have their own wallet addresses
      const landlordAddress = this.generateAddressFromId(data.landlordAddress);
      const tenantAddress = this.generateAddressFromId(data.tenantAddress);

      console.log(`[Blockchain] Landlord: ${data.landlordAddress} → ${landlordAddress}`);
      console.log(`[Blockchain] Tenant: ${data.tenantAddress} → ${tenantAddress}`);

      // Call the smart contract
      const tx = await this.contract.createContract(
        data.contractId,
        data.propertyId,
        landlordAddress,
        tenantAddress,
        monthlyRentWei,
        securityDepositWei,
        startDateTimestamp,
        endDateTimestamp,
        termsHash
      );

      console.log(`[Blockchain] Transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`[Blockchain] Contract created in block: ${receipt.blockNumber}`);

      return tx.hash;
    } catch (error: any) {
      console.error("[Blockchain] Error creating contract:", error);
      throw new Error(`Blockchain error: ${error.message}`);
    }
  }

  /**
   * Update contract status on blockchain
   */
  async updateContractStatus(contractId: string, status: number): Promise<string | null> {
    this.ensureInitialized();
    if (!this.enabled || !this.contract) {
      console.warn("[Blockchain] Service not enabled. Skipping status update.");
      return null;
    }

    try {
      console.log(`[Blockchain] Updating contract ${contractId} status to ${status}...`);

      const tx = await this.contract.updateContractStatus(contractId, status);
      const receipt = await tx.wait();

      console.log(`[Blockchain] Status updated in block: ${receipt.blockNumber}`);
      return tx.hash;
    } catch (error: any) {
      console.error("[Blockchain] Error updating status:", error);
      throw new Error(`Blockchain error: ${error.message}`);
    }
  }

  /**
   * Terminate a contract on blockchain
   */
  async terminateContract(contractId: string): Promise<string | null> {
    this.ensureInitialized();
    if (!this.enabled || !this.contract) {
      console.warn("[Blockchain] Service not enabled. Skipping termination.");
      return null;
    }

    try {
      console.log(`[Blockchain] Terminating contract ${contractId}...`);

      const tx = await this.contract.terminateContract(contractId);
      const receipt = await tx.wait();

      console.log(`[Blockchain] Contract terminated in block: ${receipt.blockNumber}`);
      return tx.hash;
    } catch (error: any) {
      console.error("[Blockchain] Error terminating contract:", error);
      throw new Error(`Blockchain error: ${error.message}`);
    }
  }

  /**
   * Get contract from blockchain
   */
  async getContract(contractId: string): Promise<any> {
    this.ensureInitialized();
    if (!this.enabled || !this.contract) {
      throw new Error("Blockchain service not enabled");
    }

    try {
      const contractData = await this.contract.getContract(contractId);
      
      return {
        propertyId: contractData[0],
        landlord: contractData[1],
        tenant: contractData[2],
        monthlyRent: contractData[3].toString(),
        securityDeposit: contractData[4].toString(),
        startDate: new Date(Number(contractData[5]) * 1000),
        endDate: new Date(Number(contractData[6]) * 1000),
        termsHash: contractData[7],
        status: Number(contractData[8]),
        createdAt: new Date(Number(contractData[9]) * 1000),
      };
    } catch (error: any) {
      console.error("[Blockchain] Error getting contract:", error);
      throw new Error(`Blockchain error: ${error.message}`);
    }
  }

  /**
   * Verify contract on blockchain
   */
  async verifyContract(
    contractId: string,
    landlordAddress: string,
    tenantAddress: string,
    monthlyRent: string
  ): Promise<boolean> {
    this.ensureInitialized();
    if (!this.enabled || !this.contract) {
      return false;
    }

    try {
      const monthlyRentWei = this.pkrToWei(monthlyRent);
      
      const isValid = await this.contract.verifyContract(
        contractId,
        landlordAddress,
        tenantAddress,
        monthlyRentWei
      );

      return isValid;
    } catch (error: any) {
      console.error("[Blockchain] Error verifying contract:", error);
      return false;
    }
  }

  /**
   * Get contracts by landlord
   */
  async getContractsByLandlord(landlordAddress: string): Promise<string[]> {
    this.ensureInitialized();
    if (!this.enabled || !this.contract) {
      return [];
    }

    try {
      return await this.contract.getContractsByLandlord(landlordAddress);
    } catch (error: any) {
      console.error("[Blockchain] Error getting landlord contracts:", error);
      return [];
    }
  }

  /**
   * Get contracts by tenant
   */
  async getContractsByTenant(tenantAddress: string): Promise<string[]> {
    this.ensureInitialized();
    if (!this.enabled || !this.contract) {
      return [];
    }

    try {
      return await this.contract.getContractsByTenant(tenantAddress);
    } catch (error: any) {
      console.error("[Blockchain] Error getting tenant contracts:", error);
      return [];
    }
  }

  /**
   * Get total contracts count
   */
  async getTotalContracts(): Promise<number> {
    this.ensureInitialized();
    if (!this.enabled || !this.contract) {
      return 0;
    }

    try {
      const total = await this.contract.getTotalContracts();
      return Number(total);
    } catch (error: any) {
      console.error("[Blockchain] Error getting total contracts:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();

