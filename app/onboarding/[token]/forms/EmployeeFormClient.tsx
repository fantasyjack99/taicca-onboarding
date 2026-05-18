'use client'
import { useState, useCallback } from 'react'
import { type Lang, common, employeeFormT } from '@/lib/i18n'

// ── 型別 ──────────────────────────────────────────────
interface EducationRow {
  from: string; to: string; school: string; dept: string
  dayNight: string; years: string; yearsCustom: string
  graduated: string; graduationReason: string; note: string
}
interface WorkRow       { from: string; to: string; company: string; position: string; salary: string; reason: string }
interface LangRow       { lang: string; listen: string; speak: string; read: string; write: string }
interface FamilyRow     { relation: string; name: string; birthDate: string; occupation: string; address: string }
interface NHIRow        { name: string; idNumber: string; birthDate: string; relation: string }
interface TaxDepRow     { type: string; name: string; relation: string; birthDate: string; idNumber: string; address: string; condition: string }

interface Props {
  token: string; name: string; taiccaEmail: string
  englishFirst: string; englishLast: string
  department: string; division: string; title: string; startDate: string
  alreadySubmitted: boolean
  savedData: Record<string, unknown> | null
}

function newEdu(): EducationRow  { return { from:'', to:'', school:'', dept:'', dayNight:'日', years:'', yearsCustom:'', graduated:'是', graduationReason:'', note:'' } }
function newWork(): WorkRow      { return { from:'', to:'', company:'', position:'', salary:'', reason:'' } }
function newLang(): LangRow      { return { lang:'英文', listen:'3', speak:'3', read:'3', write:'3' } }
function newFamily(): FamilyRow  { return { relation:'', name:'', birthDate:'', occupation:'', address:'' } }
function newNHI(): NHIRow        { return { name:'', idNumber:'', birthDate:'', relation:'' } }
function newTax(type='直系尊親屬'): TaxDepRow { return { type, name:'', relation:'', birthDate:'', idNumber:'', address:'', condition:'' } }

function parse<T>(val: unknown, def: T[]): T[] {
  if (!val) return def
  try { const r = typeof val === 'string' ? JSON.parse(val) : val; return Array.isArray(r) ? r : def } catch { return def }
}

// ── 年月下拉 (模組層級，不在 component 內) ─────────────
// 使用民國年格式，儲存格式："113/9"
const ROC_YEARS = Array.from({ length: 50 }, (_, i) => String(65 + i))    // 民國65~114
const MONTHS    = Array.from({ length: 12 }, (_, i) => String(i + 1))

