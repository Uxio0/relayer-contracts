// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {Relayer} from "./Relayer.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Token} from "./test/ERC20Token.sol";

contract MockTarget {
    uint256 public lastValue;
    address public lastCaller;

    function execute(uint256 newValue) external {
        lastValue = newValue;
        lastCaller = msg.sender;
    }

    function approveRelayer(
        IERC20 token,
        address relayer,
        uint256 amount
    ) external {
        token.approve(relayer, amount);
    }
}

contract RelayerTest is Test {
    Relayer internal relayer;
    ERC20Token internal token;
    MockTarget internal target;

    address internal refundRecipient;
    address internal owner;

    function setUp() public {
        relayer = new Relayer();
        token = new ERC20Token();
        target = new MockTarget();
        refundRecipient = address(0xBEEF);
        owner = relayer.owner();

        vm.prank(owner);
        relayer.setup(
            IERC20(address(token)),
            10 gwei,
            0,
            MockTarget.execute.selector
        );
    }

    function test_SetupInitializesState() public view {
        assertEq(address(relayer.token()), address(token));
        assertEq(relayer.maxPriorityFee(), 10 gwei);
        assertEq(relayer.relayerFee(), 0);
        assertEq(relayer.method(), MockTarget.execute.selector);
    }

    function test_SetupCanOnlyBeCalledOnce() public {
        vm.startPrank(owner);
        vm.expectRevert("Setup was already called");
        relayer.setup(
            IERC20(address(token)),
            1 gwei,
            1,
            MockTarget.execute.selector
        );
        vm.stopPrank();
    }

    function test_RelayRevertsIfMaxPriorityFeeExceeded() public {
        vm.txGasPrice(30 gwei);
        vm.fee(10 gwei);

        vm.expectRevert("maxPriorityFee is higher than expected");
        relayer.relay(address(target), abi.encode(uint256(123)), refundRecipient);
    }

    function test_RelayExecutesCallAndRefunds() public {
        vm.txGasPrice(20 gwei);
        vm.fee(10 gwei);

        uint256 valueToSend = 123;
        uint256 startingBalance = token.balanceOf(refundRecipient);

        token.transfer(address(target), 1 ether);
        target.approveRelayer(
            IERC20(address(token)),
            address(relayer),
            type(uint256).max
        );

        relayer.relay(address(target), abi.encode(valueToSend), refundRecipient);

        assertEq(target.lastValue(), valueToSend);
        assertEq(target.lastCaller(), address(relayer));
        assertGt(token.balanceOf(refundRecipient), startingBalance);
    }
}
