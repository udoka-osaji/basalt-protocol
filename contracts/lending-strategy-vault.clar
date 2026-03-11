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