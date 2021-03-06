// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";

contract ExampleGnosisSafe is GnosisSafe {
    // solhint-disable-next-line func-visibility
    constructor() {
        // Don't initialize the contract, so we don't need to use proxies for testing
        threshold = 0;
    }
}
