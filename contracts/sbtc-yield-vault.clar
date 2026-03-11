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

;; -- Public: vault-trait implementation ---------------------------------

;; Deposit: take sBTC from user -> deposit into basalt-vault -> mint meta-shares
(define-public (deposit (assets uint))
  (let (
    (sender tx-sender)
    (meta-shares (unwrap-panic (convert-to-shares assets)))
  )
    (asserts! (> assets u0) ERR-ZERO-AMOUNT)
    (asserts! (> meta-shares u0) ERR-ZERO-SHARES)
    ;; 1. Transfer sBTC from user to this contract
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
      transfer assets sender current-contract none))
    ;; 2. This contract deposits into basalt-vault
    (try! (as-contract?
      ((with-ft 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token "sbtc-token" assets))
      (try! (contract-call? .basalt-vault deposit assets))
    ))
    ;; 3. Mint meta-vault shares to user
    (map-set share-balances sender
      (+ (default-to u0 (map-get? share-balances sender)) meta-shares))
    (var-set total-shares (+ (var-get total-shares) meta-shares))
    (var-set total-assets (+ (var-get total-assets) assets))
    (ok meta-shares)
  )
)

;; Withdraw: burn meta-shares -> withdraw from basalt-vault -> return sBTC to user
(define-public (withdraw (shares uint))
  (let (
    (sender tx-sender)
    (sender-balance (default-to u0 (map-get? share-balances sender)))
    (assets-to-return (unwrap-panic (convert-to-assets shares)))
  )
    (asserts! (> shares u0) ERR-ZERO-AMOUNT)
    (asserts! (>= sender-balance shares) ERR-INSUFFICIENT-BALANCE)
    ;; 1. Burn meta-shares
    (map-set share-balances sender (- sender-balance shares))
    (var-set total-shares (- (var-get total-shares) shares))
    (var-set total-assets (- (var-get total-assets) assets-to-return))
    ;; 2. Withdraw from basalt-vault (contract is the depositor)
    (let ((underlying-shares (unwrap-panic (contract-call? .basalt-vault convert-to-shares assets-to-return))))
      (try! (as-contract?
        ()
        (try! (contract-call? .basalt-vault withdraw underlying-shares))
      ))
    )
    ;; 3. Transfer sBTC back to user
    (try! (as-contract?
      ((with-ft 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token "sbtc-token" assets-to-return))
      (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
        transfer assets-to-return tx-sender sender none))
    ))
    (ok assets-to-return)
  )
)

