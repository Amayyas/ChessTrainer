import { useEffect } from 'react'
import { applyEdition, useEditionStore } from '@/features/theme/edition'

/** Keeps the page printed in the chosen edition. Renders nothing; call it once, in App. */
export function useEdition(): void {
  const edition = useEditionStore((state) => state.edition)
  useEffect(() => applyEdition(edition), [edition])
}
