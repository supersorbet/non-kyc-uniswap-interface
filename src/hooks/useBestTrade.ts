/* eslint-disable prettier/prettier */
import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { useMemo } from 'react'
import { RouterPreference } from 'state/routing/slice'
import { InterfaceTrade, TradeState } from 'state/routing/types'
import { useRoutingAPITrade } from 'state/routing/useRoutingAPITrade'
import { useClientSideRouter } from 'state/user/hooks'

import { isV2Only } from '../utils/v2Only'
import useAutoRouterSupported from './useAutoRouterSupported'
import { useClientSideV3Trade } from './useClientSideV3Trade'
import useDebounce from './useDebounce'
import useIsWindowVisible from './useIsWindowVisible'
import { useV2OnlyTrade } from './useV2OnlyTrade'

/**
 * Returns the best v2+v3 trade for a desired swap.
 * @param tradeType whether the swap is an exact in/out
 * @param amountSpecified the exact amount to swap in/out
 * @param otherCurrency the desired output/payment currency
 */
export function useBestTrade(
  tradeType: TradeType,
  amountSpecified?: CurrencyAmount<Currency>,
  otherCurrency?: Currency
): {
  state: TradeState
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
} {
  const { chainId } = useWeb3React()
  
  // Decide whether to use V2-only based on the current chain using the utility
  const useV2Only = useMemo(() => isV2Only(chainId), [chainId])
  
  // If V2-only is enabled, use the V2-only trade hook
  const v2OnlyTrade = useV2OnlyTrade(tradeType, amountSpecified, otherCurrency)
  
  // Original useBestTrade implementation
  const autoRouterSupported = useAutoRouterSupported()
  const isWindowVisible = useIsWindowVisible()

  const [debouncedAmount, debouncedOtherCurrency] = useDebounce(
    useMemo(() => [amountSpecified, otherCurrency], [amountSpecified, otherCurrency]),
    200
  )

  const [clientSideRouter] = useClientSideRouter()
  const routingAPITrade = useRoutingAPITrade(
    tradeType,
    autoRouterSupported && isWindowVisible ? debouncedAmount : undefined,
    debouncedOtherCurrency,
    clientSideRouter ? RouterPreference.CLIENT : RouterPreference.API
  )

  const isLoading = routingAPITrade.state === TradeState.LOADING
  const useFallback = !autoRouterSupported || routingAPITrade.state === TradeState.NO_ROUTE_FOUND

  // only use client side router if routing api trade failed or is not supported
  const bestV3Trade = useClientSideV3Trade(
    tradeType,
    useFallback ? debouncedAmount : undefined,
    useFallback ? debouncedOtherCurrency : undefined
  )

  // For normal trade usage - only return gas estimate from api if routing api trade is used
  const normalTrade = useMemo(
    () => ({
      ...(useFallback ? bestV3Trade : routingAPITrade),
      ...(isLoading ? { state: TradeState.LOADING } : {}),
    }),
    [bestV3Trade, isLoading, routingAPITrade, useFallback]
  )
  
  // Return the appropriate trade based on the V2-only decision
  return useV2Only ? v2OnlyTrade : normalTrade
}
