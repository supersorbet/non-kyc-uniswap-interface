import React from "react";
import { useWeb3React } from '@web3-react/core'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { isV2Only } from '../../utils/v2Only'

/**
 * Redirects to V2 pool page if on a V2-only chain like BASED
 */
export default function V2Redirect() {
  const { chainId } = useWeb3React()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (isV2Only(chainId) && location.pathname === '/pool') {
      navigate('/pool/v2')
    }
  }, [chainId, location.pathname, navigate])

  // Return null to avoid rendering anything while the redirect occurs
  return null
}
