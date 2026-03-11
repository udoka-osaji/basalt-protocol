;; Basalt Protocol - sBTC Yield Vault
;; A composable meta-vault that deposits into basalt-vault and issues
;; its own shares, demonstrating vault-on-vault composability.
;; This pattern lets protocols build layered yield strategies.

(impl-trait .vault-trait.vault-trait)

;; -- Constants ---------------------------------------------------------
(define-constant ERR-NOT-AUTHORIZED (err u2000))
(define-constant ERR-ZERO-AMOUNT (err u2001))
(define-constant ERR-INSUFFICIENT-BALANCE (err u2002))
(define-constant ERR-TRANSFER-FAILED (err u2003))
(define-constant ERR-ZERO-SHARES (err u2004))
(define-constant CONTRACT-OWNER tx-sender)

;; -- sBTC reference ----------------------------------------------------
(define-constant SBTC-TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; -- State --------------------------------------------------------------
(define-data-var total-shares uint u0)
(define-data-var total-assets uint u0) ;; tracks our claim on underlying basalt-vault shares

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