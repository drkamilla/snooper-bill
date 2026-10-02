'forge clean' running (wd: /home/workspace/arc-audit)
'forge config --json' running
'forge build --build-info --deny never --skip ./test/** ./script/** --force' running (wd: /home/kamikakrasotka/arc-audit)
**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [calls-loop](#calls-loop) (1 results) (Low)
 - [reentrancy-benign](#reentrancy-benign) (1 results) (Low)
 - [assembly](#assembly) (3 results) (Informational)
 - [low-level-calls](#low-level-calls) (2 results) (Informational)
## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-0
[ArcBatchPayout._safeTransfer(address,address,uint256)](src/ArcBatchPayout.sol#L177-L182) has external calls inside a loop: [(success,data) = token.call(abi.encodeWithSelector(0xa9059cbb,to,value))](src/ArcBatchPayout.sol#L178-L182)
	Calls stack containing the loop:
		ArcBatchPayout.batchPayout(address,ArcBatchPayout.PayoutItem[])

src/ArcBatchPayout.sol#L177-L182


## reentrancy-benign
Impact: Low
Confidence: Medium
 - [ ] ID-1
Reentrancy in [ArcBatchPayout.batchPayout(address,ArcBatchPayout.PayoutItem[])](src/ArcBatchPayout.sol#L99-L164):
	External calls:
	- [_safeTransferFrom(token,msg.sender,address(this),total)](src/ArcBatchPayout.sol#L123-L127)
		- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](src/ArcBatchPayout.sol#L184-L189)
	- [_safeTransfer(token,item.recipient,item.amount)](src/ArcBatchPayout.sol#L130-L131)
		- [(success,data) = token.call(abi.encodeWithSelector(0xa9059cbb,to,value))](src/ArcBatchPayout.sol#L178-L182)
	State variables written after the call(s):
	- [nonce = ++ batchNonce](src/ArcBatchPayout.sol#L140-L141)

src/ArcBatchPayout.sol#L99-L164


## assembly
Impact: Informational
Confidence: High
 - [ ] ID-2
[ArcBatchPayout._nonReentrantAfter()](src/ArcBatchPayout.sol#L52-L58) uses assembly
	- [INLINE ASM](src/ArcBatchPayout.sol#L55-L57)

src/ArcBatchPayout.sol#L52-L58


 - [ ] ID-3
[ArcBatchPayout._handleReturn(bool,bytes)](src/ArcBatchPayout.sol#L198-L208) uses assembly
	- [INLINE ASM](src/ArcBatchPayout.sol#L201-L202)

src/ArcBatchPayout.sol#L198-L208


 - [ ] ID-4
[ArcBatchPayout._nonReentrantBefore()](src/ArcBatchPayout.sol#L42-L52) uses assembly
	- [INLINE ASM](src/ArcBatchPayout.sol#L47-L50)

src/ArcBatchPayout.sol#L42-L52


## low-level-calls
Impact: Informational
Confidence: High
 - [ ] ID-5
Low level call in [ArcBatchPayout._safeTransferFrom(address,address,address,uint256)](src/ArcBatchPayout.sol#L182-L189):
	- [(success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value))](src/ArcBatchPayout.sol#L184-L189)

src/ArcBatchPayout.sol#L182-L189


 - [ ] ID-6
Low level call in [ArcBatchPayout._safeTransfer(address,address,uint256)](src/ArcBatchPayout.sol#L177-L182):
	- [(success,data) = token.call(abi.encodeWithSelector(0xa9059cbb,to,value))](src/ArcBatchPayout.sol#L178-L182)

src/ArcBatchPayout.sol#L177-L182


