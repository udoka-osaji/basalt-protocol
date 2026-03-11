;; Basalt Protocol - Lending Strategy Vault
;; A vault that deposits sBTC into a lending pool to earn interest.
;; Implements vault-trait, demonstrating how Basalt vaults can compose
;; with external DeFi protocols for automated yield strategies.

(impl-trait .vault-trait.vault-trait)

;; -- Constants ---------------------------------------------------------
(define-constant ERR-NOT-AUTHORIZED (err u4000))
(define-constant ERR-ZERO-AMOUNT (err u4001))
(define-constant ERR-INSUFFICIENT-BALANCE (err u4002))
(define-constant ERR-TRANSFER-FAILED (err u4003))
(define-constant ERR-ZERO-SHARES (err u4004))
(define-constant CONTRACT-OWNER tx-sender)

;; -- sBTC reference ----------------------------------------------------
(define-constant SBTC-TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; -- State --------------------------------------------------------------
(define-data-var total-shares uint u0)
(define-data-var total-assets uint u0)

(define-map share-balances principal uint)

;; -- Read-only: vault-trait implementation ------------------------------

(define-read-only (get-total-assets)
  (ok (var-get total-assets))
)

(define-read-only (get-total-shares)
  (ok (var-get total-shares))
)

(define-read-only (get-share-balance (who principal))
  (ok (default-to u0 (map-get? share-balances who)))
)

(define-read-only (convert-to-shares (assets uint))
  (let ((supply (var-get total-shares))
        (total (var-get total-assets)))
    (if (is-eq supply u0)
      (ok assets)
      (ok (/ (* assets supply) total))
    )
  )
)

(define-read-only (convert-to-assets (shares uint))
  (let ((supply (var-get total-shares))
        (total (var-get total-assets)))
    (if (is-eq supply u0)
      (ok shares)
      (ok (/ (* shares total) supply))
    )
  )
)

(define-read-only (preview-deposit (assets uint))
  (convert-to-shares assets)
)

(define-read-only (preview-withdraw (shares uint))
  (convert-to-assets shares)
)

;; -- Public: vault-trait implementation ---------------------------------

;; Deposit: take sBTC from user -> supply to lending pool -> mint vault shares
(define-public (deposit (assets uint))
  (let (
    (sender tx-sender)
    (shares-to-mint (unwrap-panic (convert-to-shares assets)))
  )
    (asserts! (> assets u0) ERR-ZERO-AMOUNT)
    (asserts! (> shares-to-mint u0) ERR-ZERO-SHARES)
    ;; 1. Transfer sBTC from user to this contract
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
      transfer assets sender current-contract none))
    ;; 2. Supply sBTC to the lending pool (as the contract)
    (try! (as-contract?
      ((with-ft 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token "sbtc-token" assets))
      (try! (contract-call? .mock-lending-pool supply assets))
    ))
    ;; 3. Mint vault shares to user
    (map-set share-balances sender
      (+ (default-to u0 (map-get? share-balances sender)) shares-to-mint))
    (var-set total-shares (+ (var-get total-shares) shares-to-mint))
    (var-set total-assets (+ (var-get total-assets) assets))
    (ok shares-to-mint)
  )
)

;; Withdraw: burn shares -> redeem from lending pool -> return sBTC to user
(define-public (withdraw (shares uint))
  (let (
    (sender tx-sender)
    (sender-balance (default-to u0 (map-get? share-balances sender)))
    (assets-to-return (unwrap-panic (convert-to-assets shares)))
  )
    (asserts! (> shares u0) ERR-ZERO-AMOUNT)
    (asserts! (>= sender-balance shares) ERR-INSUFFICIENT-BALANCE)
    ;; 1. Burn vault shares
    (map-set share-balances sender (- sender-balance shares))
    (var-set total-shares (- (var-get total-shares) shares))
    (var-set total-assets (- (var-get total-assets) assets-to-return))
    ;; 2. Redeem sBTC from lending pool (as the contract)
    (try! (as-contract?
      ()
      (try! (contract-call? .mock-lending-pool redeem assets-to-return))
    ))
    ;; 3. Transfer sBTC back to user
    (try! (as-contract?
      ((with-ft 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token "sbtc-token" assets-to-return))
      (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
        transfer assets-to-return tx-sender sender none))
    ))
    (ok assets-to-return)
  )
)

;; -- Admin: Sync yield from lending pool --------------------------------
;; Periodically called to update total-assets with accrued interest.
;; The lending pool tracks interest per depositor; this function
;; pulls the updated balance and adjusts the vault's asset tracking.

(define-public (sync-yield)
  (let (
    (pool-balance (unwrap-panic (contract-call? .mock-lending-pool
      get-withdrawable-amount current-contract)))
    (current-tracked (var-get total-assets))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> pool-balance current-tracked) ERR-ZERO-AMOUNT)
    ;; Update total-assets to reflect new interest
    (var-set total-assets pool-balance)
    (ok (- pool-balance current-tracked))
  )
)
