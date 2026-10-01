import { useContext } from 'react'
import { SettingsContext } from './settingsContextObject'

export function useSettings() {
  return useContext(SettingsContext)
}
