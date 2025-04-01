import { INIT_CODE_HASH as DEFAULT_INIT_CODE_HASH } from '@uniswap/v2-sdk'

import { SupportedChainId } from './chains'

/**
 * The default factory init code hash from the Uniswap v2 SDK.
 * Used for chains where we don't need to override.
 */
export const DEFAULT_V2_FACTORY_INIT_CODE_HASH = DEFAULT_INIT_CODE_HASH

/**
 * Custom init code hashes for specific chains where the init code differs from the default.
 */
export const INIT_CODE_HASH_OVERRIDES: { [chainId: number]: string } = {
  // Replace this with your BASED chain init code hash if it's different
  [SupportedChainId.BASED]: '0x3f174884ed155d8fe4a233001d03644e66dc3ddf073ca9db039907229957efbf',
}

/**
 * Get the init code hash for a specific chain, falling back to the default if no override exists.
 */
export function getInitCodeHashForChain(chainId: number): string {
  return INIT_CODE_HASH_OVERRIDES[chainId] || DEFAULT_V2_FACTORY_INIT_CODE_HASH
}
