import { skipToken } from '@reduxjs/toolkit/query/react'
import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { useStablecoinAmountFromFiatValue } from 'hooks/useStablecoinPrice'
import { useRoutingAPIArguments } from 'lib/hooks/routing/useRoutingAPIArguments'
import useIsValidBlock from 'lib/hooks/useIsValidBlock'
import ms from 'ms.macro'
import { useMemo } from 'react'
import { RouterPreference, useGetQuoteQuery } from 'state/routing/slice'
import { GetQuoteResult, InterfaceTrade, TradeState } from 'state/routing/types'
import { computeRoutes, transformRoutesToTrade } from 'state/routing/utils'

import useDebounce from './useDebounce'
import useIsWindowVisible from './useIsWindowVisible'

/**
 * Returns a V2-only trade by modifying the API query to only use V2 protocol
 * @param tradeType whether the swap is an exact in/out
 * @param amountSpecified the exact amount to swap in/out
 * @param otherCurrency the desired output/payment currency
 */
export function useV2OnlyTrade<TTradeType extends TradeType>(
  tradeType: TTradeType,
  amountSpecified: CurrencyAmount<Currency> | undefined,
  otherCurrency: Currency | undefined
): {
  state: TradeState
  trade: InterfaceTrade<Currency, Currency, TTradeType> | undefined
} {
  const isWindowVisible = useIsWindowVisible()

  const [debouncedAmount, debouncedOtherCurrency] = useDebounce(
    useMemo(() => [amountSpecified, otherCurrency], [amountSpecified, otherCurrency]),
    200
  )

  const { chainId } = useWeb3React()

  const [currencyIn, currencyOut]: [Currency | undefined, Currency | undefined] = useMemo(
    () =>
      tradeType === TradeType.EXACT_INPUT
        ? [debouncedAmount?.currency, debouncedOtherCurrency]
        : [debouncedOtherCurrency, debouncedAmount?.currency],
    [debouncedAmount, debouncedOtherCurrency, tradeType]
  )

  // Use standard query args but with a fixed RouterPreference
  const queryArgs = useRoutingAPIArguments({
    tokenIn: currencyIn,
    tokenOut: currencyOut,
    amount: debouncedAmount,
    tradeType,
    routerPreference: RouterPreference.API, // Use API but we'll modify the query to force V2
  })

  // Override protocols to use only V2
  const modifiedQueryArgs = useMemo(() => {
    if (!queryArgs) return undefined

    // Create a modified copy of the queryArgs with V2-only protocols
    const modifiedArgs = {
      ...queryArgs,
      protocols: 'v2', // Force V2-only protocol
    }

    return modifiedArgs
  }, [queryArgs])

  const { isLoading, isError, data, currentData } = useGetQuoteQuery(
    isWindowVisible && modifiedQueryArgs ? modifiedQueryArgs : skipToken,
    {
      pollingInterval: ms`15s`,
    }
  )

  const quoteResult: GetQuoteResult | undefined = useIsValidBlock(Number(data?.blockNumber) || 0) ? data : undefined

  const route = useMemo(
    () => computeRoutes(currencyIn, currencyOut, tradeType, quoteResult),
    [currencyIn, currencyOut, quoteResult, tradeType]
  )

  // get USD gas cost of trade in active chains stablecoin amount
  const gasUseEstimateUSD = useStablecoinAmountFromFiatValue(quoteResult?.gasUseEstimateUSD) ?? null

  const isSyncing = currentData !== data

  return useMemo(() => {
    if (!currencyIn || !currencyOut) {
      return {
        state: TradeState.INVALID,
        trade: undefined,
      }
    }

    if (isLoading && !quoteResult) {
      // only on first hook render
      return {
        state: TradeState.LOADING,
        trade: undefined,
      }
    }

    let otherAmount = undefined
    if (quoteResult) {
      if (tradeType === TradeType.EXACT_INPUT && currencyOut) {
        otherAmount = CurrencyAmount.fromRawAmount(currencyOut, quoteResult.quote)
      }

      if (tradeType === TradeType.EXACT_OUTPUT && currencyIn) {
        otherAmount = CurrencyAmount.fromRawAmount(currencyIn, quoteResult.quote)
      }
    }

    if (isError || !otherAmount || !route || route.length === 0 || !queryArgs) {
      return {
        state: TradeState.NO_ROUTE_FOUND,
        trade: undefined,
      }
    }

    try {
      const trade = transformRoutesToTrade(route, tradeType, quoteResult?.blockNumber, gasUseEstimateUSD)
      return {
        // always return VALID regardless of isFetching status
        state: isSyncing ? TradeState.SYNCING : TradeState.VALID,
        trade,
      }
    } catch (e) {
      return { state: TradeState.INVALID, trade: undefined }
    }
  }, [
    currencyIn,
    currencyOut,
    quoteResult,
    isLoading,
    tradeType,
    isError,
    route,
    queryArgs,
    gasUseEstimateUSD,
    isSyncing,
  ])
}