function YearMonthSelect({ value, onChange, inputStyle }: {
  value: string
  onChange: (v: string) => void
  inputStyle: React.CSSProperties
}) {
  const parts = value ? value.split('/') : ['', '']
  const yr = parts[0] || ''
  const mo = parts[1] || ''
  const update = (y: string, m: string) => onChange(y || m ? `${y}/${m}` : '')
  return (
    <div style={{ display:'flex', gap:'4px' }}>
      <select
        value={yr}
        onChange={e => update(e.target.value, mo)}
        style={{ ...inputStyle, width:'68px', padding:'8px 4px' }}
      >
        <option value=''>年</option>
        {ROC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        value={mo}
        onChange={e => update(yr, e.target.value)}
        style={{ ...inputStyle, width:'52px', padding:'8px 4px' }}
      >
        <option value=''>月</option>
        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}

// ── 地址捷徑按鈕 ──────────────────────────────────────
function AddressShortcuts({
  permanentAddr, currentAddr, onSelect, lang,
}: { permanentAddr: string; currentAddr: string; onSelect: (v: string) => void; lang: Lang }) {
  const labels = lang === 'zh'
    ? { reg: '同戶籍地址', mail: '同通訊地址' }
    : { reg: 'Same as registered', mail: 'Same as mailing' }
  const btn: React.CSSProperties = {
    padding:'3px 10px', fontSize:'11px', background:'#f0f0f0', border:'1px solid #ddd',
    borderRadius:'4px', cursor:'pointer', color:'#555', marginRight:'6px', marginBottom:'4px',
  }
  return (
    <div style={{ marginBottom:'4px' }}>
      {permanentAddr && (
        <button type="button" onClick={() => onSelect(permanentAddr)} style={btn}>
          ← {labels.reg}
        </button>
      )}
      {currentAddr && currentAddr !== permanentAddr && (
        <button type="button" onClick={() => onSelect(currentAddr)} style={btn}>
          ← {labels.mail}
        </button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════
export default function EmployeeFormClient(props: Props) {
  const { token, name, taiccaEmail, englishFirst, englishLast,
          department, division, title, startDate, alreadySubmitted, savedData } = props
  const s = savedData as Record<string, unknown> | null

  // 語言
  const [lang, setLang] = useState<Lang>('zh')
  const t = employeeFormT[lang]
  const c = common[lang]

  // 基本資料
  const [birthDate,       setBirthDate]       = useState(String(s?.birthDate || ''))
  const [idNumber,        setIdNumber]         = useState(String(s?.idNumber || ''))
  const [birthplace,      setBirthplace]       = useState(String(s?.birthplace || ''))
  const [nationality,     setNationality]      = useState(String(s?.nationality || '中華民國'))
  const [bloodType,       setBloodType]        = useState(String(s?.bloodType || ''))
  const [gender,          setGender]           = useState(String(s?.gender || ''))
  const [maritalStatus,   setMaritalStatus]    = useState(String(s?.maritalStatus || ''))
  const [childrenCount,   setChildrenCount]    = useState(String(s?.childrenCount || ''))  // 舊欄位，保留相容
  const [sonsCount,       setSonsCount]        = useState(String(s?.sonsCount || ''))
  const [daughtersCount,  setDaughtersCount]   = useState(String(s?.daughtersCount || ''))
  const [homePhone,       setHomePhone]        = useState(String(s?.homePhone || ''))
  const [mobilePhone,     setMobilePhone]      = useState(String(s?.mobilePhone || ''))
  const [personalEmail,   setPersonalEmail]    = useState(String(s?.personalEmail || ''))
  const [permanentAddr,   setPermanentAddr]    = useState(String(s?.permanentAddress || ''))
  const [currentAddr,     setCurrentAddr]      = useState(String(s?.currentAddress || ''))
  const [sameAddress,     setSameAddress]      = useState(Boolean(s?.sameAddress))

  // 動態列
  const [education,     setEducation]     = useState<EducationRow[]>(() => parse(s?.education, [newEdu()]))
  const [workHistory,   setWorkHistory]   = useState<WorkRow[]>(() => parse(s?.workHistory, [newWork()]))
  const [langSkills,    setLangSkills]    = useState<LangRow[]>(() => parse(s?.languageSkills, [newLang()]))
  const [familyMembers, setFamilyMembers] = useState<FamilyRow[]>(() => parse(s?.familyMembers, [newFamily()]))
  const [nhiDeps,       setNHIDeps]       = useState<NHIRow[]>(() => parse(s?.nhiDependents, []))
  const [emergName,     setEmergName]     = useState(String(s?.emergencyName || ''))
  const [emergRel,      setEmergRel]      = useState(String(s?.emergencyRelation || ''))
  const [emergPhone,    setEmergPhone]    = useState(String(s?.emergencyPhone || ''))
  const [laborSelf,     setLaborSelf]     = useState<boolean | null>(s?.laborPensionSelf == null ? null : Boolean(s.laborPensionSelf))
  const [laborRate,     setLaborRate]     = useState(String(s?.laborPensionRate || ''))
  const [withholding,   setWithholding]   = useState(String(s?.withholdingMethod || ''))
  const [taxDeps,       setTaxDeps]       = useState<TaxDepRow[]>(() => parse(s?.taxDependents, []))
  const [consent,       setConsent]       = useState(Boolean(s?.consentAgreed))

  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')
  const [submitted, setSubmitted] = useState(alreadySubmitted)
  const [submitErr, setSubmitErr] = useState('')

  const collectData = useCallback(() => ({
    birthDate, idNumber, birthplace, nationality, bloodType, gender,
    maritalStatus, childrenCount, sonsCount, daughtersCount, homePhone, mobilePhone, personalEmail,
    permanentAddress: permanentAddr,
    currentAddress: sameAddress ? permanentAddr : currentAddr,
    sameAddress,
    education, workHistory, languageSkills: langSkills,
    familyMembers, nhiDependents: nhiDeps,
    emergencyName: emergName, emergencyRelation: emergRel, emergencyPhone: emergPhone,
    laborPensionSelf: laborSelf, laborPensionRate: laborRate,
    withholdingMethod: withholding, taxDependents: taxDeps,
    consentAgreed: consent,
  }), [birthDate,idNumber,birthplace,nationality,bloodType,gender,maritalStatus,childrenCount,homePhone,mobilePhone,personalEmail,permanentAddr,currentAddr,sameAddress,education,workHistory,langSkills,familyMembers,nhiDeps,emergName,emergRel,emergPhone,laborSelf,laborRate,withholding,taxDeps,consent])

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    try {
      const res = await fetch(`/api/onboarding/${token}/forms`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(collectData()) })
      if (!res.ok) throw new Error()
      setSaveMsg(c.saved)
      setTimeout(() => setSaveMsg(''), 3000)
    } catch { setSaveMsg(c.saveFailed) }
    finally { setSaving(false) }
  }

  async function handleSubmit() {
    setSubmitErr('')
    if (!idNumber.trim()) { setSubmitErr(t.errId); return }
    if (!consent) { setSubmitErr(t.errConsent); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/onboarding/${token}/forms`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(collectData()) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || '送出失敗') }
      setSubmitted(true)
    } catch(e: unknown) { setSubmitErr(e instanceof Error ? e.message : '送出失敗') }
    finally { setSaving(false) }
  }

  if (submitted) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#fafafa', padding:'32px', textAlign:'center' }}>
        <div style={{ fontSize:'52px', marginBottom:'16px', color:'var(--success)' }}>✓</div>
        <h1 style={{ fontSize:'22px', marginBottom:'12px', fontFamily:'"Noto Serif TC",serif' }}>
          {lang === 'zh' ? '員工資料已送出' : 'Employee Form Submitted'}
        </h1>
        <p style={{ color:'var(--text-secondary)', lineHeight:1.8, maxWidth:'420px' }}>
          {lang === 'zh'
            ? <>您的員工基本資料及薪資扣繳選擇已填寫完成。<br />人資同仁將於報到前進行確認，扣繳及個資同意書請於報到當日簽名。</>
            : <>Your employee information and tax withholding form have been submitted.<br />HR will review before your start date. Please sign the printed consent form on your first day.</>
          }
        </p>
        <div style={{ marginTop:'40px', color:'var(--text-muted)', fontSize:'13px' }}>{c.contactUs}</div>
      </div>
    )
  }

  // ── 共用樣式 ──
  const inp: React.CSSProperties = { padding:'9px 10px', background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text-primary)', fontSize:'14px', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }
  const sel: React.CSSProperties = { ...inp }
  const card: React.CSSProperties = { background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px', marginBottom:'20px' }
  const cardTitle: React.CSSProperties = { fontSize:'15px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'16px', paddingBottom:'10px', borderBottom:'2px solid var(--accent)', display:'flex', alignItems:'center', gap:'8px' }
  const row: React.CSSProperties = { display:'grid', gap:'12px', marginBottom:'12px' }
  const lbl: React.CSSProperties = { fontSize:'12px', color:'var(--text-secondary)', display:'block', marginBottom:'4px' }
  const removeBtn: React.CSSProperties = { background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:'12px', padding:'2px 6px' }
  const addBtn: React.CSSProperties = { background:'none', border:'1px dashed var(--border)', borderRadius:'4px', padding:'7px 16px', cursor:'pointer', color:'var(--accent)', fontSize:'13px', width:'100%' }

  const effAddr = sameAddress ? permanentAddr : currentAddr

  return (
    <div style={{ background:'#fafafa', minHeight:'100vh' }}>
      {/* 頁首 */}
      <div style={{ background:'var(--accent)', padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'11px', letterSpacing:'0.15em' }}>TAIWAN CREATIVE CONTENT AGENCY</div>
          <div style={{ color:'#fff', fontSize:'16px', fontWeight:'600', marginTop:'2px' }}>{t.header}</div>
        </div>
        <button type="button" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.4)', color:'#fff', borderRadius:'20px', padding:'5px 14px', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
          {c.langToggle}
        </button>
      </div>

      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'28px 24px 96px' }}>
        {/* 個人摘要 */}
        <div style={{ background:'#fff', border:'1px solid var(--border)', borderLeft:'4px solid var(--accent)', borderRadius:'var(--radius-lg)', padding:'14px 20px', marginBottom:'24px' }}>
          <div style={{ fontWeight:'700', fontSize:'16px' }}>{name}{taiccaEmail && <span style={{ fontSize:'13px', fontWeight:'400', color:'var(--text-secondary)', marginLeft:'8px' }}>{taiccaEmail}@taicca.tw</span>}</div>
          <div style={{ fontSize:'13px', color:'var(--text-secondary)', marginTop:'2px' }}>{department}　{division}｜{title}</div>
          <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'4px' }}>{t.summaryNote}</div>
        </div>

        {/* ① 基本資料 */}
        <div style={card}>
          <div style={cardTitle}>{t.s1}</div>
          <div style={{ ...row, gridTemplateColumns:'1fr 1fr 1fr 1fr' }}>
            {([[t.birthDate, birthDate, setBirthDate, t.birthDatePh],
               [t.idNumber,  idNumber,  setIdNumber,  t.idPh],
               [t.birthplace,birthplace,setBirthplace,t.birthplacePh],
               [t.nationality,nationality,setNationality,''],
            ] as [string,string,(v:string)=>void,string][]).map(([l,v,fn,ph]) => (
              <div key={l}><label style={lbl}>{l}</label><input type="text" style={inp} value={v} onChange={e => fn(e.target.value)} placeholder={ph} /></div>
            ))}
          </div>
          <div style={{ ...row, gridTemplateColumns:'1fr 1fr 1fr 1fr' }}>
            <div><label style={lbl}>{t.bloodType}</label>
              <select style={sel} value={bloodType} onChange={e => setBloodType(e.target.value)}>
                <option value=''>—</option>{t.bloodTypes.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div><label style={lbl}>{t.gender}</label>
              <select style={sel} value={gender} onChange={e => setGender(e.target.value)}>
                <option value=''>—</option>{t.genders.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div><label style={lbl}>{t.maritalStatus}</label>
              <select style={sel} value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}>
                <option value=''>—</option>{t.maritalOptions.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>{lang === 'zh' ? '子女數' : 'Children'}</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {lang === 'zh' ? '兒子' : 'Sons'}
                  </label>
                  <input type="number" min="0" style={{ ...inp, width: '60px', textAlign: 'center' }}
                    value={sonsCount} onChange={e => setSonsCount(e.target.value)} placeholder="0" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {lang === 'zh' ? '女兒' : 'Daughters'}
                  </label>
                  <input type="number" min="0" style={{ ...inp, width: '60px', textAlign: 'center' }}
                    value={daughtersCount} onChange={e => setDaughtersCount(e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ② 聯絡資訊 */}
        <div style={card}>
          <div style={cardTitle}>{t.s2}</div>
          <div style={{ ...row, gridTemplateColumns:'1fr 1fr 1fr' }}>
            <div><label style={lbl}>{t.homePhone}</label><input type="text" style={inp} value={homePhone} onChange={e => setHomePhone(e.target.value)} /></div>
            <div><label style={lbl}>{t.mobile}</label><input type="text" style={inp} value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} /></div>
            <div><label style={lbl}>{t.email}</label><input type="email" style={inp} value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom:'10px' }}>
            <label style={lbl}>{t.permanentAddr}</label>
            <input type="text" style={inp} value={permanentAddr} onChange={e => setPermanentAddr(e.target.value)} />
          </div>
          <div>
            <label style={{ ...lbl, display:'flex', alignItems:'center', gap:'6px', cursor:'pointer' }}>
              <input type="checkbox" checked={sameAddress} onChange={e => setSameAddress(e.target.checked)} />
              {t.sameAddr}
            </label>
            {!sameAddress && (
              <div style={{ marginTop:'8px' }}>
                <label style={lbl}>{t.currentAddr}</label>
                <input type="text" style={inp} value={currentAddr} onChange={e => setCurrentAddr(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* ③ 學歷 — 直接 inline（避免 React remount）*/}
        <div style={card}>
          <div style={cardTitle}>{t.s3}</div>
          {education.map((e, i) => (
            <div key={i} style={{ border:'1px solid #e8e8e8', borderRadius:'6px', padding:'14px', marginBottom:'12px', background:'#fafafa' }}>
              {/* 就讀起 迄 */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr 2fr', gap:'10px', marginBottom:'10px' }}>
                <div>
                  <label style={lbl}>{t.eduFrom}</label>
                  <YearMonthSelect value={e.from} onChange={v => { const r=[...education]; r[i]={...r[i],from:v}; setEducation(r) }} inputStyle={sel} />
                </div>
                <div>
                  <label style={lbl}>{t.eduTo}</label>
                  <YearMonthSelect value={e.to} onChange={v => { const r=[...education]; r[i]={...r[i],to:v}; setEducation(r) }} inputStyle={sel} />
                </div>
                <div>
                  <label style={lbl}>{t.school}</label>
                  <input type="text" style={inp} value={e.school}
                    onChange={ev => { const r=[...education]; r[i]={...r[i],school:ev.target.value}; setEducation(r) }} />
                </div>
                <div>
                  <label style={lbl}>{t.dept}</label>
                  <input type="text" style={inp} value={e.dept}
                    onChange={ev => { const r=[...education]; r[i]={...r[i],dept:ev.target.value}; setEducation(r) }} />
                </div>
              </div>

              {/* 日夜 / 學制 / 畢業 */}
              <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 90px', gap:'10px', marginBottom: e.years === '其他' || (e.graduated !== '是' && e.graduated !== 'Yes') ? '10px' : '0' }}>
                <div>
                  <label style={lbl}>{t.dayNight}</label>
                  <select style={sel} value={e.dayNight}
                    onChange={ev => { const r=[...education]; r[i]={...r[i],dayNight:ev.target.value}; setEducation(r) }}>
                    {t.dayNightOpts.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>{t.years}</label>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <select style={{ ...sel, flex:1 }} value={e.years}
                      onChange={ev => { const r=[...education]; r[i]={...r[i],years:ev.target.value}; setEducation(r) }}>
                      <option value=''>—</option>
                      {(lang === 'zh' ? ['博士','碩士','學士','高中職','其他'] : ['PhD','Master','Bachelor','High School','Other']).map(v => <option key={v}>{v}</option>)}
                    </select>
                    {(e.years === '其他' || e.years === 'Other') && (
                      <input type="text" style={{ ...inp, flex:1 }} value={e.yearsCustom}
                        placeholder={lang === 'zh' ? '請說明' : 'Please specify'}
                        onChange={ev => { const r=[...education]; r[i]={...r[i],yearsCustom:ev.target.value}; setEducation(r) }} />
                    )}
                  </div>
                </div>
                <div>
                  <label style={lbl}>{t.graduated}</label>
                  <select style={sel} value={e.graduated}
                    onChange={ev => { const r=[...education]; r[i]={...r[i],graduated:ev.target.value}; setEducation(r) }}>
                    {t.graduatedOpts.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* 未畢業原因 */}
              {e.graduated !== '是' && e.graduated !== 'Yes' && e.graduated !== '' && (
                <div style={{ marginBottom:'6px' }}>
                  <label style={lbl}>{lang === 'zh' ? '未畢業原因' : 'Reason for Non-completion'}</label>
                  <input type="text" style={inp} value={e.graduationReason}
                    placeholder={lang === 'zh' ? '例：在學中、退學...' : 'e.g., currently enrolled, withdrew...'}
                    onChange={ev => { const r=[...education]; r[i]={...r[i],graduationReason:ev.target.value}; setEducation(r) }} />
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button type="button" onClick={() => setEducation(education.filter((_,j) => j !== i))} style={removeBtn}>{c.remove}</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setEducation([...education, newEdu()])} style={addBtn}>{t.addEdu}</button>
        </div>

        {/* ④ 工作經歷 — 直接 inline */}
        <div style={card}>
          <div style={cardTitle}>{t.s4}</div>
          {workHistory.map((w, i) => (
            <div key={i} style={{ border:'1px solid #e8e8e8', borderRadius:'6px', padding:'14px', marginBottom:'12px', background:'#fafafa' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr 1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                <div>
                  <label style={lbl}>{t.workFrom}</label>
                  <YearMonthSelect value={w.from} onChange={v => { const r=[...workHistory]; r[i]={...r[i],from:v}; setWorkHistory(r) }} inputStyle={sel} />
                </div>
                <div>
                  <label style={lbl}>{t.workTo}</label>
                  <YearMonthSelect value={w.to} onChange={v => { const r=[...workHistory]; r[i]={...r[i],to:v}; setWorkHistory(r) }} inputStyle={sel} />
                </div>
                <div>
                  <label style={lbl}>{t.company}</label>
                  <input type="text" style={inp} value={w.company}
                    onChange={ev => { const r=[...workHistory]; r[i]={...r[i],company:ev.target.value}; setWorkHistory(r) }} />
                </div>
                <div>
                  <label style={lbl}>{t.position}</label>
                  <input type="text" style={inp} value={w.position}
                    onChange={ev => { const r=[...workHistory]; r[i]={...r[i],position:ev.target.value}; setWorkHistory(r) }} />
                </div>
                <div>
                  <label style={lbl}>{t.salary}</label>
                  <input type="text" style={inp} value={w.salary}
                    onChange={ev => { const r=[...workHistory]; r[i]={...r[i],salary:ev.target.value}; setWorkHistory(r) }} />
                </div>
              </div>
              <div style={{ marginBottom:'6px' }}>
                <label style={lbl}>{t.reason}</label>
                <input type="text" style={inp} value={w.reason}
                  onChange={ev => { const r=[...workHistory]; r[i]={...r[i],reason:ev.target.value}; setWorkHistory(r) }} />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button type="button" onClick={() => setWorkHistory(workHistory.filter((_,j) => j !== i))} style={removeBtn}>{c.remove}</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setWorkHistory([...workHistory, newWork()])} style={addBtn}>{t.addWork}</button>
        </div>

        {/* ⑤ 語言能力 — inline */}
        <div style={card}>
          <div style={cardTitle}>{t.s5}</div>
          {langSkills.map((l, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'120px 1fr 1fr 1fr 1fr 36px', gap:'8px', alignItems:'end', marginBottom:'8px' }}>
              <div>
                <label style={lbl}>{t.lang}</label>
                <input type="text" style={inp} value={l.lang}
                  onChange={ev => { const r=[...langSkills]; r[i]={...r[i],lang:ev.target.value}; setLangSkills(r) }} />
              </div>
              {(['listen','speak','read','write'] as const).map((field, fi) => (
                <div key={field}>
                  <label style={lbl}>{[t.listen, t.speak, t.read, t.write][fi]}</label>
                  <select style={sel} value={l[field]}
                    onChange={ev => { const r=[...langSkills]; r[i]={...r[i],[field]:ev.target.value}; setLangSkills(r) }}>
                    {['1','2','3','4','5'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
              <button type="button" onClick={() => setLangSkills(langSkills.filter((_,j) => j !== i))} style={{ ...removeBtn, paddingBottom:'8px' }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setLangSkills([...langSkills, newLang()])} style={{ ...addBtn, width:'auto', padding:'7px 20px' }}>{t.addLang}</button>
        </div>

        {/* ⑥ 緊急聯絡人 */}
        <div style={card}>
          <div style={cardTitle}>{t.s6}</div>
          <div style={{ ...row, gridTemplateColumns:'2fr 1fr 2fr' }}>
            <div><label style={lbl}>{t.emergName}</label><input type="text" style={inp} value={emergName} onChange={e => setEmergName(e.target.value)} /></div>
            <div><label style={lbl}>{t.emergRel}</label><input type="text" style={inp} value={emergRel} onChange={e => setEmergRel(e.target.value)} placeholder={t.emergRelPh} /></div>
            <div><label style={lbl}>{t.emergPhone}</label><input type="text" style={inp} value={emergPhone} onChange={e => setEmergPhone(e.target.value)} /></div>
          </div>
        </div>

        {/* ⑦ 眷屬資料 — inline，現住地址有捷徑 */}
        <div style={card}>
          <div style={cardTitle}>{t.s7}</div>
          {familyMembers.map((f, i) => (
            <div key={i} style={{ border:'1px solid #e8e8e8', borderRadius:'6px', padding:'12px', marginBottom:'10px', background:'#fafafa' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 2fr', gap:'8px', marginBottom:'8px' }}>
                {([[ t.familyRel,'relation'],[t.familyName,'name'],[t.familyBirth,'birthDate'],[t.familyOcc,'occupation']] as [string, keyof FamilyRow][]).map(([label, field]) => (
                  <div key={field}>
                    <label style={lbl}>{label}</label>
                    <input type="text" style={inp} value={f[field]}
                      onChange={ev => { const r=[...familyMembers]; r[i]={...r[i],[field]:ev.target.value}; setFamilyMembers(r) }} />
                  </div>
                ))}
              </div>
              <div>
                <label style={lbl}>{t.familyAddr}</label>
                <AddressShortcuts permanentAddr={permanentAddr} currentAddr={effAddr} lang={lang}
                  onSelect={v => { const r=[...familyMembers]; r[i]={...r[i],address:v}; setFamilyMembers(r) }} />
                <input type="text" style={inp} value={f.address}
                  onChange={ev => { const r=[...familyMembers]; r[i]={...r[i],address:ev.target.value}; setFamilyMembers(r) }} />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'6px' }}>
                <button type="button" onClick={() => setFamilyMembers(familyMembers.filter((_,j) => j !== i))} style={removeBtn}>{c.remove}</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setFamilyMembers([...familyMembers, newFamily()])} style={addBtn}>{t.addFamily}</button>
        </div>

        {/* ⑧ 眷屬健保 */}
        <div style={card}>
          <div style={cardTitle}>{t.s8}</div>
          {nhiDeps.map((n, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 2fr 2fr 1fr 36px', gap:'8px', alignItems:'end', marginBottom:'8px' }}>
              {([[ t.nhiName,'name'],[t.nhiId,'idNumber'],[t.nhiBirth,'birthDate'],[t.nhiRel,'relation']] as [string, keyof NHIRow][]).map(([label, field]) => (
                <div key={field}>
                  <label style={lbl}>{label}</label>
                  <input type="text" style={inp} value={n[field]}
                    onChange={ev => { const r=[...nhiDeps]; r[i]={...r[i],[field]:ev.target.value}; setNHIDeps(r) }} />
                </div>
              ))}
              <button type="button" onClick={() => setNHIDeps(nhiDeps.filter((_,j) => j !== i))} style={{ ...removeBtn, paddingBottom:'10px', fontSize:'16px' }}>✕</button>
            </div>
          ))}
          {nhiDeps.length < 3 && (
            <button type="button" onClick={() => setNHIDeps([...nhiDeps, newNHI()])} style={{ ...addBtn, width:'auto', padding:'7px 20px' }}>{t.addNHI}</button>
          )}
        </div>

        {/* ⑨ 勞工退休金 */}
        <div style={card}>
          <div style={cardTitle}>{t.s9}</div>
          <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'12px' }}>{t.laborNote}</p>
          <div style={{ display:'flex', gap:'16px', marginBottom:'10px' }}>
            {([true, false] as const).map(val => (
              <label key={String(val)} style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'14px', padding:'9px 16px', background: laborSelf===val ? 'rgba(200,54,43,0.05)' : '#fafafa', border:`1.5px solid ${laborSelf===val ? 'var(--accent)' : 'var(--border)'}`, borderRadius:'var(--radius-md)' }}>
                <input type="radio" name="laborPension" checked={laborSelf===val} onChange={() => setLaborSelf(val)} style={{ accentColor:'var(--accent)' }} />
                {val ? t.laborYes : t.laborNo}
              </label>
            ))}
          </div>
          {laborSelf && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <label style={lbl}>{t.laborRate}</label>
              <select style={{ ...sel, width:'100px' }} value={laborRate} onChange={e => setLaborRate(e.target.value)}>
                <option value=''>—%</option>
                {['1','2','3','4','5','6'].map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ⑩ 扣繳方式 */}
        <div style={card}>
          <div style={cardTitle}>{t.s10}</div>
          <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'14px' }}>{t.withholdNote}</p>
          {[{ val:'1', label:t.w1label, desc:t.w1desc }, { val:'2', label:t.w2label, desc:t.w2desc }].map(o => (
            <label key={o.val} style={{ display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer', padding:'12px 16px', marginBottom:'8px', background: withholding===o.val ? 'rgba(200,54,43,0.05)' : '#fafafa', border:`1.5px solid ${withholding===o.val ? 'var(--accent)' : 'var(--border)'}`, borderRadius:'var(--radius-md)' }}>
              <input type="radio" name="withholding" checked={withholding===o.val} onChange={() => setWithholding(o.val)} style={{ accentColor:'var(--accent)', marginTop:'3px' }} />
              <div><div style={{ fontWeight:'600', fontSize:'14px', marginBottom:'2px' }}>{o.label}</div><div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{o.desc}</div></div>
            </label>
          ))}
        </div>

        {/* ⑪ 免稅人口 — inline，現住地址有捷徑 */}
        <div style={card}>
          <div style={cardTitle}>{t.s11}</div>
          <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'16px' }}>{t.taxNote}</p>
          {t.taxTypes.map(({ type, label }) => {
            const rows   = taxDeps.filter(dep => dep.type === type)
            const others = taxDeps.filter(dep => dep.type !== type)
            const colLabels = [t.taxName, t.taxRel, t.taxBirth, t.taxId]
            return (
              <div key={type} style={{ marginBottom:'20px' }}>
                <div style={{ fontSize:'13px', fontWeight:'600', marginBottom:'8px', color:'var(--text-secondary)' }}>{label}</div>
                {rows.map((dep, i) => (
                  <div key={i} style={{ border:'1px solid #e8e8e8', borderRadius:'6px', padding:'10px', marginBottom:'8px', background:'#fafafa' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'8px' }}>
                      {colLabels.map((colLabel, fi) => {
                        const fields = ['name','relation','birthDate','idNumber'] as (keyof TaxDepRow)[]
                        const field  = fields[fi]
                        return (
                          <div key={field}>
                            <label style={lbl}>{colLabel}</label>
                            <input type="text" style={inp} value={dep[field]}
                              onChange={ev => { const updated={...dep,[field]:ev.target.value}; setTaxDeps([...others, ...rows.map((r,j) => j===i ? updated : r)]) }} />
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ marginBottom:'6px' }}>
                      <label style={lbl}>{t.taxAddr}</label>
                      <AddressShortcuts permanentAddr={permanentAddr} currentAddr={effAddr} lang={lang}
                        onSelect={v => { const updated={...dep,address:v}; setTaxDeps([...others, ...rows.map((r,j) => j===i ? updated : r)]) }} />
                      <input type="text" style={inp} value={dep.address}
                        onChange={ev => { const updated={...dep,address:ev.target.value}; setTaxDeps([...others, ...rows.map((r,j) => j===i ? updated : r)]) }} />
                    </div>
                    <div>
                      <label style={lbl}>{t.taxCond}</label>
                      <input type="text" style={inp} value={dep.condition} placeholder={t.taxCondPh}
                        onChange={ev => { const updated={...dep,condition:ev.target.value}; setTaxDeps([...others, ...rows.map((r,j) => j===i ? updated : r)]) }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'4px' }}>
                      <button type="button" onClick={() => setTaxDeps([...others, ...rows.filter((_,j) => j !== i)])} style={removeBtn}>{c.remove}</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setTaxDeps([...taxDeps, newTax(type)])}
                  style={{ background:'none', border:'1px dashed var(--border)', borderRadius:'4px', padding:'6px 14px', cursor:'pointer', color:'var(--accent)', fontSize:'12px' }}>
                  ＋ {label}
                </button>
              </div>
            )
          })}
        </div>

        {/* ⑫ 個資同意 */}
        <div style={card}>
          <div style={cardTitle}>{t.s12}</div>
          <div style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.9, marginBottom:'16px', background:'var(--bg-secondary)', padding:'14px', borderRadius:'4px' }}>
            <p>{t.consentText}</p>
            <ol style={{ marginTop:'10px', paddingLeft:'20px' }}>
              {t.consentItems.map((item, i) => <li key={i}>{item}</li>)}
            </ol>
            <p style={{ marginTop:'10px' }}>{t.consentNote}</p>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', fontSize:'14px', padding:'12px 16px', background: consent ? 'rgba(45,138,78,0.06)' : '#fff', border:`2px solid ${consent ? 'var(--success)' : 'var(--border)'}`, borderRadius:'var(--radius-md)' }}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ accentColor:'var(--success)', width:'18px', height:'18px' }} />
            <span>{t.consentCheck}</span>
          </label>
        </div>

        {submitErr && (
          <div style={{ background:'var(--danger-bg)', border:'1px solid var(--danger)', color:'var(--danger)', padding:'10px 14px', borderRadius:'4px', fontSize:'13px', marginBottom:'12px' }}>
            {submitErr}
          </div>
        )}

        {/* 操作按鈕 */}
        <div style={{ display:'flex', gap:'12px', position:'sticky', bottom:'16px', zIndex:10 }}>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:'14px', background:'#fff', border:'1px solid var(--accent)', color:'var(--accent)', borderRadius:'6px', fontSize:'15px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(0,0,0,0.1)' }}>
            {saving ? c.saving : saveMsg || c.save}
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            style={{ flex:2, padding:'14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'6px', fontSize:'15px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(200,54,43,0.25)' }}>
            {saving ? c.submitting : c.submit}
          </button>
        </div>

        <div style={{ marginTop:'40px', paddingTop:'20px', borderTop:'1px solid var(--border)', color:'var(--text-muted)', fontSize:'12px', textAlign:'center' }}>
          {c.org}<br />{c.contactUs}
        </div>
      </div>
    </div>
  )
}
