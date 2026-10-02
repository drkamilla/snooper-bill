// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/ArcBatchPayout.sol";

contract MockToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount && allowance[from][msg.sender] >= amount);
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract InvariantHandler is Test {
    ArcBatchPayout public payout;
    MockToken public token;

    constructor(ArcBatchPayout _payout, MockToken _token) {
        payout = _payout;
        token = _token;
    }

    function performPayout(uint8 recipientsCount, uint64 rawAmount) external {
        uint256 count = (recipientsCount % 50) + 1; // от 1 до 50 получателей
        uint256 amount = (rawAmount % 10_000) + 1;
        uint256 total = count * amount;

        token.mint(address(this), total);
        token.approve(address(payout), total);

        ArcBatchPayout.PayoutItem[] memory items = new ArcBatchPayout.PayoutItem[](count);
        for (uint256 i = 0; i < count; i++) {
            items[i] = ArcBatchPayout.PayoutItem(address(uint160(i + 1000)), amount, bytes32(0));
        }

        payout.batchPayout(address(token), items);
    }
}

contract ArcBatchPayoutInvariantTest is Test {
    ArcBatchPayout public payout;
    MockToken public token;
    InvariantHandler public handler;

    function setUp() public {
        payout = new ArcBatchPayout();
        token = new MockToken();
        handler = new InvariantHandler(payout, token);
        targetContract(address(handler));
    }

    // Главный инвариант: на балансе контракта payout всегда 0 токенов
    function invariant_ContractBalanceAlwaysZero() public view {
        assertEq(token.balanceOf(address(payout)), 0, "SOLVENCY_BREACH: Contract retained tokens");
    }
}
