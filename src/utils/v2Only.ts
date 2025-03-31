/**
 * V2-Only Mode for chains without V3 deployments
 *
 * This utility file contains functions that help the interface operate in V2-only mode
 * on chains that don't have Uniswap V3 contracts deployed (like BASED chain).
 *
 * Key features:
 * 1. Forces all swaps and routing to use V2 pairs only
 * 2. Redirects all pool and liquidity operations to V2 UI
 * 3. Hides V3-specific features like concentrated liquidity
 *
 * To add a new chain to V2-only mode, simply add its chain ID to the V2_ONLY_CHAINS array.
 */
import { SupportedChainId } from '../constants/chains'

/**
 * Chains that should use V2-only routing and liquidity
 */
export const V2_ONLY_CHAINS = [SupportedChainId.BASED]

/**
 * Global flag to force V2-only on all chains (useful for testing)
 */
export const FORCE_V2_ONLY = false

/**
 * Returns true if the current chain should only use V2
 * @param chainId The current chain ID
 * @returns Whether to use V2-only mode
 */
export function isV2Only(chainId?: number): boolean {
  if (FORCE_V2_ONLY) return true
  if (!chainId) return false
  return V2_ONLY_CHAINS.includes(chainId)
}

/**
 * Returns the correct Add Liquidity path based on chain
 * @param chainId Current chain ID
 * @param currencyIdA First token
 * @param currencyIdB Optional second token
 * @returns The correct path to the Add Liquidity page
 */
export function getAddLiquidityPath(chainId?: number, currencyIdA?: string, currencyIdB?: string): string {
  if (isV2Only(chainId)) {
    // Use V2 add liquidity when on V2-only chains
    return currencyIdB ? `/add/v2/${currencyIdA}/${currencyIdB}` : `/add/v2/${currencyIdA}`
  }
  // Use default add liquidity for V3 supported chains
  return currencyIdB ? `/add/${currencyIdA}/${currencyIdB}` : `/add/${currencyIdA}`
}

/**
 * Returns the correct Pool path based on chain
 * @param chainId Current chain ID
 * @returns The correct path to the Pool page
 */
export function getPoolPath(chainId?: number): string {
  if (isV2Only(chainId)) {
    // Redirect to V2 pools when on V2-only chains
    return '/pool/v2'
  }
  // Use default pool path for V3 supported chains
  return '/pool'
}

/**
 * Returns the correct Remove Liquidity path based on chain
 * @param chainId Current chain ID
 * @param currencyIdA First token
 * @param currencyIdB Second token
 * @returns The correct path to the Remove Liquidity page
 */
export function getRemoveLiquidityPath(chainId?: number, currencyIdA?: string, currencyIdB?: string): string {
  if (isV2Only(chainId)) {
    // Use V2 remove liquidity when on V2-only chains
    return `/remove/v2/${currencyIdA}/${currencyIdB}`
  }
  // Use default remove liquidity for V3 supported chains
  return `/remove/${currencyIdA}/${currencyIdB}`
}
