// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Safe Relayer - A relayer for Safe multisig wallet
/// @author Uxío Fuentefría - <uxio@safe.global>
/// @custom:experimental This is an experimental contract.
contract Relayer is Ownable {
    IERC20 public token;
    uint256 public maxPriorityFee;
    uint256 public relayerFee;
    bytes4 public method;

    /// @dev Init contract
    /// @param _token Token for paying refunds. Should be the wrapped version of the base currency (e.g. WETH for mainnet)
    /// @param _maxPriorityFee MaxPriorityFee clients will be paying, so relayer cannot be abused to drain user funds
    /// @param _relayerFee Relayer fee that will be added to the gasPrice when calculating refunds
    /// @param _method Method id that will be called on the Safe
    constructor(
        IERC20 _token,
        uint256 _maxPriorityFee,
        uint256 _relayerFee,
        bytes4 _method
    ) {
        require(address(_token) != address(0), "Token cannot be empty");

        require(_maxPriorityFee > 0, "MaxPriorityFee must be higher than 0");

        token = _token;
        maxPriorityFee = _maxPriorityFee;
        relayerFee = _relayerFee;
        method = _method;
        // Prevent issues with deterministic deployment
        transferOwnership(tx.origin);
    }

    /// @param _token New token for paying refunds
    function changeToken(IERC20 _token) public onlyOwner {
        token = _token;
    }

    /// @param _maxPriorityFee New MaxPriorityFee clients will be paying
    function changeMaxPriorityFee(uint256 _maxPriorityFee) public onlyOwner {
        maxPriorityFee = _maxPriorityFee;
    }

    /// @param _relayerFee New Relayer fee
    function changeRelayerFee(uint256 _relayerFee) public onlyOwner {
        relayerFee = _relayerFee;
    }

    /// @notice Recover tokens sent by mistake to this contract
    /// @dev Ether recovery is not implemented as contract is not payable
    /// @param withdrawToken token to recover
    /// @param target destination for the funds
    function recoverFunds(IERC20 withdrawToken, address target)
        public
        onlyOwner
    {
        withdrawToken.transfer(target, withdrawToken.balanceOf(address(this)));
    }

    /// @notice Relay a transaction and get refunded
    /// @dev It's responsability of the sender to check if the Safe has enough funds to pay
    /// @param target Safe to call
    /// @param functionData ABI encoded Safe `execTransaction` without the method selector
    /// @param target destination for the refund
    function relay(
        address target,
        bytes calldata functionData,
        address refundAccount
    ) external {
        // 9k are for the token transfers + 21k base + data (8 bytes method + 32 bytes address + data)
        // We will use 14 as the gas price per data byte, to avoid overcharging too much
        uint256 gas = gasleft();
        uint256 txMaxPriorityFee = tx.gasprice - block.basefee;
        require(
            txMaxPriorityFee <= maxPriorityFee,
            "maxPriorityFee is higher than expected"
        );

        uint256 additionalGas = 30000 + (40 + functionData.length) * 14;
        uint256 gasPrice = tx.gasprice + relayerFee;

        // The method id is appended by the contract to avoid that another method is called
        bytes memory data = abi.encodePacked(method, functionData);
        bool success;
        // Assembly reduced the costs by 400 gas
        // solhint-disable-next-line no-inline-assembly
        assembly {
            success := call(
                sub(gas(), 12000),
                target,
                0,
                add(data, 0x20),
                mload(data),
                0,
                0
            )
        }
        require(success, "Could not successfully call target");

        // It's responsability of the sender to check if the Safe has enough funds to pay
        address refundTarget = refundAccount == address(0)
            ? msg.sender
            : refundAccount;
        require(
            token.transferFrom(
                target,
                refundTarget,
                (gas - gasleft() + additionalGas) * gasPrice
            ),
            "Could not refund sender"
        );
    }
}
