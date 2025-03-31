import { getCreate2Address } from '@ethersproject/address'
import { keccak256, pack } from '@ethersproject/solidity'
import { Token } from '@uniswap/sdk-core'

import { getInitCodeHashForChain } from '../constants/v2'

/**
 * Computes a pair address using chain-specific init code hashes
 */
export function computePairAddressWithChainSpecificInitHash({
  factoryAddress,
  tokenA,
  tokenB,
}: {
  factoryAddress: string
  tokenA: Token
  tokenB: Token
}): string {
  const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks

  // Use the chain-specific init code hash
  const initCodeHash = getInitCodeHashForChain(tokenA.chainId)

  return getCreate2Address(
    factoryAddress,
    keccak256(['bytes'], [pack(['address', 'address'], [token0.address, token1.address])]),
    initCodeHash
  )
}
