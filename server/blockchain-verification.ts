import { Request, Response } from 'express';
import { blockchainService } from './blockchain-service';

/**
 * API endpoint to verify a contract on blockchain
 * GET /api/blockchain/verify/:contractId
 */
export async function verifyContractOnBlockchain(req: Request, res: Response) {
  try {
    const { contractId } = req.params;

    if (!blockchainService.isEnabled()) {
      return res.status(503).json({ 
        error: "Blockchain service not available",
        message: "Blockchain features are currently disabled"
      });
    }

    // Get contract from blockchain
    const blockchainData = await blockchainService.getContract(contractId);
    
    // Get total contracts
    const totalContracts = await blockchainService.getTotalContracts();

    res.json({
      success: true,
      contract: {
        contractId,
        propertyId: blockchainData.propertyId,
        landlord: blockchainData.landlord,
        tenant: blockchainData.tenant,
        monthlyRent: blockchainData.monthlyRent,
        securityDeposit: blockchainData.securityDeposit,
        startDate: blockchainData.startDate,
        endDate: blockchainData.endDate,
        termsHash: blockchainData.termsHash,
        status: ["Draft", "Active", "Expired", "Terminated"][blockchainData.status],
        createdAt: blockchainData.createdAt,
      },
      blockchain: {
        totalContracts,
        verified: true,
      }
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: error.message,
      contractId: req.params.contractId,
    });
  }
}

/**
 * API endpoint to get blockchain stats
 * GET /api/blockchain/stats
 */
export async function getBlockchainStats(req: Request, res: Response) {
  try {
    if (!blockchainService.isEnabled()) {
      return res.status(503).json({ 
        error: "Blockchain service not available" 
      });
    }

    const totalContracts = await blockchainService.getTotalContracts();

    res.json({
      success: true,
      enabled: true,
      totalContracts,
      contractAddress: process.env.RENTAL_CONTRACT_ADDRESS,
      network: process.env.BLOCKCHAIN_RPC_URL,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * API endpoint to verify contract authenticity
 * POST /api/blockchain/verify-authenticity
 * Body: { contractId, landlordId, tenantId, monthlyRent }
 */
export async function verifyContractAuthenticity(req: Request, res: Response) {
  try {
    const { contractId, landlordAddress, tenantAddress, monthlyRent } = req.body;

    if (!blockchainService.isEnabled()) {
      return res.status(503).json({ 
        error: "Blockchain service not available" 
      });
    }

    const isValid = await blockchainService.verifyContract(
      contractId,
      landlordAddress,
      tenantAddress,
      monthlyRent
    );

    res.json({
      success: true,
      contractId,
      verified: isValid,
      message: isValid 
        ? "Contract data matches blockchain records" 
        : "Contract data does NOT match blockchain records"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}




