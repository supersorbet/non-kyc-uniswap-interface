import { useWeb3React } from '@web3-react/core'
import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { WRAPPED_NATIVE_CURRENCY } from '../../constants/tokens'
import { isV2Only } from '../../utils/v2Only'
import AddLiquidity from './index'

export function RedirectDuplicateTokenIds() {
  const { currencyIdA, currencyIdB } = useParams<{ currencyIdA: string; currencyIdB: string; feeAmount?: string }>()

  const { chainId } = useWeb3React()

  // Check if we should use V2-only on this chain
  const useV2 = isV2Only(chainId)

  // prevent weth + eth
  const isETHOrWETHA =
    currencyIdA === 'ETH' || (chainId !== undefined && currencyIdA === WRAPPED_NATIVE_CURRENCY[chainId]?.address)
  const isETHOrWETHB =
    currencyIdB === 'ETH' || (chainId !== undefined && currencyIdB === WRAPPED_NATIVE_CURRENCY[chainId]?.address)

  if (
    currencyIdA &&
    currencyIdB &&
    (currencyIdA.toLowerCase() === currencyIdB.toLowerCase() || (isETHOrWETHA && isETHOrWETHB))
  ) {
    // If using V2-only, redirect to V2 add page
    if (useV2) {
      return <Navigate to={`/add/v2/${currencyIdA}`} replace />
    }
    return <Navigate to={`/add/${currencyIdA}`} replace />
  }
  return <AddLiquidity />
}
