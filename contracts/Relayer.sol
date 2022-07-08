// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Relayer is Ownable {
    ERC20 public token;
    uint public maxPriorityFee;
    uint public relayerFee;
    bytes4 public method;

    event RelayedTransaction(uint amount);

    constructor(ERC20 _token, uint _maxPriorityFee, uint _relayerFee, bytes4 _method) {
        require(
            address(_token) != address(0),
            "Token cannot be empty"
        );

         require(
            _maxPriorityFee > 0,
            "MaxPriorityFee must be higher than 0"
        );

        token = _token;
        maxPriorityFee = _maxPriorityFee;
        relayerFee = _relayerFee;
        method = _method;
    }

    function changeToken(ERC20 _token) public onlyOwner {
        token = _token;
    }

    function changeMaxPriorityFee(uint _maxPriorityFee) public onlyOwner {
        maxPriorityFee = _maxPriorityFee;
    }

    function changeRelayerFee(uint _relayerFee) public onlyOwner {
        relayerFee = _relayerFee;
    }

    function recoverFunds(ERC20 withdrawToken, address target) public onlyOwner {
        // Contract is not payable so ether cannot be sent
        withdrawToken.transfer(target, withdrawToken.balanceOf(address(this)));
    }

    function execute(
        address target,
        bytes calldata functionData
        ) external {
        // 9k are for the token transfers + 21k base + data (8 bytes method + 32 bytes address + data)
        // We will use 14 as the gas price per data byte, to avoid overcharging too much
        uint256 txMaxPriorityFee = tx.gasprice - block.basefee;
        require(txMaxPriorityFee <= maxPriorityFee, "maxPriorityFee is higher than expected");
        uint256 additionalGas = 30000 + (40 + functionData.length) * 14;
        uint256 gasPrice = tx.gasprice + relayerFee;
        require(token.transferFrom(target, address(this), (gasleft() + additionalGas) * gasPrice), "Could not aquire tokens");
        // The method id is appended by the contract to avoid that another method is called
        bytes memory data = abi.encodePacked(method, functionData);
        bool success;
        // Assembly reduced the costs by 400 gas
        assembly {
            success := call(sub(gas(), 12000), target, 0, add(data, 0x20), mload(data), 0, 0)
        }
        require(success, "Could not successfully call target");
        require(token.transfer(target, (gasleft()) * gasPrice), "Could not refund unused gas");
    }
    
}
