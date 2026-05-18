import nodemailer from 'nodemailer'
import { prisma } from './db'
import { formatDate } from './date'

// ── Admin email list ──────────────────────────────────
async function getAdminEmails(): Promise<string[]> {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'admin_emails' } })
    if (config) {
      const parsed = JSON.parse(config.value) as string[]
      if (parsed.length > 0) return parsed
    }
  } catch {}
  return (process.env.HR_ALLOWED_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

// ── Slack Webhook URL ─────────────────────────────────
async function getSlackWebhookUrl(): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'slack_webhook_url' } })
    return config?.value || null
  } catch {}
  return null
}

// ── SMTP transporter ──────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

// ── HR submission notification email ─────────────────
interface NotifyPayload {
  name: string
  department: string
  division: string
  title: string
  startDate: Date
  taiccaEmail: string | null
  englishName: string | null
  adminReviewUrl: string
}

export async function sendHRNotification(payload: NotifyPayload): Promise<void> {
  const adminEmails = await getAdminEmails()
  if (adminEmails.length === 0) return

  const startDateStr = formatDate(payload.startDate)

  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8">
<style>
  body { font-family: "Microsoft JhengHei", sans-serif; color: #1a1a1a; line-height: 1.7; margin:0;padding:0; }
  .header { background: #c8362b; padding: 16px 28px; }
  .header h1 { margin:0; font-size:16px; color:#fff; font-weight:600; }
  .body { padding: 28px; max-width: 560px; }
  .info-row { display:flex; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .info-label { color:#777; font-size:13px; width:100px; flex-shrink:0; }
  .info-value { font-size:14px; color:#1a1a1a; }
  .cta { display:inline-block; background:#c8362b; color:#fff; padding:12px 28px;
         text-decoration:none; font-weight:bold; border-radius:4px; margin-top:20px; font-size:14px; }
  .footer { background:#f5f5f5; padding:14px 28px; font-size:12px; color:#777; }
</style>
</head>
<body>
<div class="header"><h1>📋 文化內容策進院 — 新人報到資料填寫通知</h1></div>
<div class="body">
  <p style="font-size:15px; margin:0 0 20px;">以下新人已完成報到資料填寫，請前往後台確認並建檔。</p>
  <div class="info-row"><span class="info-label">姓名</span><span class="info-value">${payload.name}</span></div>
  <div class="info-row"><span class="info-label">處室</span><span class="info-value">${payload.department} ${payload.division}</span></div>
  <div class="info-row"><span class="info-label">職稱</span><span class="info-value">${payload.title}</span></div>
  <div class="info-row"><span class="info-label">到職日</span><span class="info-value">${startDateStr}</span></div>
  <div class="info-row"><span class="info-label">TAICCA 信箱</span><span class="info-value">${payload.taiccaEmail ? payload.taiccaEmail + '@taicca.tw' : '—'}</span></div>
  <div class="info-row"><span class="info-label">英文姓名</span><span class="info-value">${payload.englishName || '—'}</span></div>
  <a href="${payload.adminReviewUrl}" class="cta">→ 前往後台確認 / 建檔</a>
</div>
<div class="footer">此信件由文化內容策進院新人報到系統自動發送</div>
</body></html>`

  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: adminEmails.join(','),
    subject: `[TAICCA 報到系統] ${payload.name} 已完成報到資料填寫`,
    html,
  })
}

// ── Slack Webhook 通知（Incoming Webhook）────────────
export async function sendSlackNotification(payload: NotifyPayload): Promise<void> {
  const webhookUrl = await getSlackWebhookUrl()
  if (!webhookUrl) return

  const startDateStr = formatDate(payload.startDate)

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `📋 ${payload.name} 已完成報到資料填寫`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📋 新人報到資料已填寫', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*姓名*\n${payload.name}` },
            { type: 'mrkdwn', text: `*信箱*\n${payload.taiccaEmail ? payload.taiccaEmail + '@taicca.tw' : '—'}` },
            { type: 'mrkdwn', text: `*處室*\n${payload.department} ${payload.division}` },
            { type: 'mrkdwn', text: `*職稱*\n${payload.title}` },
            { type: 'mrkdwn', text: `*到職日*\n${startDateStr}` },
            { type: 'mrkdwn', text: `*英文姓名*\n${payload.englishName || '—'}` },
          ],
        },
        {
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: '→ 前往後台確認', emoji: true },
            url: payload.adminReviewUrl,
            style: 'primary',
          }],
        },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status}`)
  }
}
