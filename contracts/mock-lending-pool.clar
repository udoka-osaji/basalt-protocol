;; Basalt Protocol - Mock Lending Pool
;; Simulates an external DeFi lending market that accepts sBTC deposits,
;; tracks per-user balances, and accrues interest over time.
;; Used to demonstrate how a Basalt vault integrates with an external protocol.

;; -- Constants ---------------------------------------------------------
(define-constant ERR-NOT-AUTHORIZED (err u3000))
(define-constant ERR-ZERO-AMOUNT (err u3001))
(define-constant ERR-INSUFFICIENT-BALANCE (err u3002))
(define-constant ERR-TRANSFER-FAILED (err u3003))
(define-constant CONTRACT-OWNER tx-sender)

;; -- sBTC reference ----------------------------------------------------
(define-constant SBTC-TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; -- State --------------------------------------------------------------
(define-data-var total-deposits uint u0)
(define-data-var total-interest-accrued uint u0)

;; Tracks each depositor's principal deposit and accrued interest
(define-map depositor-balances principal { principal-amount: uint, interest-earned: uint })

;; -- Read-only -----------------------------------------------------------

(define-read-only (get-total-deposits)
  (ok (var-get total-deposits))
)

(define-read-only (get-total-interest-accrued)
  (ok (var-get total-interest-accrued))
)

(define-read-only (get-depositor-balance (who principal))
  (ok (default-to { principal-amount: u0, interest-earned: u0 }
    (map-get? depositor-balances who)))
)

(define-read-only (get-withdrawable-amount (who principal))
  (let ((balance (default-to { principal-amount: u0, interest-earned: u0 }
          (map-get? depositor-balances who))))
    (ok (+ (get principal-amount balance) (get interest-earned balance)))
  )
)

;; -- Public: Lending pool operations ------------------------------------

;; Supply sBTC to the lending pool
(define-public (supply (amount uint))
  (let (
    (sender tx-sender)
    (current-balance (default-to { principal-amount: u0, interest-earned: u0 }
      (map-get? depositor-balances sender)))
  )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    ;; Transfer sBTC from supplier to this pool
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
      transfer amount sender current-contract none))
    ;; Update depositor balance
    (map-set depositor-balances sender
      (merge current-balance
        { principal-amount: (+ (get principal-amount current-balance) amount) }))
    ;; Update total deposits
    (var-set total-deposits (+ (var-get total-deposits) amount))
    (ok amount)
  )
)

;; Withdraw sBTC (principal + interest) from the lending pool
(define-public (redeem (amount uint))
  (let (
    (sender tx-sender)
    (current-balance (default-to { principal-amount: u0, interest-earned: u0 }
      (map-get? depositor-balances sender)))
    (total-available (+ (get principal-amount current-balance)
                        (get interest-earned current-balance)))
  )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= total-available amount) ERR-INSUFFICIENT-BALANCE)
    ;; Calculate how much interest vs principal to deduct
    (let (
      (interest-portion (if (>= (get interest-earned current-balance) amount)
        amount
        (get interest-earned current-balance)))
      (principal-portion (- amount interest-portion))
    )
      ;; Update balances
      (map-set depositor-balances sender
        { principal-amount: (- (get principal-amount current-balance) principal-portion),
          interest-earned: (- (get interest-earned current-balance) interest-portion) })
      ;; Update totals
      (var-set total-deposits (- (var-get total-deposits) principal-portion))
      (var-set total-interest-accrued (- (var-get total-interest-accrued) interest-portion))
      ;; Transfer sBTC back to redeemer
      (try! (as-contract?
        ((with-ft 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token "sbtc-token" amount))
        (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
          transfer amount tx-sender sender none))
      ))
      (ok amount)
    )
  )
)

;; -- Admin: Simulate interest accrual -----------------------------------
;; In a real lending market, interest accrues from borrowers.
;; This function lets the owner distribute interest to a depositor.

(define-public (accrue-interest (depositor principal) (interest-amount uint))
  (let (
    (current-balance (default-to { principal-amount: u0, interest-earned: u0 }
      (map-get? depositor-balances depositor)))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> interest-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (> (get principal-amount current-balance) u0) ERR-INSUFFICIENT-BALANCE)
    ;; Transfer sBTC interest into the pool (from owner/protocol)
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
      transfer interest-amount tx-sender current-contract none))
    ;; Credit interest to the depositor
    (map-set depositor-balances depositor
      (merge current-balance
        { interest-earned: (+ (get interest-earned current-balance) interest-amount) }))
    (var-set total-interest-accrued (+ (var-get total-interest-accrued) interest-amount))
    (ok interest-amount)
  )
)
