// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Lock {
    uint public unlockTime;
    address public owner;

    event Withdrawal(uint amount, uint when);

    constructor(uint _unlockTime) payable {
        require(
            block.timestamp < _unlockTime,
            "Unlock time should be in the future"
        );

        unlockTime = _unlockTime;
        owner = msg.sender;
    }

    function withdraw() public {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        payable(owner).transfer(address(this).balance);
    }
}

