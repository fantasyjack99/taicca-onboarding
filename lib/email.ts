import nodemailer from 'nodemailer'
import path from 'path'
import { workingDaysDeadline, formatDate } from './date'
import { renderEmailHtml, DEFAULT_TEMPLATE, EmailTemplateConfig } from './email-template'
import { prisma } from './db'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function getTemplate(): Promise<EmailTemplateConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'email_template' } })
    if (config) return { ...DEFAULT_TEMPLATE, ...JSON.parse(config.value) }
  } catch {}
  return DEFAULT_TEMPLATE
}

interface OnboardingEmailData {
  name: string
  department: string
  division: string
  title: string
  startDate: Date
  contactEmail: string
  onboardingUrl: string
  formsUrl?: string
  isUpdate?: boolean
}

export async function sendOnboardingEmail(data: OnboardingEmailData): Promise<void> {
  const deadline = workingDaysDeadline(data.startDate, 5)
  const attachmentsDir = path.join(process.cwd(), 'public', 'attachments')
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'

  const template = await getTemplate()

  const html = renderEmailHtml(template, {
    name: data.name,
    department: data.department,
    division: data.division,
    title: data.title,
    startDate: formatDate(data.startDate),
    deadlineStr: formatDate(deadline),
    onboardingUrl: data.onboardingUrl,
    formsUrl: data.formsUrl || '',
    baseUrl,
  })

  // 只附加實際存在的檔案
  const fs = await import('fs')
  const allAttachments = [
    { filename: '員工基本資料卡.docx', path: path.join(attachmentsDir, '員工基本資料卡.docx') },
    { filename: '員工薪資扣繳及個資同意書.docx', path: path.join(attachmentsDir, '員工薪資扣繳及個資同意書.docx') },
  ]
  const attachments = allAttachments.filter(a => {
    try { return fs.statSync(a.path).size > 0 } catch { return false }
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: data.contactEmail,
    subject: data.isUpdate
      ? '[TAICCA] 文化內容策進院新人報到注意事項（更新）'
      : '[TAICCA] 文化內容策進院新人報到注意事項',
    html,
    attachments,
  })
}
