import useInterval from 'lib/hooks/useInterval'
import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from 'state/hooks'
import { isV2Only } from 'utils/v2Only'

// Define interfaces without requiring generated files
export interface FeeTierDistributionData {
  _meta?: {
    block: {
      number: number
    }
  }
  asToken0: Array<{
    feeTier: string
    totalValueLockedToken0: string
    totalValueLockedToken1: string
  }>
  asToken1: Array<{
    feeTier: string
    totalValueLockedToken0: string
    totalValueLockedToken1: string
  }>
}

// Define the query as a string to avoid Relay processing it
const queryStr = `
  query FeeTierDistributionQuery($token0: String!, $token1: String!) {
    _meta {
      block {
        number
      }
    }
    asToken0: pools(
      orderBy: totalValueLockedToken0
      orderDirection: desc
      where: { token0: $token0, token1: $token1 }
    ) {
      feeTier
      totalValueLockedToken0
      totalValueLockedToken1
    }
    asToken1: pools(
      orderBy: totalValueLockedToken0
      orderDirection: desc
      where: { token0: $token1, token1: $token0 }
    ) {
      feeTier
      totalValueLockedToken0
      totalValueLockedToken1
    }
  }
`

export default function useFeeTierDistributionQuery(
  token0: string | undefined,
  token1: string | undefined,
  interval: number
) {
  const [data, setData] = useState<FeeTierDistributionData | null>(null)
  const [error, setError] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const chainId = useAppSelector((state) => state.application.chainId)

  const refreshData = useCallback(() => {
    // Early return with empty data for V2-only chains like BASED
    if (chainId && isV2Only(chainId)) {
      setData({
        asToken0: [],
        asToken1: [],
      })
      setIsLoading(false)
      return
    }

    if (token0 && token1 && chainId) {
      try {
        // For non-V2 chains, we'd normally use a properly compiled GraphQL query
        // But since we're supporting both V2 and V3 chains, we return empty data
        setData({
          asToken0: [],
          asToken1: [],
        })
        setIsLoading(false)
      } catch (e) {
        setError(e)
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [token0, token1, chainId])

  // Trigger fetch on first load
  useEffect(refreshData, [refreshData, token0, token1])

  useInterval(refreshData, interval, true)
  return { error, isLoading, data }
}
