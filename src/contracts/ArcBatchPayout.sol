// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title ArcBatchPayout
 * @author ArcSettle Security Team
 * @notice Enterprise-grade, immutable, non-custodial batch settlement engine for Circle USDC / EURC & ERC20.
 * @dev Fully compliant with EVM Cancun (EIP-1153), ISO 20022 End-to-End Reference, and OpenZeppelin v5.x standards.
 * 
 * ARCHITECTURAL SPECIFICATIONS:
 * 1. Strict Atomicity (All-or-Nothing): If any recipient is blacklisted by Circle or has invalid parameters,
 *    the entire batch reverts to preserve institutional ledger integrity.
 * 2. Immutable Zero-Custody: The contract has no owner, zero fees, and zero backdoors. Funds are never held on-chain.
 * 3. Designed natively for 1:1 stablecoins (USDC, EURC, USDT).
 */
contract ArcBatchPayout {
    // --- CUSTOM ERRORS ---
    error InvalidTokenAddress();
    error NotAContract(address target);
    error EmptyBatch();
    error BatchSizeExceeded(uint256 length, uint256 max);
    error RecipientZeroAddress(uint256 index);
    error RecipientSelfAddress(uint256 index);
    error ZeroAmount(uint256 index);
    error ERC20OperationFailed();
    error ReentrancyGuardLocked();

    // --- PROTOCOL CONSTANTS & STATE ---
    uint256 public constant MAX_BATCH_SIZE = 250;

    /// @dev EIP-1153 Transient storage slot for gas-optimized reentrancy lock (Cancun)
    bytes32 private constant REENTRANCY_GUARD_SLOT = 
        0x524dc8ffbcfb8f8faef1cf08e7c10b7ee22be589574d538e12ec6f2be886fa00;

    /// @notice Monotonically increasing sequential nonce for deterministic batch auditing
    uint256 public batchNonce;

    // --- REENTRANCY GUARD (Cancun Transient Storage) ---
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        bool entered;
        /// @solidity memory-safe-assembly
        assembly {
            entered := tload(REENTRANCY_GUARD_SLOT)
            tstore(REENTRANCY_GUARD_SLOT, 1)
        }
        if (entered) revert ReentrancyGuardLocked();
    }

    function _nonReentrantAfter() private {
        /// @solidity memory-safe-assembly
        assembly {
            tstore(REENTRANCY_GUARD_SLOT, 0)
        }
    }

    // --- EVENTS (ISO 20022 / ERP / ArcScan Reconciliation) ---
    
    /**
     * @notice Emitted on individual payment settlement.
     * @dev Max 3 indexed topics for EVM bloom filters. Token address in data segment eliminates event spoofing.
     */
    event PayoutSettled(
        address indexed sender,
        address indexed recipient,
        bytes32 indexed memoId,
        address token,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @notice Emitted on atomic batch closure with cryptographic fingerprint.
     */
    event BatchCompleted(
        address indexed sender,
        address indexed token,
        bytes32 indexed batchHash,
        uint256 totalAmount,
        uint256 totalRecipients,
        uint256 nonce
    );

    struct PayoutItem {
        address recipient;
        uint256 amount;
        bytes32 memoId; // ISO 20022 End-to-End Identification reference
    }

    /**
     * @notice Primary batch settlement dispatcher with on-chain Arc Memo attribution
     * @param token Address of Circle USDC or EURC contract
     * @param items Array of payout orders
     * @return batchHash Deterministic cryptographic hash of the settled batch
     * @return nonce Sequential audit ID of the batch
     */
    function batchPayout(
        address token,
        PayoutItem[] calldata items
    ) external nonReentrant returns (bytes32 batchHash, uint256 nonce) {
        _validateToken(token);

        uint256 len = items.length;
        if (len == 0) revert EmptyBatch();
        if (len > MAX_BATCH_SIZE) revert BatchSizeExceeded(len, MAX_BATCH_SIZE);

        uint256 total = 0;

        // Phase 1: Pre-execution validation of inputs before state mutation
        for (uint256 i = 0; i < len;) {
            address to = items[i].recipient;
            uint256 amt = items[i].amount;

            if (to == address(0)) revert RecipientZeroAddress(i);
            if (to == address(this)) revert RecipientSelfAddress(i);
            if (amt == 0) revert ZeroAmount(i);

            total += amt;
            unchecked { ++i; }
        }

        // Phase 2: Atomic pull of exact total balance from sender
        _safeTransferFrom(token, msg.sender, address(this), total);

        // Phase 3: Push transfers to recipients with structured event logs
        for (uint256 i = 0; i < len;) {
            PayoutItem calldata item = items[i];

            _safeTransfer(token, item.recipient, item.amount);

            emit PayoutSettled(
                msg.sender,
                item.recipient,
                item.memoId,
                token,
                item.amount,
                block.timestamp
            );

            unchecked { ++i; }
        }

        nonce = ++batchNonce;

        // Cryptographic batch fingerprint binding network parameters and calldata
        batchHash = keccak256(
            abi.encode(
                block.chainid,
                nonce,
                msg.sender,
                token,
                total,
                block.timestamp,
                keccak256(msg.data)
            )
        );

        emit BatchCompleted(
            msg.sender,
            token,
            batchHash,
            total,
            len,
            nonce
        );

        return (batchHash, nonce);
    }

    // --- INTERNAL SAFE ERC-20 LAYER ---

    function _validateToken(address token) internal view {
        if (token == address(0) || token == address(this)) revert InvalidTokenAddress();
        if (token.code.length == 0) revert NotAContract(token);
    }

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, value)
        );
        _handleReturn(success, data);
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, value)
        );
        _handleReturn(success, data);
    }

    /**
     * @dev Low-level return data inspector:
     * - Bubbles up exact issuer revert strings (e.g. Circle USDC Blacklist / Allowance).
     * - Gracefully supports non-returning tokens (USDT style) and strictly checks boolean flags.
     */
    function _handleReturn(bool success, bytes memory data) private pure {
        if (!success) {
            if (data.length > 0) {
                /// @solidity memory-safe-assembly
                assembly {
                    revert(add(32, data), mload(data))
                }
            }
            revert ERC20OperationFailed();
        }

        if (data.length > 0 && (data.length < 32 || !abi.decode(data, (bool)))) {
            revert ERC20OperationFailed();
        }
    }
}