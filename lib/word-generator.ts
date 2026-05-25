import path from 'path'
import fs from 'fs'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import type { EmployeeFormData, OnboardingSession } from '@prisma/client'

type Session = OnboardingSession & { employeeForm: EmployeeFormData | null }

const TPL = path.join(process.cwd(), 'public', 'templates')

function loadTemplate(name: string): Buffer {
  return fs.readFileSync(path.join(TPL, name))
}

function fillTemplate(templateBuf: Buffer, data: Record<string, string>): Buffer {
  const zip = new PizZip(templateBuf)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })
  doc.render(data)

  // 後處理：移除分頁符號 + 末尾多餘空白段落
  const outZip = doc.getZip()
  let xmlStr = outZip.file('word/document.xml')?.asText()
  if (xmlStr) {
    // 移除強制分頁（薪資扣繳表有兩個 page break 造成空白頁）
    xmlStr = xmlStr.replace(/<w:br\s+w:type="page"\s*\/>/g, '')
    // 移除末尾連續的空白段落（只保留最後一個以維持格式）
    // 移除末尾多餘空白段落
    const bodyEnd = '</w:body>'
    const idx = xmlStr.lastIndexOf(bodyEnd)
    if (idx > 0) {
      let segment = xmlStr.slice(0, idx)
      const emptyParaRe = /<w:p\b[^>]*>(?:<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>)?\s*<\/w:p>\s*$/
      let removed = 0
      while (removed < 5 && emptyParaRe.test(segment)) {
        segment = segment.replace(emptyParaRe, '')
        removed++
      }
      const endPart = xmlStr.slice(idx)
      const minimal = `<w:p><w:pPr><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>`
      outZip.file('word/document.xml', segment + minimal + endPart)
    } else {
      // 至少把移除分頁符號後的 XML 寫回
      outZip.file('word/document.xml', xmlStr)
    }
  }

  return Buffer.from(outZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
}

function v(val: unknown): string {
  if (val == null) return ''
  return String(val).trim()
}

function parseJson<T>(val: unknown): T[] {
  if (!val) return []
  // Prisma 的 Json 欄位回傳已解析的物件，不需要再 JSON.parse
  if (Array.isArray(val)) return val as T[]
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T[] } catch { return [] }
  }
  return []
}

function emptyRows(prefix: string, fields: string[], count: number, existing: number): Record<string, string> {
  const acc: Record<string, string> = {}
  for (let n = existing + 1; n <= count; n++) {
    fields.forEach(f => { acc[`${prefix}${f}${n}`] = '' })
  }
  return acc
}


// ── 勞工退休金勾選格式 ───────────────────────────────
function laborPensionText(self: boolean | null | undefined, rate: string | null | undefined): string {
  if (self === true)
    return `☑ Yes 我要自提, 提撥率為${v(rate) || '___'}%,（最高max 6%）□     No 我不要自提`
  if (self === false)
    return '□ Yes 我要自提, 提撥率為____%,（最高max 6%）☑     No 我不要自提'
  return ''
}

