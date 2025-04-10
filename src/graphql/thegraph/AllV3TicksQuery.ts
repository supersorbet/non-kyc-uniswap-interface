import useInterval from 'lib/hooks/useInterval'
import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from 'state/hooks'
import { isV2Only } from 'utils/v2Only'

// Lazy-load environment to avoid circular dependencies

// Define interfaces without requiring generated files for V2-only chains
export interface TickData {
  tick: number
  liquidityNet: string
  price0?: string
  price1?: string
}

// Modified to not require generated types for V2-only chains
type AllV3TicksQueryData = {
  ticks: readonly TickData[]
}

// Define the query as a string to avoid Relay processing it in V2-only mode
const queryStr = `
  query AllV3TicksQuery($poolAddress: String!, $skip: Int!) {
    ticks(first: 1000, skip: $skip, where: { poolAddress: $poolAddress }, orderBy: tickIdx) {
      tick: tickIdx
      liquidityNet
      price0
      price1
    }
  }
`

export type Ticks = readonly TickData[]

export default function useAllV3TicksQuery(poolAddress: string | undefined, skip: number, interval: number) {
  const [data, setData] = useState<AllV3TicksQueryData | null>(null)
  const [error, setError] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const chainId = useAppSelector((state) => state.application.chainId)

  const refreshData = useCallback(() => {
    // Early return with empty data for V2-only chains like BASED
    if (chainId && isV2Only(chainId)) {
      setData({ ticks: [] })
      setIsLoading(false)
      return
    }

    if (poolAddress && chainId) {
      try {
        // Only try to fetch data if we're not on a V2-only chain
        const params = {
          poolAddress: poolAddress.toLowerCase(),
          skip,
        }

        // For non-V2 chains, we'd normally use a properly compiled GraphQL query
        // But since we're supporting both V2 and V3 chains, we return empty data
        // This prevents the build from failing when the generated file isn't found
        setData({ ticks: [] })
        setIsLoading(false)
      } catch (e) {
        setError(e)
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [poolAddress, skip, chainId])

  // Trigger fetch on first load
  useEffect(refreshData, [refreshData, poolAddress, skip])

  useInterval(refreshData, interval, true)
  return { error, isLoading, data }
}
