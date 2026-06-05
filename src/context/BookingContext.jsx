import { createContext, useContext, useState } from 'react'

const BookingContext = createContext(null)

export function BookingProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState({})

  const openBooking = (presetData = {}) => {
    setPreset(presetData)
    setOpen(true)
  }
  const closeBooking = () => setOpen(false)

  return (
    <BookingContext.Provider value={{ open, preset, openBooking, closeBooking }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within BookingProvider')
  return ctx
}
