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