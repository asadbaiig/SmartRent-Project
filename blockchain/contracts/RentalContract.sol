// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title RentalContract
 * @dev Smart contract for managing rental agreements on blockchain
 */
contract RentalContract {
    
    // Struct to store rental contract data
    struct Contract {
        string contractId;        // Off-chain database ID
        string propertyId;        // Property reference
        address landlord;         // Landlord's blockchain address
        address tenant;           // Tenant's blockchain address
        uint256 monthlyRent;      // Monthly rent in wei
        uint256 securityDeposit;  // Security deposit in wei
        uint256 startDate;        // Contract start timestamp
        uint256 endDate;          // Contract end timestamp
        string termsHash;         // IPFS hash or hash of contract terms
        uint8 status;             // 0: draft, 1: active, 2: expired, 3: terminated
        uint256 createdAt;        // Creation timestamp
        bool exists;              // Check if contract exists
    }
    
    // Events
    event ContractCreated(
        string indexed contractId,
        address indexed landlord,
        address indexed tenant,
        uint256 monthlyRent,
        uint256 startDate
    );
    
    event ContractStatusUpdated(
        string indexed contractId,
        uint8 oldStatus,
        uint8 newStatus,
        uint256 timestamp
    );
    
    event ContractTerminated(
        string indexed contractId,
        address terminatedBy,
        uint256 timestamp
    );
    
    // State variables
    mapping(string => Contract) public contracts;
    mapping(address => string[]) public landlordContracts;
    mapping(address => string[]) public tenantContracts;
    string[] public allContractIds;
    
    address public owner;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can call this");
        _;
    }
    
    modifier contractExists(string memory _contractId) {
        require(contracts[_contractId].exists, "Contract does not exist");
        _;
    }
    
    modifier onlyContractParties(string memory _contractId) {
        require(
            msg.sender == contracts[_contractId].landlord || 
            msg.sender == contracts[_contractId].tenant ||
            msg.sender == owner,
            "Only contract parties or owner can call this"
        );
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Create a new rental contract on blockchain
     */
    function createContract(
        string memory _contractId,
        string memory _propertyId,
        address _landlord,
        address _tenant,
        uint256 _monthlyRent,
        uint256 _securityDeposit,
        uint256 _startDate,
        uint256 _endDate,
        string memory _termsHash
    ) public returns (bool) {
        require(!contracts[_contractId].exists, "Contract already exists");
        require(_landlord != address(0), "Invalid landlord address");
        require(_tenant != address(0), "Invalid tenant address");
        require(_monthlyRent > 0, "Monthly rent must be greater than 0");
        require(_endDate > _startDate, "End date must be after start date");
        
        Contract memory newContract = Contract({
            contractId: _contractId,
            propertyId: _propertyId,
            landlord: _landlord,
            tenant: _tenant,
            monthlyRent: _monthlyRent,
            securityDeposit: _securityDeposit,
            startDate: _startDate,
            endDate: _endDate,
            termsHash: _termsHash,
            status: 0, // draft
            createdAt: block.timestamp,
            exists: true
        });
        
        contracts[_contractId] = newContract;
        landlordContracts[_landlord].push(_contractId);
        tenantContracts[_tenant].push(_contractId);
        allContractIds.push(_contractId);
        
        emit ContractCreated(_contractId, _landlord, _tenant, _monthlyRent, _startDate);
        
        return true;
    }
    
    /**
     * @dev Update contract status
     */
    function updateContractStatus(
        string memory _contractId,
        uint8 _newStatus
    ) public contractExists(_contractId) onlyContractParties(_contractId) returns (bool) {
        require(_newStatus <= 3, "Invalid status");
        
        Contract storage contractData = contracts[_contractId];
        uint8 oldStatus = contractData.status;
        contractData.status = _newStatus;
        
        emit ContractStatusUpdated(_contractId, oldStatus, _newStatus, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Terminate contract
     */
    function terminateContract(
        string memory _contractId
    ) public contractExists(_contractId) onlyContractParties(_contractId) returns (bool) {
        Contract storage contractData = contracts[_contractId];
        require(contractData.status != 3, "Contract already terminated");
        
        uint8 oldStatus = contractData.status;
        contractData.status = 3; // terminated
        
        emit ContractTerminated(_contractId, msg.sender, block.timestamp);
        emit ContractStatusUpdated(_contractId, oldStatus, 3, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Get contract details
     */
    function getContract(string memory _contractId) 
        public 
        view 
        contractExists(_contractId)
        returns (
            string memory propertyId,
            address landlord,
            address tenant,
            uint256 monthlyRent,
            uint256 securityDeposit,
            uint256 startDate,
            uint256 endDate,
            string memory termsHash,
            uint8 status,
            uint256 createdAt
        ) 
    {
        Contract memory contractData = contracts[_contractId];
        return (
            contractData.propertyId,
            contractData.landlord,
            contractData.tenant,
            contractData.monthlyRent,
            contractData.securityDeposit,
            contractData.startDate,
            contractData.endDate,
            contractData.termsHash,
            contractData.status,
            contractData.createdAt
        );
    }
    
    /**
     * @dev Get contracts by landlord
     */
    function getContractsByLandlord(address _landlord) 
        public 
        view 
        returns (string[] memory) 
    {
        return landlordContracts[_landlord];
    }
    
    /**
     * @dev Get contracts by tenant
     */
    function getContractsByTenant(address _tenant) 
        public 
        view 
        returns (string[] memory) 
    {
        return tenantContracts[_tenant];
    }
    
    /**
     * @dev Get total number of contracts
     */
    function getTotalContracts() public view returns (uint256) {
        return allContractIds.length;
    }
    
    /**
     * @dev Verify contract authenticity
     */
    function verifyContract(
        string memory _contractId,
        address _landlord,
        address _tenant,
        uint256 _monthlyRent
    ) public view contractExists(_contractId) returns (bool) {
        Contract memory contractData = contracts[_contractId];
        return (
            contractData.landlord == _landlord &&
            contractData.tenant == _tenant &&
            contractData.monthlyRent == _monthlyRent
        );
    }
}




