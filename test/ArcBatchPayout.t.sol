// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/ArcBatchPayout.sol";

contract MockUSDCWithBlacklist {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public isBlacklisted;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function blacklist(address account) external {
        isBlacklisted[account] = true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(!isBlacklisted[msg.sender] && !isBlacklisted[to], "Blacklisted");
        require(balanceOf[msg.sender] >= amount, "No balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(!isBlacklisted[from] && !isBlacklisted[to], "Blacklisted");
        require(balanceOf[from] >= amount, "No balance");
        require(allowance[from][msg.sender] >= amount, "No allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract ArcBatchPayoutEdgeCasesTest is Test {
    ArcBatchPayout public payout;
    MockUSDCWithBlacklist public token;

    function setUp() public {
        payout = new ArcBatchPayout();
        token = new MockUSDCWithBlacklist();
    }

    // 1. Проверка реверта на пустом батче
    function test_RevertWhen_EmptyBatch() public {
        ArcBatchPayout.PayoutItem[] memory items = new ArcBatchPayout.PayoutItem[](0);
        vm.expectRevert(ArcBatchPayout.EmptyBatch.selector);
        payout.batchPayout(address(token), items);
    }

    // 2. Проверка реверта при превышении лимита (251 получатель)
    function test_RevertWhen_BatchExceeded() public {
        ArcBatchPayout.PayoutItem[] memory items = new ArcBatchPayout.PayoutItem[](251);
        for (uint256 i = 0; i < 251; i++) {
            items[i] = ArcBatchPayout.PayoutItem(address(uint160(i + 1)), 100, bytes32(0));
        }
        vm.expectRevert(abi.encodeWithSelector(ArcBatchPayout.BatchSizeExceeded.selector, 251, 250));
        payout.batchPayout(address(token), items);
    }

    // 3. Проверка реверта на нулевой адрес получателя
    function test_RevertWhen_RecipientZeroAddress() public {
        ArcBatchPayout.PayoutItem[] memory items = new ArcBatchPayout.PayoutItem[](1);
        items[0] = ArcBatchPayout.PayoutItem(address(0), 100, bytes32(0));

        vm.expectRevert(abi.encodeWithSelector(ArcBatchPayout.RecipientZeroAddress.selector, 0));
        payout.batchPayout(address(token), items);
    }

    // 4. Проверка реверта при отправке на адрес самого контракта
    function test_RevertWhen_RecipientSelfAddress() public {
        ArcBatchPayout.PayoutItem[] memory items = new ArcBatchPayout.PayoutItem[](1);
        items[0] = ArcBatchPayout.PayoutItem(address(payout), 100, bytes32(0));

        vm.expectRevert(abi.encodeWithSelector(ArcBatchPayout.RecipientSelfAddress.selector, 0));
        payout.batchPayout(address(token), items);
    }

    // 5. Проверка реверта при передаче токена = address(this)
    function test_RevertWhen_TokenIsContractAddress() public {
        ArcBatchPayout.PayoutItem[] memory items = new ArcBatchPayout.PayoutItem[](1);
        items[0] = ArcBatchPayout.PayoutItem(address(0x123), 100, bytes32(0));

        vm.expectRevert(ArcBatchPayout.InvalidTokenAddress.selector);
        payout.batchPayout(address(payout), items);
    }

    // 6. Проверка атомарного отката при попадании одного адреса в Blacklist Circle
    function test_RevertWhen_OneRecipientBlacklisted() public {
        address badActor = address(0x666);
        token.blacklist(badActor);

        token.mint(address(this), 1000);
        token.approve(address(payout), 1000);

        ArcBatchPayout.PayoutItem[] memory items = new ArcBatchPayout.PayoutItem[](2);
        items[0] = ArcBatchPayout.PayoutItem(address(0x111), 500, bytes32(0));
        items[1] = ArcBatchPayout.PayoutItem(badActor, 500, bytes32(0));

        // Ожидаем проброс реальной ошибки токена "Blacklisted"
        vm.expectRevert(bytes("Blacklisted"));
        payout.batchPayout(address(token), items);

        // Проверяем, что из-за атомарности первый получатель ничего не получил
        assertEq(token.balanceOf(address(0x111)), 0);
        assertEq(token.balanceOf(address(this)), 1000);
    }

    // 7. Стресс-тест на газ при максимальном батче (250 получателей)
    function test_MaxBatchGasUsage() public {
        uint256 count = 250;
        ArcBatchPayout.PayoutItem[] memory items = new ArcBatchPayout.PayoutItem[](count);

        for (uint256 i = 0; i < count; i++) {
            items[i] = ArcBatchPayout.PayoutItem(address(uint160(i + 1)), 10, bytes32(0));
        }

        token.mint(address(this), 2500);
        token.approve(address(payout), 2500);

        uint256 gasStart = gasleft();
        payout.batchPayout(address(token), items);
        uint256 gasUsed = gasStart - gasleft();

        emit log_named_uint("Gas used for 250 transfers", gasUsed);
        // Должно легко укладываться в лимиты блока (< 15M)
        assertLt(gasUsed, 15_000_000);
    }
}
