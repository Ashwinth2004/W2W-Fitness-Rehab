// Sends enquiry/booking notifications to the clinic via the Vercel serverless
// function (/api/send-enquiry). Never throws — a failed email must not block
// the Firestore save, since the admin still sees it in the dashboard.
export async function notifyClinic(type, payload) {
  try {
    const res = await fetch('/api/send-enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload }),
    })
    return res.ok
  } catch (err) {
    console.warn('Email notification failed (saved to dashboard anyway):', err)
    return false
  }
}
