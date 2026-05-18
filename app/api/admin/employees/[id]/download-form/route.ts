import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateBasicInfoCard, generateWithholdingForm } from '@/lib/word-generator'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = params
  const type = req.nextUrl.searchParams.get('type') // 'basic' | 'withholding'

  const record = await prisma.onboardingSession.findUnique({
    where: { id },
    include: { employeeForm: true },
  })

  if (!record) return new NextResponse('Not found', { status: 404 })
  if (!record.employeeForm?.submittedAt) {
    return new NextResponse('員工資料表單尚未填寫', { status: 404 })
  }

  try {
    let buffer: Buffer
    let filename: string

    if (type === 'withholding') {
      buffer = await generateWithholdingForm(record)
      filename = `${record.name}_薪資扣繳選擇表及個資同意書.docx`
    } else {
      buffer = await generateBasicInfoCard(record)
      filename = `${record.name}_員工基本資料卡.docx`
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('Word generation error:', err)
    return new NextResponse('文件產生失敗', { status: 500 })
  }
}
