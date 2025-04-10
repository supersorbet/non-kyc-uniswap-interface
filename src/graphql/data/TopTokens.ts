import {
  favoritesAtom,
  filterStringAtom,
  filterTimeAtom,
  showFavoritesAtom,
  sortAscendingAtom,
  sortMethodAtom,
} from 'components/Tokens/state'
import { useAtomValue } from 'jotai/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppSelector } from 'state/hooks'
import { isV2Only } from 'utils/v2Only'

import { Chain, HistoryDuration } from './Token'
import { toHistoryDuration } from './util'

// Define the token types directly
export interface TokenMarket {
  totalValueLocked?: {
    value: number
    currency: string
  }
  price?: {
    value: number
    currency: string
  }
  pricePercentChange?: {
    value: number
    currency: string
  }
  volume?: {
    value: number
    currency: string
  }
  priceHistory?: Array<{
    timestamp: number
    value: number
  }>
}

export interface TokenProject {
  logoUrl?: string
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

export interface ContractInput {
  address: string
  chain: Chain
}

export interface TopTokensResponse {
  topTokens?: TokenData[]
}

export interface TokensResponse {
  tokens?: TokenData[]
}

// Define the queries as strings
const topTokens100QueryStr = `
  query TopTokens100Query($duration: HistoryDuration!, $chain: Chain!) {
    topTokens(pageSize: 100, page: 1, chain: $chain) {
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
        price {
          value
          currency
        }
        pricePercentChange(duration: $duration) {
          currency
          value
        }
        volume(duration: $duration) {
          value
          currency
        }
      }
    }
  }
`

export enum TokenSortMethod {
  PRICE = 'Price',
  PERCENT_CHANGE = 'Change',
  TOTAL_VALUE_LOCKED = 'TVL',
  VOLUME = 'Volume',
}

export type PrefetchedTopToken = TokenData

function useSortedTokens(tokens: TokenData[] | undefined) {
  const sortMethod = useAtomValue(sortMethodAtom)
  const sortAscending = useAtomValue(sortAscendingAtom)

  return useMemo(() => {
    if (!tokens) return []

    let tokenArray = Array.from(tokens)
    switch (sortMethod) {
      case TokenSortMethod.PRICE:
        tokenArray = tokenArray.sort((a, b) => (b?.market?.price?.value ?? 0) - (a?.market?.price?.value ?? 0))
        break
      case TokenSortMethod.PERCENT_CHANGE:
        tokenArray = tokenArray.sort(
          (a, b) => (b?.market?.pricePercentChange?.value ?? 0) - (a?.market?.pricePercentChange?.value ?? 0)
        )
        break
      case TokenSortMethod.TOTAL_VALUE_LOCKED:
        tokenArray = tokenArray.sort(
          (a, b) => (b?.market?.totalValueLocked?.value ?? 0) - (a?.market?.totalValueLocked?.value ?? 0)
        )
        break
      case TokenSortMethod.VOLUME:
        tokenArray = tokenArray.sort((a, b) => (b?.market?.volume?.value ?? 0) - (a?.market?.volume?.value ?? 0))
        break
    }

    return sortAscending ? tokenArray.reverse() : tokenArray
  }, [tokens, sortMethod, sortAscending])
}

function useFilteredTokens(tokens: PrefetchedTopToken[]) {
  const filterString = useAtomValue(filterStringAtom)
  const favorites = useAtomValue(favoritesAtom)
  const showFavorites = useAtomValue(showFavoritesAtom)

  const lowercaseFilterString = useMemo(() => filterString.toLowerCase(), [filterString])

  return useMemo(() => {
    if (!tokens) {
      return []
    }

    let returnTokens = tokens
    if (showFavorites) {
      returnTokens = returnTokens?.filter((token) => token?.address && favorites.includes(token.address))
    }
    if (lowercaseFilterString) {
      returnTokens = returnTokens?.filter((token) => {
        const addressIncludesFilterString = token?.address?.toLowerCase().includes(lowercaseFilterString)
        const nameIncludesFilterString = token?.name?.toLowerCase().includes(lowercaseFilterString)
        const symbolIncludesFilterString = token?.symbol?.toLowerCase().includes(lowercaseFilterString)
        return nameIncludesFilterString || symbolIncludesFilterString || addressIncludesFilterString
      })
    }
    return returnTokens
  }, [tokens, showFavorites, lowercaseFilterString, favorites])
}

// Number of items to render in each fetch in infinite scroll.
export const PAGE_SIZE = 20

function toContractInput(token: PrefetchedTopToken) {
  return {
    address: token?.address ?? '',
    chain: token?.chain ?? 'ETHEREUM',
  }
}

// Map of key: ${HistoryDuration} and value: another Map, of key:${chain} + ${address} and value: TopToken object.
// Acts as a local cache.

let tokensWithPriceHistoryCache: Record<string, Record<string, TopToken>> = {
  DAY: {},
  HOUR: {},
  MAX: {},
  MONTH: {},
  WEEK: {},
  YEAR: {},
  FIVE_MINUTE: {},
}
let cachedChain: Chain | undefined
const resetTokensWithPriceHistoryCache = () => {
  tokensWithPriceHistoryCache = {
    DAY: {},
    HOUR: {},
    MAX: {},
    MONTH: {},
    WEEK: {},
    YEAR: {},
    FIVE_MINUTE: {},
  }
}

const checkIfAllTokensCached = (duration: HistoryDuration, tokens: PrefetchedTopToken[]) => {
  let everyTokenInCache = true
  const cachedTokens: TopToken[] = []

  const checkCache = (token: PrefetchedTopToken) => {
    const tokenCacheKey = !!token ? `${token.chain}${token.address}` : ''
    if (tokenCacheKey in tokensWithPriceHistoryCache[duration]) {
      cachedTokens.push(tokensWithPriceHistoryCache[duration][tokenCacheKey])
      return true
    } else {
      everyTokenInCache = false
      cachedTokens.length = 0
      return false
    }
  }
  tokens.every((token) => checkCache(token))
  return { everyTokenInCache, cachedTokens }
}

export type TopToken = TokenData
interface UseTopTokensReturnValue {
  error: Error | undefined
  loading: boolean
  tokens: TopToken[] | undefined
  hasMore: boolean
  loadMoreTokens: () => void
  loadingRowCount: number
}
export function useTopTokens(chain: Chain): UseTopTokensReturnValue {
  const chainId = useAppSelector((state) => state.application.chainId)
  const v2OnlyMode = chainId ? isV2Only(chainId) : false

  const duration = toHistoryDuration(useAtomValue(filterTimeAtom))
  const [loadingTokensWithoutPriceHistory, setLoadingTokensWithoutPriceHistory] = useState(true)
  const [loadingTokensWithPriceHistory, setLoadingTokensWithPriceHistory] = useState(true)
  const [tokens, setTokens] = useState<TopToken[]>()
  const [prefetchedData, setPrefetchedData] = useState<PrefetchedTopToken[]>()
  if (chain !== cachedChain) {
    cachedChain = chain
    resetTokensWithPriceHistoryCache()
  }
  const [page, setPage] = useState(0)
  const [error, setError] = useState<Error | undefined>()
  const [prefetchedDataDuration, setPrefetchedDataDuration] = useState<HistoryDuration>()
  const prefetchedSelectedTokensWithoutPriceHistory = useFilteredTokens(useSortedTokens(prefetchedData))
  const { everyTokenInCache, cachedTokens } = useMemo(
    () => checkIfAllTokensCached(duration, prefetchedSelectedTokensWithoutPriceHistory),
    [duration, prefetchedSelectedTokensWithoutPriceHistory]
  )
  // loadingRowCount defaults to PAGE_SIZE when no prefetchedData is available yet because the initial load
  // count will always be PAGE_SIZE.
  const loadingRowCount = useMemo(
    () => (prefetchedData ? Math.min(prefetchedSelectedTokensWithoutPriceHistory.length, PAGE_SIZE) : PAGE_SIZE),
    [prefetchedSelectedTokensWithoutPriceHistory, prefetchedData]
  )

  const hasMore = !tokens || tokens.length < prefetchedSelectedTokensWithoutPriceHistory.length

  const loadTokensWithoutPriceHistory = useCallback(
    ({ duration, chain }: { duration: HistoryDuration; chain: Chain }) => {
      setTokens([])

      // For V2-only chains, return mock data
      if (v2OnlyMode) {
        setPrefetchedData([])
        setLoadingTokensWithoutPriceHistory(false)
        setPrefetchedDataDuration(duration)
        setLoadingTokensWithPriceHistory(false)
        return
      }

      // This would normally fetch data from a GraphQL endpoint
      // For now, just return empty data
      const data: TopTokensResponse = { topTokens: [] }
      if (data?.topTokens) setPrefetchedData([...data?.topTokens])
      setLoadingTokensWithoutPriceHistory(false)
      setPrefetchedDataDuration(duration)
      setLoadingTokensWithPriceHistory(false)
    },
    [v2OnlyMode]
  )

  const loadTokensWithPriceHistory = useCallback(
    ({
      contracts,
      appendingTokens,
      page,
      tokens,
    }: {
      contracts: ContractInput[]
      appendingTokens: boolean
      page: number
      tokens?: TopToken[]
    }) => {
      // For V2-only chains, return mock data
      if (v2OnlyMode) {
        if (appendingTokens) {
          setTokens([...(tokens ?? [])])
        } else {
          setTokens([])
        }
        setLoadingTokensWithPriceHistory(false)
        setPage(page + 1)
        return
      }

      // This would normally fetch data from a GraphQL endpoint
      // For now, just return empty data
      const data: TokensResponse = { tokens: [] }
      if (data?.tokens) {
        const priceHistoryCacheForCurrentDuration = tokensWithPriceHistoryCache[duration]
        data.tokens.forEach((token) => {
          if (token && token.chain && token.address) {
            priceHistoryCacheForCurrentDuration[`${token.chain}${token.address}`] = token
          }
        })

        appendingTokens ? setTokens([...(tokens ?? []), ...(data.tokens ?? [])]) : setTokens([...(data.tokens ?? [])])
        setLoadingTokensWithPriceHistory(false)
        setPage(page + 1)
      }
      setLoadingTokensWithPriceHistory(false)
    },
    [duration, v2OnlyMode]
  )

  const loadMoreTokens = useCallback(() => {
    setLoadingTokensWithPriceHistory(true)
    const contracts = prefetchedSelectedTokensWithoutPriceHistory
      .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      .map(toContractInput)
    loadTokensWithPriceHistory({ contracts, appendingTokens: true, page, tokens })
  }, [prefetchedSelectedTokensWithoutPriceHistory, page, loadTokensWithPriceHistory, tokens])

  // Load tokens from cache when everything is available.
  useEffect(() => {
    if (everyTokenInCache) {
      setTokens(cachedTokens)
      setLoadingTokensWithPriceHistory(false)
    }
  }, [everyTokenInCache, cachedTokens])

  // Load new token with price history data when prefetchedSelectedTokensWithoutPriceHistory for current
  // duration has already been resolved.
  useEffect(() => {
    if (!everyTokenInCache) {
      setLoadingTokensWithPriceHistory(true)
      setTokens([])
      if (duration === prefetchedDataDuration) {
        const contracts = prefetchedSelectedTokensWithoutPriceHistory.slice(0, PAGE_SIZE).map(toContractInput)
        loadTokensWithPriceHistory({ contracts, appendingTokens: false, page: 0 })
      }
    }
  }, [
    everyTokenInCache,
    prefetchedSelectedTokensWithoutPriceHistory,
    loadTokensWithPriceHistory,
    duration,
    prefetchedDataDuration,
  ])

  // Trigger fetching top 100 tokens without price history on first load, and on
  // each change of chain or duration.
  useEffect(() => {
    setLoadingTokensWithoutPriceHistory(true)
    loadTokensWithoutPriceHistory({ duration, chain })
  }, [chain, duration, loadTokensWithoutPriceHistory])

  return {
    error,
    loading: loadingTokensWithPriceHistory || loadingTokensWithoutPriceHistory,
    tokens,
    hasMore,
    loadMoreTokens,
    loadingRowCount,
  }
}

// Define the query as a string
export const tokensQueryStr = `
  query TopTokens_TokensQuery($contracts: [ContractInput!]!, $duration: HistoryDuration!) {
    tokens(contracts: $contracts) {
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
        volume(duration: $duration) {
          value
          currency
        }
        pricePercentChange(duration: $duration) {
          currency
          value
        }
      }
      project {
        logoUrl
      }
    }
  }
`
