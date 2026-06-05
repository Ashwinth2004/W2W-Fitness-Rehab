import { useState } from 'react'
import { Send, CheckCircle2, Loader2 } from 'lucide-react'
import { createEnquiry } from '../lib/firestore'
import { notifyClinic } from '../lib/email'
import { SERVICE_OPTIONS } from '../lib/constants'
import { isValidMobile } from '../lib/validate'
import PhoneField from './PhoneField'

export default function EnquiryForm() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: SERVICE_OPTIONS[0], message: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Please enter your name.'); return }
    if (!isValidMobile(form.phone)) { setError('Enter a valid 10-digit mobile number.'); return }
    setStatus('saving')
    try {
      await createEnquiry({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        service: form.service,
        message: form.message.trim(),
      })
      notifyClinic('enquiry', form)
      setStatus('done')
    } catch (err) {
      setError('Could not send right now. Please WhatsApp or call us instead.')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div className="animate-fade-in rounded-2xl bg-green-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-green-500" size={48} />
        <h3 className="text-xl font-bold text-slate-900">Message sent! 🙌</h3>
        <p className="mt-2 text-slate-600">Thank you, {form.name}. Our team will get back to you shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Your name" required />
        </div>
        <div>
          <label className="label">Phone *</label>
          <PhoneField value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" />
        </div>
        <div>
          <label className="label">Service of Interest</label>
          <select className="input" value={form.service} onChange={set('service')}>
            {SERVICE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Message</label>
        <textarea className="input min-h-[120px]" value={form.message} onChange={set('message')} placeholder="How can we help you?" />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={status === 'saving'} className="btn-primary w-full">
        {status === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        {status === 'saving' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
