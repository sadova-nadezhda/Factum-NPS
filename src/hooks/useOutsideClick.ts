import { type RefObject, useEffect, useRef } from 'react'

export function useOutsideClick(ref: RefObject<HTMLElement | null>, onOutside: () => void) {
  const cb = useRef(onOutside)
  cb.current = onOutside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref])
}
