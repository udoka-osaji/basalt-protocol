;; Basalt Protocol - Reference Vault Implementation
;; A simple fee-accruing sBTC vault that implements the vault-trait.
;; Deposits sBTC, mints vault shares proportionally, and applies a
;; harvest fee that grows the asset-per-share ratio over time.

(impl-trait .vault-trait.vault-trait)

;; -- Constants ---------------------------------------------------------
(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ERR-ZERO-AMOUNT (err u1001))
(define-constant ERR-INSUFFICIENT-BALANCE (err u1002))
(define-constant ERR-TRANSFER-FAILED (err u1003))
(define-constant ERR-ZERO-SHARES (err u1004))
(define-constant ERR-ZERO-SUPPLY (err u1005))
(define-constant PRECISION u1000000) ;; 6 decimal precision for share math
(define-constant CONTRACT-OWNER tx-sender)

;; -- sBTC reference (Clarinet auto-remaps per network) -----------------
(define-constant SBTC-TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; -- Data vars ---------------------------------------------------------
(define-data-var total-shares uint u0)
(define-data-var total-assets uint u0)

;; -- Data maps ---------------------------------------------------------
(define-map share-balances principal uint)

;; -- Read-only: vault-trait implementation -----------------------------

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
      (ok assets) ;; 1:1 when vault is empty
      (ok (/ (* assets supply) total))
    )
  )
)

(define-read-only (convert-to-assets (shares uint))
  (let ((supply (var-get total-shares))
        (total (var-get total-assets)))
    (if (is-eq supply u0)
      (ok shares) ;; 1:1 when vault is empty
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

;; -- Public: vault-trait implementation --------------------------------

(define-public (deposit (assets uint))
  (let (
    (sender tx-sender)
    (shares-to-mint (unwrap-panic (convert-to-shares assets)))
  )
    (asserts! (> assets u0) ERR-ZERO-AMOUNT)
    (asserts! (> shares-to-mint u0) ERR-ZERO-SHARES)
    ;; Transfer sBTC from sender to vault
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
      transfer assets sender current-contract none))
    ;; Mint shares
    (map-set share-balances sender
      (+ (default-to u0 (map-get? share-balances sender)) shares-to-mint))
    (var-set total-shares (+ (var-get total-shares) shares-to-mint))
    (var-set total-assets (+ (var-get total-assets) assets))
    (ok shares-to-mint)
  )
)

(define-public (withdraw (shares uint))
  (let (
    (sender tx-sender)
    (sender-balance (default-to u0 (map-get? share-balances sender)))
    (assets-to-return (unwrap-panic (convert-to-assets shares)))
  )
    (asserts! (> shares u0) ERR-ZERO-AMOUNT)
    (asserts! (>= sender-balance shares) ERR-INSUFFICIENT-BALANCE)
    (asserts! (> assets-to-return u0) ERR-ZERO-AMOUNT)
    ;; Burn shares
    (map-set share-balances sender (- sender-balance shares))
    (var-set total-shares (- (var-get total-shares) shares))
    (var-set total-assets (- (var-get total-assets) assets-to-return))
    ;; Transfer sBTC from vault to sender
    (try! (as-contract?
      ((with-ft 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token "sbtc-token" assets-to-return))
      (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
        transfer assets-to-return tx-sender sender none))
    ))
    (ok assets-to-return)
  )
)

;; -- Admin: simulate yield accrual (for demo/testing) -----------------
;; In production, yield would come from an external strategy.
;; This function lets the owner inject assets to grow the share price.

(define-public (harvest-yield (additional-assets uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> additional-assets u0) ERR-ZERO-AMOUNT)
    ;; Transfer sBTC yield into vault
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
      transfer additional-assets tx-sender current-contract none))
    ;; Increase total assets (shares stay the same -> price per share increases)
    (var-set total-assets (+ (var-get total-assets) additional-assets))
    (ok additional-assets)
  )
)

