// Email template configuration — stored in SystemConfig as JSON (key: 'email_template')

export interface EmailTemplateConfig {
  // ── 樣式 ──────────────────────────────────────────
  headerBg:        string  // 頁首背景色
  headerTextColor: string  // 頁首文字色
  bodyBg:          string  // 信件背景色
  sectionBg:       string  // 段落背景色
  textColor:       string  // 內文文字色
  headingColor:    string  // 段落標題色
  buttonBg:        string  // 按鈕背景色
  buttonText:      string  // 按鈕文字色
  linkColor:       string  // 連結色
  deadlineBoxBg:   string  // 截止提醒底色
  deadlineBoxBorder: string // 截止提醒左邊框色
  deadlineBoxText: string  // 截止提醒文字色
  bodyFontSize:    number  // 內文字型大小 (px)

  // ── 按鈕 ──────────────────────────────────────────
  buttonLabel:     string  // 按鈕文字
  buttonPosition:  'before-warning' | 'after-warning' | 'after-sec1'
  // before-warning: 截止提醒前
  // after-warning:  截止提醒後（預設）
  // after-sec1:     壹整段之後

  // ── 文字內容 ───────────────────────────────────────
  // 支援變數：{name} {department} {division} {title} {startDate} {deadlineStr}
  greetingLine: string       // 稱呼行
  introText:    string       // 錄取說明
  sec1Heading:  string
  sec1Warning:  string       // 截止提醒（支援 {deadlineStr}）
  sec1Body:     string       // 壹 正文
  sec2Heading:  string
  sec2Body:     string       // 貳 正文
  showSec2Attachments: boolean // 是否顯示附件下載連結
  sec3Heading:  string
  sec3Body:     string
  sec4Heading:  string
  sec4Body:     string
  sec5Heading:  string
  sec5Items:    string       // 每行一個項目
  footerText:   string
}

export const DEFAULT_TEMPLATE: EmailTemplateConfig = {
  headerBg:          '#c8362b',
  headerTextColor:   '#ffffff',
  bodyBg:            '#f5f5f5',
  sectionBg:         '#ffffff',
  textColor:         '#1a1a1a',
  headingColor:      '#1a1a1a',
  buttonBg:          '#c8362b',
  buttonText:        '#ffffff',
  linkColor:         '#c8362b',
  deadlineBoxBg:     '#fffbeb',
  deadlineBoxBorder: '#d97706',
  deadlineBoxText:   '#92400e',
  bodyFontSize:      14,

  buttonLabel:    '→ 開啟報到資料填寫頁面',
  buttonPosition: 'after-warning',

  greetingLine: '{name} 先生/女士，您好！',
  introText: '歡迎加入文化內容策進院。您已錄取本院 <strong>{department} {division} {title}</strong> 一職，到職日為 <strong>{startDate}</strong>，試用期為 3 個月。<br>依薪資保密原則，您的薪資已電話另行通知，錄用通知書另 e-mail 寄達。',

  sec1Heading: '壹、名片及電子信箱',
  sec1Warning: '⚠ 請於報到前五個工作天（<strong>{deadlineStr}</strong>前）提供以下資料並先回傳',
  sec1Body: '請點擊下方連結，填寫您的信箱名稱、英文姓名、名片手機設定及上傳照片：',

  sec2Heading: '貳、員工基本資料卡及其他',
  sec2Body: '檢附本院【員工基本資料卡】、【薪資扣繳選擇表及個資同意書】，<strong>請先填寫並貼上照片，於報到前五個工作天回傳</strong>，於報到當日簽章即可。',
  showSec2Attachments: true,

  sec3Heading: '參、薪轉戶',
  sec3Body: '本院薪轉銀行為<strong>國泰世華銀行</strong>，請於報到時一併繳交該銀行存摺封面影本（電子存摺或實體存摺皆可），作為薪轉使用。',

  sec4Heading: '肆、勞工一般體格檢查',
  sec4Body: '請於報到時繳交<strong>六個月內有效</strong>之【勞工一般體格檢查】報告一份，至本院行政管理處辦理報到作業。若有任何問題，可洽分機605江晶瑤專員或分機602陳佩芝組長。<br>認可醫療機構：<a href="https://hrpts.osha.gov.tw/asshp/hrpm1055.aspx" style="color:{linkColor}">https://hrpts.osha.gov.tw/asshp/hrpm1055.aspx</a>',

  sec5Heading: '伍、報到當日請攜帶',
  sec5Items: '身分證、戶口名簿（或戶籍謄本）\n最高學歷證書\n薪轉銀行存摺封面影本\n離職（服務）證明等正本（影印後發還）\n六個月內有效之【勞工一般體格檢查】報告一份',

  footerText: '陳佩芝｜Tel：+886-2-27458186#602｜Fax：+886-2-27492436｜Email：phyllis@taicca.tw<br>文化內容策進院｜行政管理處｜台北市105402松山區民生東路三段158號5樓',
}

