// Vercel serverless function — emails new enquiries & bookings to the clinic
// via Resend. Configure RESEND_API_KEY, ENQUIRY_FROM_EMAIL, ENQUIRY_TO_EMAIL.
import { Resend } from 'resend'

const BRAND = '#0e8ba1'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  // All site notifications (appointments, enquiries, workshop registrations) go
  // to the clinic's official inbox. In production, set ENQUIRY_TO_EMAIL to
  // the clinic's address once a domain is verified in Resend.
  const to = process.env.ENQUIRY_TO_EMAIL || 'w2wfitnessandrehab@gmail.com'
  const from = process.env.ENQUIRY_FROM_EMAIL || 'W2W Fitness & Rehab <onboarding@resend.dev>'

  if (!apiKey) {
    // Not fatal for the user — the booking/enquiry is already saved in Firestore.
    console.warn('Email not configured (RESEND_API_KEY missing); skipping email.')
    return res.status(200).json({ ok: false, reason: 'email-not-configured' })
  }

  try {
    const { type = 'enquiry', name, phone, email, service, date, time, notes, message, workshopTitle, qualification, paidVia } = req.body || {}
    const isBooking = type === 'booking'
    const isWorkshop = type === 'workshop'
    const subject = isWorkshop
      ? `🎓 New Workshop Registration — ${name || 'Student'}`
      : isBooking
        ? `🗓️ New Appointment — ${name || 'Client'} (${service || 'Service'})`
        : `✉️ New Enquiry — ${name || 'Client'}`

    const rows = [
      ['Name', name],
      ['Phone', phone],
      ['Email', email],
      isWorkshop ? ['Workshop', workshopTitle] : ['Service', service],
      isWorkshop ? ['Qualification', qualification] : null,
      isWorkshop ? ['Paid via', paidVia] : null,
      isBooking ? ['Date', date] : null,
      isBooking ? ['Time', time] : null,
      isBooking ? ['Notes', notes] : (isWorkshop ? null : ['Message', message]),
    ].filter(Boolean)

    const html = renderEmail({ isBooking, isWorkshop, rows, phone })
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to: to.split(',').map((s) => s.trim()),
      replyTo: email || undefined,
      subject,
      html,
    })
    if (error) {
      console.error('Resend error:', error)
      return res.status(200).json({ ok: false, reason: 'send-failed', detail: error?.message || String(error) })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('send-enquiry error:', err)
    return res.status(200).json({ ok: false, reason: 'exception', detail: err?.message || String(err) })
  }
}

// Attribute-safe HTML escaping (covers quotes too, since values like `phone`
// are interpolated into href="..." attributes).
function esc(v) {
  return String(v ?? '—').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]))
}

function renderEmail({ isBooking, isWorkshop, rows, phone }) {
  const waNumber = (phone || '').replace(/\D/g, '')
  const tableRows = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:10px 14px;background:#f1f7f8;font-weight:600;color:#0f5b6c;width:130px;vertical-align:top;border-bottom:1px solid #e4eef0;">${esc(k)}</td>
        <td style="padding:10px 14px;color:#1f2937;border-bottom:1px solid #e4eef0;white-space:pre-line;">${esc(v)}</td>
      </tr>`
    )
    .join('')

  return `
  <div style="margin:0;padding:24px;background:#eef9fb;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(14,139,161,0.15);">
      <div style="background:${BRAND};padding:22px 24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;">W2W Fitness &amp; Rehab</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:.9;">${isWorkshop ? 'New workshop registration' : isBooking ? 'New appointment booked online' : 'New enquiry received'}</p>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e4eef0;">
          ${tableRows}
        </table>
        ${
          phone
            ? `<div style="margin-top:20px;text-align:center;">
                <a href="tel:${esc(phone)}" style="display:inline-block;margin:4px;padding:10px 18px;background:${BRAND};color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;">📞 Call ${esc(phone)}</a>
                <a href="https://wa.me/${waNumber.startsWith('91') ? waNumber : '91' + waNumber}" style="display:inline-block;margin:4px;padding:10px 18px;background:#22c55e;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;">💬 WhatsApp</a>
              </div>`
            : ''
        }
        <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center;">
          This message was generated automatically from your website.<br/>
          No.5, Balaiah Avenue, Luz Road, Mylapore, Chennai – 600 004
        </p>
      </div>
    </div>
  </div>`
}
