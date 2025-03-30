import { RedesignVariant, useRedesignFlag } from 'featureFlags/flags/redesign'
import React from 'react'
import styled from 'styled-components/macro'
import { Z_INDEX } from 'theme/zIndex'

export const BodyWrapper = styled.main<{ margin?: string; maxWidth?: string; redesignFlag?: boolean }>`
  position: relative;
  margin-top: ${({ margin }) => margin ?? '0px'};
  max-width: ${({ maxWidth, redesignFlag }) => maxWidth ?? (redesignFlag ? '420px' : '480px')};
  width: 100%;
  background: #000000;
  border-radius: ${({ redesignFlag }) => (redesignFlag ? '16px' : '24px')};
  border: 1px solid #00ffff30;
  margin-top: 1rem;
  margin-left: auto;
  margin-right: auto;
  z-index: ${Z_INDEX.deprecated_content};
  font-feature-settings: ${({ redesignFlag }) =>
    redesignFlag ? "'ss01' on, 'ss02' on, 'cv01' on, 'cv03' on" : "'ss01' on, 'ss02' on, 'cv01' on, 'cv03' on"};
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3), 0 0 20px rgba(0, 255, 255, 0.1), inset 0 0 30px rgba(0, 255, 255, 0.05);
`

/**
 * The styled container element that wraps the content of most pages and the tabs.
 */
export default function AppBody({ children, ...rest }: { children: React.ReactNode }) {
  const redesignFlag = useRedesignFlag()
  const redesignFlagEnabled = redesignFlag === RedesignVariant.Enabled
  return (
    <BodyWrapper {...rest} redesignFlag={redesignFlagEnabled}>
      {children}
    </BodyWrapper>
  )
}