interface RenderData {
  name: string
  department: string
  division: string
  title: string
  startDate: string
  deadlineStr: string
  onboardingUrl: string
  formsUrl: string      // 員工基本資料表單連結
  baseUrl: string
}

function sub(text: string, data: RenderData & { linkColor: string }): string {
  return text
    .replace(/{name}/g, data.name)
    .replace(/{department}/g, data.department)
    .replace(/{division}/g, data.division)
    .replace(/{title}/g, data.title)
    .replace(/{startDate}/g, data.startDate)
    .replace(/{deadlineStr}/g, data.deadlineStr)
    .replace(/{linkColor}/g, data.linkColor)
}

export function renderEmailHtml(cfg: EmailTemplateConfig, data: RenderData): string {
  const c = { ...data, linkColor: cfg.linkColor }
  const fs = cfg.bodyFontSize

  const sectionStyle = `background:${cfg.sectionBg};border-radius:4px;padding:20px 24px;margin-bottom:12px;`
  const h2Style = `font-size:16px;color:${cfg.headingColor};border-bottom:2px solid #e5e5e5;padding-bottom:8px;margin:0 0 14px;`
  const pStyle = `font-size:${fs}px;color:${cfg.textColor};margin:0 0 10px;line-height:1.8;`
  const deadlineStyle = `background:${cfg.deadlineBoxBg};border-left:4px solid ${cfg.deadlineBoxBorder};padding:10px 16px;margin:0 0 14px;border-radius:2px;font-size:${fs}px;color:${cfg.deadlineBoxText};`
  const btnStyle = `display:inline-block;background:${cfg.buttonBg};color:${cfg.buttonText};padding:13px 28px;text-decoration:none;font-weight:bold;border-radius:4px;font-size:15px;margin:4px 0 10px;`
  const attachStyle = `display:inline-block;border:1px solid ${cfg.buttonBg};color:${cfg.buttonBg};padding:7px 16px;text-decoration:none;font-size:13px;border-radius:3px;margin:4px 4px 0 0;`

  const button = `<a href="${data.onboardingUrl}" style="${btnStyle}">${cfg.buttonLabel}</a>`
  const formsButton = data.formsUrl
    ? `<a href="${data.formsUrl}" style="${btnStyle}background:#555555;">→ 填寫員工基本資料表單</a>`
    : ''
  const buttonGroup = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 10px;">${button}${formsButton}</div>`

  const attachLinks = cfg.showSec2Attachments ? `
    <div style="margin-top:12px;">
      <a href="${data.baseUrl}/attachments/%E5%93%A1%E5%B7%A5%E5%9F%BA%E6%9C%AC%E8%B3%87%E6%96%99%E5%8D%A1.docx" style="${attachStyle}">↓ 員工基本資料卡.docx</a>
      <a href="${data.baseUrl}/attachments/%E5%93%A1%E5%B7%A5%E8%96%AA%E8%B3%87%E6%89%A3%E7%B9%B3%E5%8F%8A%E5%80%8B%E8%B3%87%E5%90%8C%E6%84%8F%E6%9B%B8.docx" style="${attachStyle}">↓ 薪資扣繳及個資同意書.docx</a>
    </div>` : ''

  // 壹 section 按鈕位置
  const warning = `<div style="${deadlineStyle}">${sub(cfg.sec1Warning, c)}</div>`
  const sec1body = `<p style="${pStyle}">${sub(cfg.sec1Body, c)}</p>`

  let sec1Inner = ''
  if (cfg.buttonPosition === 'before-warning') {
    sec1Inner = buttonGroup + warning + sec1body
  } else if (cfg.buttonPosition === 'after-warning') {
    sec1Inner = warning + sec1body + buttonGroup
  } else {
    sec1Inner = warning + sec1body
  }

  const sec5Items = cfg.sec5Items.split('\n').filter(Boolean)
    .map(item => `<li style="margin-bottom:4px;font-size:${fs}px;">${sub(item, c)}</li>`).join('')

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:${cfg.bodyBg};font-family:'Microsoft JhengHei',sans-serif;">
  <!-- Header -->
  <div style="background:${cfg.headerBg};padding:20px 32px;">
    <div style="max-width:640px;margin:0 auto;">
      <p style="margin:0;font-size:11px;color:${cfg.headerTextColor};opacity:.75;letter-spacing:.15em;">TAIWAN CREATIVE CONTENT AGENCY</p>
      <h1 style="margin:4px 0 0;font-size:18px;color:${cfg.headerTextColor};font-weight:600;">文化內容策進院 — 新人報到通知</h1>
    </div>
  </div>

  <!-- Body -->
  <div style="max-width:640px;margin:0 auto;padding:28px 24px 40px;">
    <p style="font-size:17px;color:${cfg.textColor};margin:0 0 16px;font-weight:600;">${sub(cfg.greetingLine, c)}</p>
    <p style="${pStyle}">${sub(cfg.introText, c)}</p>

    <!-- 壹 -->
    <div style="${sectionStyle}">
      <h2 style="${h2Style}">${sub(cfg.sec1Heading, c)}</h2>
      ${sec1Inner}
    </div>

    ${cfg.buttonPosition === 'after-sec1' ? `<div style="margin:8px 0 16px;">${buttonGroup}</div>` : ''}

    <!-- 貳 -->
    <div style="${sectionStyle}">
      <h2 style="${h2Style}">${sub(cfg.sec2Heading, c)}</h2>
      <p style="${pStyle}">${sub(cfg.sec2Body, c)}</p>
      ${attachLinks}
    </div>

    <!-- 參 -->
    <div style="${sectionStyle}">
      <h2 style="${h2Style}">${sub(cfg.sec3Heading, c)}</h2>
      <p style="${pStyle}">${sub(cfg.sec3Body, c)}</p>
    </div>

    <!-- 肆 -->
    <div style="${sectionStyle}">
      <h2 style="${h2Style}">${sub(cfg.sec4Heading, c)}</h2>
      <p style="${pStyle}">${sub(cfg.sec4Body, c)}</p>
    </div>

    <!-- 伍 -->
    <div style="${sectionStyle}">
      <h2 style="${h2Style}">${sub(cfg.sec5Heading, c)}</h2>
      <p style="font-size:${fs}px;color:${cfg.textColor};margin:0 0 8px;">請於報到當日<strong>上午 9 點整</strong>攜帶：</p>
      <ul style="margin:0;padding-left:20px;">${sec5Items}</ul>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f0f0f0;padding:16px 32px;">
    <div style="max-width:640px;margin:0 auto;font-size:12px;color:#777;line-height:1.8;">
      ${sub(cfg.footerText, c)}
    </div>
  </div>
</body></html>`
}
