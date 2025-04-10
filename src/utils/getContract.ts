import { Contract } from '@ethersproject/contracts'
import { JsonRpcProvider } from '@ethersproject/providers'
import { abi as IUniswapV2Router02ABI } from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { SupportedChainId } from 'constants/chains'
import { V2_ROUTER_ADDRESS } from 'constants/addresses'
import { getContract } from 'utils/index'
import PepeDexRouter02ABI from '../abis/PepeDexRouter02.json'

// Helper function to get the router contract based on chain ID
export function getRouterContract(chainId: number, provider: JsonRpcProvider, account?: string): Contract {
  // Get the router address for the given chain
  const routerAddress = V2_ROUTER_ADDRESS[chainId]
  if (!routerAddress) {
    throw new Error(`No V2 router address for chainId: ${chainId}`)
  }
  
  // Use PepeDex ABI for BASED chain
  const abi = chainId === SupportedChainId.BASED ? PepeDexRouter02ABI.abi : IUniswapV2Router02ABI
  
  // Create and return the contract instance
  return getContract(routerAddress, abi, provider, account)
} 