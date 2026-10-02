import { createContext, useContext } from 'react'
import type { IconName } from './Icon'

export interface ToastContextValue {
  show: (message: string, icon?: IconName) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext)
  if (value === null) throw new Error('useToast must be used within a ToastProvider')
  return value
}
