// Vercel Cron (see vercel.json: runs daily) — sends day-before reminders for
// tomorrow's appointments. Emails each client who provided an email, plus a
// summary to the clinic. WhatsApp auto-send needs the paid WhatsApp Business
// API; until then the admin can tap the WhatsApp icon in the dashboard.
import { Resend } from 'resend'
import admin from 'firebase-admin'

const BRAND = '#0e8ba1'

function getDb() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')
    const cred = JSON.parse(raw)
    // Vercel env strips real newlines in the private key — restore them.
    if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n')
    admin.initializeApp({ credential: admin.credential.cert(cred) })
  }
  return admin.firestore()
}

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function fmt12h(t) {
  const [h, m] = String(t).split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`
}

// Escape user-controlled values before putting them in email HTML. Appointment
// fields (name/phone/service/email) are public-writable, so treat as untrusted.
function esc(v) {
  return String(v ?? '—').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]))
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  // Protect the endpoint — fail CLOSED. Vercel Cron sends this header
  // automatically once CRON_SECRET is configured.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET not set; refusing to run.')
    return res.status(503).json({ error: 'Cron not configured' })
  }
  if ((req.headers.authorization || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ENQUIRY_FROM_EMAIL || 'W2W Fitness & Rehab <noreply@w2wfitnessandrehab.in>'
  const clinicTo = process.env.ENQUIRY_TO_EMAIL || ''

  try {
    const db = getDb()
    const date = tomorrowISO()
    const snap = await db
      .collection('appointments')
      .where('date', '==', date)
      .where('status', '==', 'confirmed')
      .get()

    const appts = snap.docs.map((d) => d.data())
    if (!appts.length) return res.status(200).json({ ok: true, sent: 0, note: 'no appointments tomorrow' })

    if (!apiKey) return res.status(200).json({ ok: false, reason: 'RESEND_API_KEY missing', appointments: appts.length })

    const resend = new Resend(apiKey)
    let sent = 0

    // Reminder to each client with a valid email.
    for (const a of appts) {
      if (!a.email || !EMAIL_RE.test(String(a.email))) continue
      try {
        await resend.emails.send({
          from,
          to: a.email,
          subject: `Reminder: Your W2W appointment tomorrow at ${fmt12h(a.time)}`,
          html: clientReminderHtml(a),
        })
        sent++
      } catch (e) {
        console.error('client reminder failed:', e)
      }
    }

    // Daily summary to the clinic.
    if (clinicTo) {
      try {
        await resend.emails.send({
          from,
          to: clinicTo.split(',').map((s) => s.trim()),
          subject: `Tomorrow's schedule (${date}) — ${appts.length} appointment(s)`,
          html: clinicSummaryHtml(date, appts),
        })
      } catch (e) {
        console.error('clinic summary failed:', e)
      }
    }

    return res.status(200).json({ ok: true, appointments: appts.length, clientEmailsSent: sent })
  } catch (err) {
    console.error('send-reminders error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function clientReminderHtml(a) {
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#eef9fb;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(14,139,161,.15)">
      <div style="background:${BRAND};color:#fff;padding:20px 24px"><h2 style="margin:0">W2W Fitness &amp; Rehab</h2></div>
      <div style="padding:24px;color:#1f2937">
        <p>Hi ${esc(a.name || 'there')},</p>
        <p>This is a friendly reminder of your appointment <strong>tomorrow</strong>:</p>
        <div style="background:#f1f7f8;border-radius:10px;padding:16px;margin:12px 0">
          <p style="margin:4px 0"><strong>Service:</strong> ${esc(a.service || '—')}</p>
          <p style="margin:4px 0"><strong>Date:</strong> ${esc(a.date)}</p>
          <p style="margin:4px 0"><strong>Time:</strong> ${esc(fmt12h(a.time))}</p>
        </div>
        <p>Kindly arrive 15 minutes prior to your appointment. To reschedule, just reply or WhatsApp us.</p>
        <p style="color:#64748b;font-size:13px;margin-top:20px">No.5, Balaiah Avenue, Luz Road, Mylapore, Chennai – 600 004<br/>See you soon! — Team W2W</p>
      </div>
    </div>
  </div>`
}

function clinicSummaryHtml(date, appts) {
  const rows = appts
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(
      (a) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${esc(fmt12h(a.time))}</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(a.name)}</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(a.phone || '')}</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(a.service || '')}</td></tr>`
    )
    .join('')
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;padding:24px;background:#f8fafc">
    <h2 style="color:${BRAND}">Tomorrow's Schedule — ${date}</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
      <thead><tr style="background:${BRAND};color:#fff;text-align:left"><th style="padding:8px">Time</th><th style="padding:8px">Client</th><th style="padding:8px">Phone</th><th style="padding:8px">Service</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}
