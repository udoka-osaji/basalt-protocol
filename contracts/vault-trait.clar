;; Basalt Protocol - Vault Trait
;; A composable, ERC-4626-inspired vault standard for the Stacks ecosystem.
;; Any protocol can implement this trait to offer interoperable yield-bearing positions.

(define-trait vault-trait
  (
    ;; Returns total underlying assets held by the vault
    (get-total-assets () (response uint uint))

    ;; Returns total vault shares in circulation
    (get-total-shares () (response uint uint))

    ;; Returns the share balance of a given holder
    (get-share-balance (principal) (response uint uint))

    ;; Converts an asset amount to the equivalent shares
    (convert-to-shares (uint) (response uint uint))

    ;; Converts a share amount to the equivalent assets
    (convert-to-assets (uint) (response uint uint))

    ;; Preview how many shares a deposit of `assets` would mint
    (preview-deposit (uint) (response uint uint))

    ;; Preview how many assets a withdrawal of `shares` would return
    (preview-withdraw (uint) (response uint uint))

    ;; Deposit underlying assets and mint vault shares to the caller
    (deposit (uint) (response uint uint))

    ;; Burn vault shares and return underlying assets to the caller
    (withdraw (uint) (response uint uint))
  )
)

