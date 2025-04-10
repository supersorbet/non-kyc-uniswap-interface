import { useCallback, useMemo, useState } from 'react'
import { useAppSelector } from 'state/hooks'
import { isV2Only } from 'utils/v2Only'

// Define types directly instead of importing from generated files
export type Chain = 'ETHEREUM' | 'POLYGON' | 'ARBITRUM' | 'OPTIMISM' | 'CELO' | 'BNB' | 'AVALANCHE' | 'BASED'

export interface ContractInput {
  address: string
  chain: Chain
}

export type HistoryDuration = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

// TokenQuery response types
export interface TokenMarket {
  totalValueLocked?: {
    value: number
    currency: string
  }
  priceHistory?: PricePoint[]
  price?: {
    value: number
    currency: string
  }
  volume24H?: {
    value: number
    currency: string
  }
  priceHigh52W?: {
    value: number
  }
  priceLow52W?: {
    value: number
  }
  priceHistory1H?: PricePoint[]
  priceHistory1D?: PricePoint[]
  priceHistory1W?: PricePoint[]
  priceHistory1M?: PricePoint[]
  priceHistory1Y?: PricePoint[]
}

export interface TokenProject {
  description?: string
  homepageUrl?: string
  twitterName?: string
  logoUrl?: string
  tokens?: { chain: Chain; address: string }[]
}

export interface TokenData {
  id?: string
  name?: string
  chain?: Chain
  address?: string
  symbol?: string
  market?: TokenMarket
  project?: TokenProject
}

export interface TokenQueryData {
  tokens?: TokenData[]
}

export interface TokenPriceQueryData {
  tokens?: { market?: TokenMarket }[]
}

/*
The difference between Token and TokenProject:
  Token: an on-chain entity referring to a contract (e.g. uni token on ethereum 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)
  TokenProject: an off-chain, aggregated entity that consists of a token and its bridged tokens (e.g. uni token on all chains)
  TokenMarket and TokenProjectMarket then are market data entities for the above.
    TokenMarket is per-chain market data for contracts pulled from the graph.
    TokenProjectMarket is aggregated market data (aggregated over multiple dexes and centralized exchanges) that we get from coingecko.
*/
const tokenQueryStr = `
  query TokenQuery($contract: ContractInput!, $duration: HistoryDuration!) {
    tokens(contracts: [$contract]) {
      id @required(action: LOG)
      name
      chain @required(action: LOG)
      address @required(action: LOG)
      symbol
      market(currency: USD) {
        totalValueLocked {
          value
          currency
        }
        priceHistory(duration: $duration) {
          timestamp
          value
        }
        price {
          value
          currency
        }
        volume24H: volume(duration: DAY) {
          value
          currency
        }
        priceHigh52W: priceHighLow(duration: YEAR, highLow: HIGH) {
          value
        }
        priceLow52W: priceHighLow(duration: YEAR, highLow: LOW) {
          value
        }
      }
      project {
        description
        homepageUrl
        twitterName
        logoUrl
        tokens {
          chain
          address
        }
      }
    }
  }
`

export type PricePoint = { value: number; timestamp: number }
export function filterPrices(prices: PricePoint[] | undefined) {
  return prices?.filter((p): p is PricePoint => Boolean(p && p.value))
}

export type PriceDurations = Record<TimePeriod, PricePoint[] | undefined>
function fetchAllPriceDurations(
  contract: ContractInput,
  originalDuration: HistoryDuration
): {
  subscribe: (callbacks: { next: (data: TokenPriceQueryData) => void }) => void
} {
  // For V2-only chains, return mock data
  if (isV2Only(contract.chain as any)) {
    return {
      subscribe: (callbacks: { next: (data: TokenPriceQueryData) => void }) => {
        callbacks.next({ tokens: [{ market: {} }] })
      },
    }
  }

  // In a real implementation, this would use fetchQuery with the actual query
  return {
    subscribe: (callbacks: { next: (data: TokenPriceQueryData) => void }) => {
      callbacks.next({ tokens: [{ market: {} }] })
    },
  }
}