// ── 員工基本資料卡 ────────────────────────────────────
export async function generateBasicInfoCard(session: Session): Promise<Buffer> {
  const f = session.employeeForm
  const edu  = parseJson<Record<string,string>>(f?.education)
  const work = parseJson<Record<string,string>>(f?.workHistory)
  const lang = parseJson<Record<string,string>>(f?.languageSkills)
  const fam  = parseJson<Record<string,string>>(f?.familyMembers)
  const nhi  = parseJson<Record<string,string>>(f?.nhiDependents)

  // 出生日期：ROC "113/05/18" → 年/月/日（去補零）
  const bd = v(f?.birthDate).split('/')
  const birthYear  = bd[0] || ''
  const birthMonth = bd[1]?.replace(/^0/, '') || ''
  const birthDay   = bd[2]?.replace(/^0/, '') || ''

  // 英文姓名：優先 first+last，fallback englishName
  const nameEnglishFull = session.englishFirst && session.englishLast
    ? `${session.englishFirst} ${session.englishLast}`
    : v(session.englishName)

  // 地址
  const permanentAddress = v(f?.permanentAddress)
  const currentAddress   = f?.sameAddress ? permanentAddress : v(f?.currentAddress)

  // 到職日拆分
  const sd = new Date(session.startDate)
  const startDateY = String(sd.getFullYear() - 1911)  // 民國年
  const startDateM = String(sd.getMonth() + 1)
  const startDateD = String(sd.getDate())

  const data: Record<string, string> = {
    // 頁首
    employeeId: v(session.employeeId),
    startDateY, startDateM, startDateD,

    // ① 基本資料
    nameChinese:      v(session.name),
    nameEnglishFull,
    nameEnglishAlt:   nameEnglishFull,
    birthYear, birthMonth, birthDay,
    idNumber:         v(f?.idNumber),
    birthplace:       v(f?.birthplace),
    nationality:      v(f?.nationality) || '中華民國',
    bloodType:        v(f?.bloodType),
    genderText:       v(f?.gender),   // 直接顯示「男」或「女」
    maritalText:      v(f?.maritalStatus),  // 直接顯示「已婚」或「未婚」

    // 子女數（兒子/女兒分別計算）
    sonsCount:     v(f?.sonsCount),
    daughtersCount: v(f?.daughtersCount),

    contactPhone:     [v(f?.homePhone), v(f?.mobilePhone)].filter(Boolean).join(' / '),
    email:            v(f?.personalEmail),

    // 地址
    permanentAddrZip: '',             // 清除 □□□-□□ 佔位符
    permanentAddress,
    currentAddress,

    // ② 學歷（3 筆）
    ...edu.slice(0, 3).reduce((acc, e, i) => {
      const n = i + 1
      acc[`eduFromY${n}`]    = e.from?.split('/')[0] || ''
      acc[`eduFromM${n}`]    = e.from?.split('/')[1]?.replace(/^0/, '') || ''
      acc[`eduToY${n}`]      = e.to?.split('/')[0] || ''
      acc[`eduToM${n}`]      = e.to?.split('/')[1]?.replace(/^0/, '') || ''
      acc[`eduSchool${n}`]   = v(e.school)
      acc[`eduDept${n}`]     = v(e.dept)
      acc[`eduDayNight${n}`] = v(e.dayNight)
      acc[`eduYears${n}`]    = (e.years === '其他' || e.years === 'Other')
                                 ? v(e.yearsCustom) : v(e.years)
      acc[`eduGrad${n}`]     = v(e.graduated) +
                                 (e.graduationReason ? ` (${e.graduationReason})` : '')
      return acc
    }, {} as Record<string, string>),
    ...emptyRows('edu', ['FromY','FromM','ToY','ToM','School','Dept','DayNight','Years','Grad'], 3, edu.length),

    // ③ 工作經歷（5 筆）—— 薪資加 /月.年 後綴
    ...work.slice(0, 5).reduce((acc, w, i) => {
      const n = i + 1
      acc[`wkFromY${n}`]    = w.from?.split('/')[0] || ''
      acc[`wkFromM${n}`]    = w.from?.split('/')[1]?.replace(/^0/, '') || ''
      acc[`wkToY${n}`]      = w.to?.split('/')[0] || ''
      acc[`wkToM${n}`]      = w.to?.split('/')[1]?.replace(/^0/, '') || ''
      acc[`wkCompany${n}`]  = v(w.company)
      acc[`wkPosition${n}`] = v(w.position)
      // 薪資格式與範例一致："57k/769k  /月.年"
      acc[`wkSalary${n}`]   = w.salary ? `${v(w.salary)}  /月.年` : ''
      acc[`wkReason${n}`]   = v(w.reason)
      return acc
    }, {} as Record<string, string>),
    ...emptyRows('wk', ['FromY','FromM','ToY','ToM','Company','Position','Salary','Reason'], 5, work.length),

    // ④ 語言能力（4 筆）
    ...lang.slice(0, 4).reduce((acc, l, i) => {
      const n = i + 1
      acc[`langName${n}`]   = v(l.lang)
      acc[`langListen${n}`] = v(l.listen)
      acc[`langSpeak${n}`]  = v(l.speak)
      acc[`langRead${n}`]   = v(l.read)
      acc[`langWrite${n}`]  = v(l.write)
      return acc
    }, {} as Record<string, string>),
    ...emptyRows('lang', ['Name','Listen','Speak','Read','Write'], 4, lang.length),

    // ⑤ 緊急聯絡人
    emergName:     v(f?.emergencyName),
    emergRelation: v(f?.emergencyRelation),
    emergPhone:    v(f?.emergencyPhone),

    // ⑥ 家庭狀況（5 筆）
    ...fam.slice(0, 5).reduce((acc, fm, i) => {
      const n = i + 1
      acc[`famRel${n}`]   = v(fm.relation)
      acc[`famName${n}`]  = v(fm.name)
      acc[`famBirth${n}`] = v(fm.birthDate)
      acc[`famOcc${n}`]   = v(fm.occupation)
      acc[`famAddr${n}`]  = v(fm.address)
      return acc
    }, {} as Record<string, string>),
    ...emptyRows('fam', ['Rel','Name','Birth','Occ','Addr'], 5, fam.length),

    // ⑦ 眷屬健保（3 人）
    ...nhi.slice(0, 3).reduce((acc, n, i) => {
      const idx = i + 1
      acc[`nhi${idx}Name`]  = v(n.name)
      acc[`nhi${idx}Id`]    = v(n.idNumber)
      acc[`nhi${idx}Birth`] = v(n.birthDate)
      acc[`nhi${idx}Rel`]   = v(n.relation)
      return acc
    }, {} as Record<string, string>),
    ...([1,2,3] as const).reduce((acc, idx) => {
      if (idx > nhi.length) {
        acc[`nhi${idx}Name`] = ''; acc[`nhi${idx}Id`] = ''
        acc[`nhi${idx}Birth`] = ''; acc[`nhi${idx}Rel`] = ''
      }
      return acc
    }, {} as Record<string, string>),

    // ⑧ 勞工退休金（勾選格式）
    laborPensionText: laborPensionText(f?.laborPensionSelf, f?.laborPensionRate),
  }

  return fillTemplate(loadTemplate('basic-info.docx'), data)
}

