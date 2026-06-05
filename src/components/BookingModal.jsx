import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import BookingForm from './BookingForm'

export default function BookingModal() {
  const { open, preset, closeBooking } = useBooking()

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => (document.body.style.overflow = '')
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4 no-print">
      <div
        className="absolute inset-0"
        onClick={closeBooking}
        aria-hidden
      />
      <div className="relative max-h-[92vh] w-full max-w-lg animate-pop-in overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <button
          onClick={closeBooking}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X size={22} />
        </button>
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Book Your Appointment</h2>
          <p className="mt-1 text-sm text-slate-500">Pick a date & time — your slot is confirmed instantly.</p>
        </div>
        <BookingForm preset={preset} />
      </div>
    </div>
  )
}
