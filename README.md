# Snooper Bill

### Human-Proof Batch Payroll & Vendor Settlement on Arc Mainnet

[![Network: Arc Mainnet](https://img.shields.io/badge/Network-Arc_Mainnet_5042-0052FF?style=flat-square)](https://explorer.arc.io)
[![Gas: Native USDC](https://img.shields.io/badge/Gas-Native_USDC-2775CA?style=flat-square)](https://arc.io)
[![Audit: Slither Passed](https://img.shields.io/badge/Static_Audit-Slither_Passed-success?style=flat-square)](./audit/audit_report_slither.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square)](LICENSE)

Snooper Bill was engineered around a simple, uncomfortable truth in corporate finance: **most accountants and payroll clerks have never touched crypto, and the first time they are asked to execute on-chain payouts, they are terrified.**

If a CFO hands a finance officer an invoice spreadsheet and a treasury wallet, the margin for error is brutal. A copy-pasted TRON or Solana address, an unexpected comma vs. decimal notation, or an uncalculated gas token balance can result in irrecoverable losses or failed payroll runs.

**Snooper Bill bridges traditional enterprise bookkeeping with Arc’s stablecoin-native financial rails.** It acts as an autonomous safety buffer between `.xlsx`/`.csv` manifests and atomic on-chain disbursements.

---

## Live Deployment & Verification (Arc Mainnet)

| Parameter | Mainnet Value |
| :--- | :--- |
| **Network Name** | Arc Mainnet |
| **Chain ID** | `5042` |
| **Gas Token** | Native **USDC** (18 decimals native gas, deterministic sub-second finality) |
| **Public RPC** | `https://rpc.drpc.mainnet.arc.io` / `https://rpc.mainnet.arc.io` |
| **Block Explorer** | [https://explorer.arc.io](https://explorer.arc.io) |
| **Deployed Batch Contract** | [`0x0a14C17610C2d8559ba770CcC0798D080A62deD0`](https://explorer.arc.io/address/0x0a14C17610C2d8559ba770CcC0798D080A62deD0) |
| **Native USDC Precompile** | `0x3600000000000000000000000000000000000000` |
| **Official EURC Contract** | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` |
| **Sample Settlement Tx** | [`0x85825890e09d182779e6a7d57c2bc4f0b3a9a5c66fcb8b0c1a58252fd69a0277`](https://explorer.arc.io/tx/0x85825890e09d182779e6a7d57c2bc4f0b3a9a5c66fcb8b0c1a58252fd69a0277) |
| **Production Application** | **[https://snooperbill.vercel.app](https://snooperbill.vercel.app)** |

---

## How It Works (Step-by-Step)

```text
           [ Enterprise Manifest (.xlsx / .csv) ]
                              │
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │ 1. Dual-Engine Ingestion & Address Guard             │
   │    • Hybrid Parser: AI Semantic Scanner + Regex      │
   │    • Intercepts & Rejects TRON, Solana, Bitcoin      │
   │    • Normalizes International Commas & Decimals      │
   └──────────────────────────┬───────────────────────────┘
                              │
                    (Any Corrupt Rows?)
                     ┌────────┴────────┐
                     ▼                 ▼
                   [YES]              [NO]
                     │                 │
                     ▼                 ▼
          [ Treasury Lock ]   [ Manifest Approved ]
          (Execute disabled   (Single-click batch)
           until fixed in UI)          │
                                       ▼
   ┌──────────────────────────────────────────────────────┐
   │ 2. Treasury Balance & FX Fallback                    │
   │    • Verifies Live EURC & USDC Reserves              │
   │    • If EURC Short: Auto-Queries Live Oracle Feed    │
   │    • Calculates USDC Liability & Annotates Memo      │
   └──────────────────────────┬───────────────────────────┘
                              │
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │ 3. Atomic On-Chain Settlement (Arc Mainnet 5042)     │
   │    • Single Transaction on Arc Osaka EVM             │
   │    • Gas Settled in Native USDC                      │
   │    • Sub-Second Deterministic Finality               │
   └──────────────────────────┬───────────────────────────┘
                              │
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │ 4. Two-Way Bookkeeping Reconciliation                │
   │    • Instant Official PDF Audit Statement            │
   │    • Export Enriched Excel Ledger with Tx Explorer   │
   └──────────────────────────────────────────────────────┘
```

### 1. Zero Web3 Jargon on Landing
The landing view intentionally conceals crypto complexities. To an accountant, it functions like standard enterprise desktop software (Excel / Google Sheets). There are no aggressive wallet popups until the manifest has passed all compliance checks.

### 2. Multi-Network Address Guard
Bookkeepers frequently copy addresses from mismatched vendor invoices. Snooper Bill immediately parses incoming files and flags invalid formats:
* **TRON addresses (`T...`)**: Automatically detected and blocked.
* **Solana base58 & Bitcoin addresses**: Flagged with explicit correction guidance.
* **EVM Checksum & Length Validation**: Rejects truncated or malformed `0x` hashes.

### 3. Automatic Treasury Protection Lock
If even a single row has an invalid address, zero amount, or formatting issue, the entire execution flow is locked. The clerk can fix typos directly inside the interactive spreadsheet table, triggering an instant re-audit.

### 4. Dynamic FX Fallback (USDC / EURC Dual-Token Rail)
When settling mixed payroll batches containing both USD and Euro liabilities:
* The dApp verifies the connected treasury's live EURC balance.
* If EURC is insufficient, the system queries verified market feeds (Binance API with fallback feeds), recalculates the exact liability into USDC, and tags the cryptographic memo (`bytes32`) with the exact conversion rate (e.g., `INV-2026-02 (EUR@1.085)`).
* The vendor receives payment without the treasury having to manually execute DEX swaps beforehand.

### 5. 10-Minute Idle Watchdog
Corporate accounting workstations are often left unattended. Snooper Bill runs a continuous background idle watchdog (`App.tsx`). If no mouse, keyboard, or touch interaction occurs for **10 continuous minutes (600,000 ms)**, the active wallet session is disconnected and cleared from memory.

### 6. Institutional PDF & Excel Reconciliation
Upon transaction completion, Snooper Bill generates:
* **Official PDF Audit Statement:** Built via `jsPDF`, detailing block number, execution timestamp, Arc native gas paid in USDC, conversion disclosures, and line-item payment records.
* **Updated Bookkeeping Ledger:** Ready for import into standard accounting software (QuickBooks, NetSuite, SAP).

---

## Quick Demo: Test Manifest File

To test the application immediately on [snooperbill.vercel.app](https://snooperbill.vercel.app), create a file named `payroll.csv` with the following content:

```csv
Counterparty,Amount,Currency,Wallet Address (Arc EVM),Invoice Ref (Arc Memo),Memo
"Alex Miller (Engineering)",1500,USDC,0x71C849A2dE518a27B75d9e5d4A93690Ef8913b82,INV-2026-01,"Core Protocol Retainer"
"Sophia Laurent (Design)",2200,EURC,0x3cD29B7F1269389278912d09E67268d06742512a,INV-2026-02,"Design Sprint & UI kit"
"Marcus Vance (Invalid Tron Test)",500,USDC,TLyqzVGLV1srkB7dToTAWDgWeLvv97Wz1U,INV-2026-03,"Will trigger Safety Lock"
```

*(Row 3 will trigger the Treasury Safety Lock due to a TRON address. You can edit it directly in the UI table to an EVM address or delete it to clear execution).*

---

## Why Arc Mainnet?

Snooper Bill is purpose-built for Arc and solves core pain points found on traditional chains:
* **Native USDC Gas Accounting:** Standard chains require holding volatile L1 assets (ETH, POL, AVAX) purely to pay gas fees. Accounting departments cannot easily hold speculative tokens on corporate balance sheets. Arc's native USDC gas eliminates this friction.
* **Deterministic Sub-Second Finality:** Probabilistic finality creates risks of double-spend or duplicate payroll execution. Arc ensures deterministic settlement in milliseconds.
* **Dual-Interface Stablecoin Interoperability:** Native USDC interoperability (`0x3600...`) enables clean atomic batch calls without wrapped token wrapping/unwrapping hurdles.

---

## Architecture & Tech Stack

* **Smart Contracts:** Solidity 0.8.20 (Custom non-reentrant assembly locks, atomic distribution loop).
* **Frontend Framework:** React 18, TypeScript, Vite.
* **Web3 Integration:** Wagmi v2, Viem v2, RainbowKit.
* **File Ingestion & Parsing:** SheetJS (`xlsx`), custom Regex sanitizers.
* **Audit Intelligence:** Hybrid AI parser (`Vireonix` completions endpoint) backed by a deterministic local rule-based compliance engine.
* **Document Generation:** `jspdf` and `jspdf-autotable`.
* **Styling:** TailwindCSS with custom tabular financial typography (`JetBrains Mono`).

---

## Smart Contract Audit Summary

Static analysis conducted using Slither:
* **High Severity:** `0`
* **Medium Severity:** `0`
* **Informational / Low:** Optimized non-reentrant storage slots via inline assembly; external batch loop confirmed atomic with state modifications recorded post-transfer. Full log available in [`audit_report_slither.md`](./audit/audit_report_slither.md).

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/<drkamilla>/snooper-bill.git
cd snooper-bill

# Install dependencies
npm install

# Start local dev server (port 3000)
npm run dev

# Build production bundle
npm run build
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