// ── 身分證拆分（每位獨立 placeholder）────────────────
function idParts(id: string, prefix: string): Record<string, string> {
  const s = v(id).toUpperCase()
  const acc: Record<string, string> = {}
  for (let i = 0; i < 10; i++) acc[`${prefix}Id${i + 1}`] = s[i] || ''
  return acc
}

// ── 生日拆分 ─────────────────────────────────────────
function bdParts(bd: string, prefix: string): Record<string, string> {
  const parts = v(bd).split('/')
  return {
    [`${prefix}BY`]: parts[0] || '',
    [`${prefix}BM`]: parts[1] ? String(parseInt(parts[1])) : '',
    [`${prefix}BD`]: parts[2] ? String(parseInt(parts[2])) : '',
  }
}

// ── 免稅人口欄位 helper ───────────────────────────────
function exemptRow(dep: Record<string,string>, prefix: string): Record<string, string> {
  return {
    [`${prefix}Name`]:  v(dep.name),
    [`${prefix}Rel`]:   v(dep.relation),
    [`${prefix}Birth`]: v(dep.birthDate),
    ...idParts(dep.idNumber, prefix),
    [`${prefix}Addr`]:  v(dep.address),
    [`${prefix}Cond`]:  v(dep.condition),
  }
}

function emptyExemptRow(prefix: string): Record<string, string> {
  return exemptRow({ name:'', relation:'', birthDate:'', idNumber:'', address:'', condition:'' }, prefix)
}

