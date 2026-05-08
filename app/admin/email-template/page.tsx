'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { DEFAULT_TEMPLATE, EmailTemplateConfig } from '@/lib/email-template'

// ─── 小元件 ───────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{children}</div>
)

const ColorRow = ({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
    <span style={{ fontSize: '13px', color: '#444' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '36px', height: '28px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', padding: '1px' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value) }}
        style={{ width: '80px', padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
      />
    </div>
  </div>
)

const TextArea = ({
  label, value, onChange, rows = 3, hint,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) => (
  <div style={{ marginBottom: '14px' }}>
    <Label>{label}</Label>
    {hint && <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>{hint}</div>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      style={{
        width: '100%', padding: '8px 10px', border: '1px solid #ddd',
        borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit',
        resize: 'vertical', lineHeight: 1.6,
      }}
    />
  </div>
)

const TextInput = ({
  label, value, onChange, hint,
}: { label: string; value: string; onChange: (v: string) => void; hint?: string }) => (
  <div style={{ marginBottom: '12px' }}>
    <Label>{label}</Label>
    {hint && <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>{hint}</div>}
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
    />
  </div>
)

// ─── 分頁標籤 ─────────────────────────────────────────
const TABS = ['樣式', '按鈕', '壹', '貳', '參～伍', '頁首頁尾'] as const
type Tab = typeof TABS[number]

// ─── 主頁面 ───────────────────────────────────────────
export default function EmailTemplatePage() {
  const [cfg, setCfg] = useState<EmailTemplateConfig>(DEFAULT_TEMPLATE)
  const [tab, setTab] = useState<Tab>('樣式')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = <K extends keyof EmailTemplateConfig>(key: K, value: EmailTemplateConfig[K]) =>
    setCfg((prev) => ({ ...prev, [key]: value }))

  // 載入已儲存的模板
  useEffect(() => {
    fetch('/api/admin/email-template').then((r) => r.json()).then(setCfg)
  }, [])

  // 即時預覽（debounce 800ms）
  const refreshPreview = useCallback((template: EmailTemplateConfig) => {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setPreviewLoading(true)
    previewTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/email-template', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template }),
        })
        setPreviewHtml(await res.text())
      } finally { setPreviewLoading(false) }
    }, 800)
  }, [])

  useEffect(() => { refreshPreview(cfg) }, [cfg, refreshPreview])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/admin/email-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleReset() {
    if (!confirm('確定要還原為預設模板？')) return
    await fetch('/api/admin/email-template', { method: 'DELETE' })
    setCfg(DEFAULT_TEMPLATE)
  }

  // ── 各分頁內容 ────────────────────────────────────
  const panelContent: Record<Tab, React.ReactNode> = {
    '樣式': (
      <div>
        <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '14px' }}>頁首</div>
        <ColorRow label="頁首背景色" value={cfg.headerBg} onChange={(v) => set('headerBg', v)} />
        <ColorRow label="頁首文字色" value={cfg.headerTextColor} onChange={(v) => set('headerTextColor', v)} />

        <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', margin: '16px 0 14px' }}>信件主體</div>
        <ColorRow label="信件背景色" value={cfg.bodyBg} onChange={(v) => set('bodyBg', v)} />
        <ColorRow label="段落底色" value={cfg.sectionBg} onChange={(v) => set('sectionBg', v)} />
        <ColorRow label="內文文字色" value={cfg.textColor} onChange={(v) => set('textColor', v)} />
        <ColorRow label="段落標題色" value={cfg.headingColor} onChange={(v) => set('headingColor', v)} />
        <ColorRow label="連結色" value={cfg.linkColor} onChange={(v) => set('linkColor', v)} />

        <div style={{ marginBottom: '12px' }}>
          <Label>內文字型大小 (px)</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="range" min={12} max={18} value={cfg.bodyFontSize}
              onChange={(e) => set('bodyFontSize', Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '30px' }}>{cfg.bodyFontSize}px</span>
          </div>
        </div>

        <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', margin: '16px 0 14px' }}>截止提醒框</div>
        <ColorRow label="底色" value={cfg.deadlineBoxBg} onChange={(v) => set('deadlineBoxBg', v)} />
        <ColorRow label="左邊框色" value={cfg.deadlineBoxBorder} onChange={(v) => set('deadlineBoxBorder', v)} />
        <ColorRow label="文字色" value={cfg.deadlineBoxText} onChange={(v) => set('deadlineBoxText', v)} />
      </div>
    ),

    '按鈕': (
      <div>
        <ColorRow label="按鈕背景色" value={cfg.buttonBg} onChange={(v) => set('buttonBg', v)} />
        <ColorRow label="按鈕文字色" value={cfg.buttonText} onChange={(v) => set('buttonText', v)} />
        <TextInput label="按鈕文字" value={cfg.buttonLabel} onChange={(v) => set('buttonLabel', v)} />

        <div style={{ marginBottom: '12px' }}>
          <Label>按鈕位置（在「壹、名片及電子信箱」中）</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {([
              { value: 'before-warning', label: '截止提醒之前' },
              { value: 'after-warning', label: '截止提醒之後（預設）' },
              { value: 'after-sec1', label: '「壹」整段之後' },
            ] as const).map(({ value, label }) => (
              <label key={value} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 12px', cursor: 'pointer', fontSize: '13px',
                background: cfg.buttonPosition === value ? 'rgba(200,54,43,0.06)' : '#f9f9f9',
                border: `1px solid ${cfg.buttonPosition === value ? 'var(--accent)' : '#e5e5e5'}`,
                borderRadius: '4px',
              }}>
                <input
                  type="radio" name="btnPos" value={value}
                  checked={cfg.buttonPosition === value}
                  onChange={() => set('buttonPosition', value)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>
    ),

    '壹': (
      <div>
        <TextInput label="段落標題" value={cfg.sec1Heading} onChange={(v) => set('sec1Heading', v)} />
        <TextArea
          label="截止提醒文字"
          value={cfg.sec1Warning}
          onChange={(v) => set('sec1Warning', v)}
          rows={2}
          hint="可用 {deadlineStr} 代入截止日期"
        />
        <TextArea
          label="說明文字（按鈕上方）"
          value={cfg.sec1Body}
          onChange={(v) => set('sec1Body', v)}
          rows={3}
        />
      </div>
    ),

    '貳': (
      <div>
        <TextInput label="段落標題" value={cfg.sec2Heading} onChange={(v) => set('sec2Heading', v)} />
        <TextArea
          label="說明文字"
          value={cfg.sec2Body}
          onChange={(v) => set('sec2Body', v)}
          rows={4}
          hint="支援 HTML 標籤，如 <strong>"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', marginTop: '4px' }}>
          <input
            type="checkbox"
            checked={cfg.showSec2Attachments}
            onChange={(e) => set('showSec2Attachments', e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          顯示附件下載連結（員工基本資料卡、薪資扣繳同意書）
        </label>
      </div>
    ),

    '參～伍': (
      <div>
        <TextInput label="參、標題" value={cfg.sec3Heading} onChange={(v) => set('sec3Heading', v)} />
        <TextArea label="參、內容" value={cfg.sec3Body} onChange={(v) => set('sec3Body', v)} rows={3} />
        <TextInput label="肆、標題" value={cfg.sec4Heading} onChange={(v) => set('sec4Heading', v)} />
        <TextArea label="肆、內容" value={cfg.sec4Body} onChange={(v) => set('sec4Body', v)} rows={4} hint="支援 HTML 標籤" />
        <TextInput label="伍、標題" value={cfg.sec5Heading} onChange={(v) => set('sec5Heading', v)} />
        <TextArea
          label="伍、項目清單"
          value={cfg.sec5Items}
          onChange={(v) => set('sec5Items', v)}
          rows={6}
          hint="每行一個項目"
        />
      </div>
    ),

    '頁首頁尾': (
      <div>
        <TextArea
          label="開頭稱呼"
          value={cfg.greetingLine}
          onChange={(v) => set('greetingLine', v)}
          rows={2}
          hint="{name} = 新人姓名"
        />
        <TextArea
          label="錄取說明文字"
          value={cfg.introText}
          onChange={(v) => set('introText', v)}
          rows={4}
          hint="{department} {division} {title} {startDate} — 支援 HTML 標籤"
        />
        <TextArea
          label="頁尾文字"
          value={cfg.footerText}
          onChange={(v) => set('footerText', v)}
          rows={3}
          hint="支援 HTML 標籤（如 <br>）"
        />
      </div>
    ),
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden', margin: '-32px' }}>

      {/* ── 左側編輯器 ── */}
      <div style={{
        width: '360px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: '#fff',
      }}>
        {/* 標題列 */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>信件模板編輯</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>右側即時預覽</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '6px 12px', background: '#fff', border: '1px solid #ddd',
                borderRadius: '4px', fontSize: '12px', cursor: 'pointer', color: '#777',
              }}
            >還原預設</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '6px 16px', background: saved ? 'var(--success)' : 'var(--accent)',
                border: 'none', borderRadius: '4px', fontSize: '13px',
                fontWeight: '600', color: '#fff', cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存'}
            </button>
          </div>
        </div>

        {/* 分頁 */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
        }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '9px 14px', border: 'none', background: 'none',
                fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
                color: tab === t ? 'var(--accent)' : '#666',
                borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                transition: 'all 150ms',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 分頁內容 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {panelContent[tab]}
        </div>
      </div>

      {/* ── 右側預覽 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e8e8e8', overflow: 'hidden' }}>
        <div style={{
          padding: '10px 16px', background: '#fff', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '13px', color: '#666' }}>預覽（示例資料）</span>
          {previewLoading && (
            <span style={{ fontSize: '12px', color: '#999' }}>更新中...</span>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <div style={{
            maxWidth: '680px', margin: '0 auto',
            boxShadow: '0 2px 20px rgba(0,0,0,0.12)',
            borderRadius: '4px', overflow: 'hidden',
          }}>
            <iframe
              srcDoc={previewHtml}
              style={{ width: '100%', border: 'none', minHeight: '800px', display: 'block' }}
              title="email-preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