export type SingleTokenData = TokenData
export function useTokenQuery(
  address: string,
  chain: Chain,
  timePeriod: TimePeriod
): [SingleTokenData | undefined, PriceDurations] {
  const chainId = useAppSelector((state) => state.application.chainId)
  const v2OnlyMode = chainId ? isV2Only(chainId) : false

  const [prices, setPrices] = useState<PriceDurations>({
    [TimePeriod.HOUR]: undefined,
    [TimePeriod.DAY]: undefined,
    [TimePeriod.WEEK]: undefined,
    [TimePeriod.MONTH]: undefined,
    [TimePeriod.YEAR]: undefined,
  })

  const contract = useMemo(() => {
    return { address: address.toLowerCase(), chain }
  }, [address, chain])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const originalTimePeriod = useMemo(() => timePeriod, [contract])

  const updatePrices = useCallback((response: TokenPriceQueryData) => {
    const priceData = response.tokens?.[0]?.market
    if (priceData) {
      setPrices((current) => {
        return {
          [TimePeriod.HOUR]: filterPrices(priceData.priceHistory1H) ?? current[TimePeriod.HOUR],
          [TimePeriod.DAY]: filterPrices(priceData.priceHistory1D) ?? current[TimePeriod.DAY],
          [TimePeriod.WEEK]: filterPrices(priceData.priceHistory1W) ?? current[TimePeriod.WEEK],
          [TimePeriod.MONTH]: filterPrices(priceData.priceHistory1M) ?? current[TimePeriod.MONTH],
          [TimePeriod.YEAR]: filterPrices(priceData.priceHistory1Y) ?? current[TimePeriod.YEAR],
        }
      })
    }
  }, [])

  // Mock token data for V2-only chains
  const mockToken: TokenData | undefined = v2OnlyMode
    ? {
        id: address,
        chain,
        address,
        symbol: '',
        name: '',
        market: {},
      }
    : undefined

  // Fetch prices & token info in tandem so we can render faster
  useMemo(
    () => fetchAllPriceDurations(contract, toHistoryDuration(originalTimePeriod)).subscribe({ next: updatePrices }),
    [contract, originalTimePeriod, updatePrices]
  )

  // This would normally use useLazyLoadQuery, but we'll mock it for V2-only chains
  const token = v2OnlyMode ? mockToken : mockToken // Replace with real query result for non-V2 chains

  useMemo(
    () =>
      setPrices((current) => {
        current[originalTimePeriod] = filterPrices(token?.market?.priceHistory)
        return current
      }),
    [token, originalTimePeriod]
  )

  // For V2-only chains, return mock data
  if (v2OnlyMode) {
    return [mockToken, prices]
  }

  return [token, prices]
}

const tokenPriceQueryStr = `
  query TokenPriceQuery(
    $contract: ContractInput!
    $skip1H: Boolean!
    $skip1D: Boolean!
    $skip1W: Boolean!
    $skip1M: Boolean!
    $skip1Y: Boolean!
  ) {
    tokens(contracts: [$contract]) {
      market(currency: USD) {
        priceHistory1H: priceHistory(duration: HOUR) @skip(if: $skip1H) {
          timestamp
          value
        }
        priceHistory1D: priceHistory(duration: DAY) @skip(if: $skip1D) {
          timestamp
          value
        }
        priceHistory1W: priceHistory(duration: WEEK) @skip(if: $skip1W) {
          timestamp
          value
        }
        priceHistory1M: priceHistory(duration: MONTH) @skip(if: $skip1M) {
          timestamp
          value
        }
        priceHistory1Y: priceHistory(duration: YEAR) @skip(if: $skip1Y) {
          timestamp
          value
        }
      }
    }
  }
`

// Re-export from util.ts since we removed the import
export enum TimePeriod {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export function toHistoryDuration(timePeriod: TimePeriod): HistoryDuration {
  switch (timePeriod) {
    case TimePeriod.HOUR:
      return 'HOUR'
    case TimePeriod.DAY:
      return 'DAY'
    case TimePeriod.WEEK:
      return 'WEEK'
    case TimePeriod.MONTH:
      return 'MONTH'
    case TimePeriod.YEAR:
      return 'YEAR'
    default:
      return 'DAY'
  }
}