// ── 薪資扣繳選擇表及個資同意書 ────────────────────────
export async function generateWithholdingForm(session: Session): Promise<Buffer> {
  const f = session.employeeForm
  const taxDeps = parseJson<Record<string,string>>(f?.taxDependents)
  const familyMembers = parseJson<Record<string,string>>(f?.familyMembers)

  const nameEnglish = session.englishFirst && session.englishLast
    ? `${session.englishFirst} ${session.englishLast}`
    : v(session.englishName)

  // 扣繳方式
  const withholdingChoice = (() => {
    if (f?.withholdingMethod === '1') return '方式一'
    if (f?.withholdingMethod === '2') return '方式二'
    return ''
  })()

  // 配偶（從家庭成員中找 relation 包含「配偶/妻/夫」）
  const spouse = familyMembers.find(m =>
    ['配偶','妻','夫','老婆','老公','太太'].some(r => v(m.relation).includes(r))
  )

  // 免稅人口分類
  const ancestors = taxDeps.filter(d => d.type === '直系尊親屬')  // Table 3
  const children  = taxDeps.filter(d => d.type === '子女')         // Table 4 左
  const siblings  = taxDeps.filter(d => d.type === '兄弟姊妹')     // Table 4 右
  const others    = taxDeps.filter(d => d.type === '其他')         // Table 5

  // 本人生日
  const selfBd = bdParts(v(f?.birthDate), 'self')

  const data: Record<string, string> = {
    // ── Table 1 ──
    nameChinese:  v(session.name),
    nameEnglish,
    employeeId:   v(session.employeeId),
    idNumber:     v(f?.idNumber),
    withholdingChoice,
    sigDate: f?.submittedAt
      ? new Date(f.submittedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '',

    // ── Table 2: 本人 ──
    selfName: v(session.name),
    ...selfBd,
    ...idParts(v(f?.idNumber), 'self'),
    selfAddr: v(f?.permanentAddress),

    // ── Table 2: 配偶 ──
    spouseName: spouse ? v(spouse.name) : '',
    ...bdParts(spouse ? v(spouse.birthDate) : '', 'spouse'),
    ...idParts('', 'spouse'),  // 配偶 ID 目前不在表單中
    spouseAddr: spouse ? v(spouse.address) : '',

    // ── Table 3: 直系尊親屬（5 筆）──
    ...[0,1,2,3,4].reduce((acc, i) => ({
      ...acc,
      ...(ancestors[i] ? exemptRow(ancestors[i], `anc${i+1}`) : emptyExemptRow(`anc${i+1}`)),
    }), {} as Record<string, string>),

    // ── Table 4: 子女（左，6 筆）──
    ...[0,1,2,3,4,5].reduce((acc, i) => ({
      ...acc,
      ...(children[i] ? exemptRow(children[i], `chi${i+1}`) : emptyExemptRow(`chi${i+1}`)),
    }), {} as Record<string, string>),

    // ── Table 4: 兄弟姊妹（右，6 筆）──
    ...[0,1,2,3,4,5].reduce((acc, i) => ({
      ...acc,
      ...(siblings[i] ? exemptRow(siblings[i], `sib${i+1}`) : emptyExemptRow(`sib${i+1}`)),
    }), {} as Record<string, string>),

    // ── Tables 5-6: 其他（xtr 系列）──
    ...[0,1,2,3,4,5].reduce((acc, i) => ({
      ...acc,
      ...(others[i] ? exemptRow(others[i], `oth${i+1}`) : emptyExemptRow(`oth${i+1}`)),
    }), {} as Record<string, string>),

    // 填滿其餘空白欄位
    ...['xtr2','xtr3'].flatMap(pf =>
      [1,2,3,4,5,6].map(i => emptyExemptRow(`${pf}${i}`))
    ).reduce((a, b) => ({...a, ...b}), {}),
  }

  return fillTemplate(loadTemplate('withholding.docx'), data)
}
