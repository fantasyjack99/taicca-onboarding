#!/usr/bin/env python3
"""
Prepares docxtemplater-ready templates from the original TAICCA form .docx files.
Run once: python3 scripts/prepare-templates.py
"""
import zipfile, shutil, re, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL  = os.path.join(BASE, 'public', 'templates')

def read_docx_xml(path):
    with zipfile.ZipFile(path, 'r') as z:
        return z.read('word/document.xml').decode('utf-8')

def write_docx_xml(src, dst, xml):
    with zipfile.ZipFile(src, 'r') as zin, \
         zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = xml.encode('utf-8') if item.filename == 'word/document.xml' else zin.read(item.filename)
            zout.writestr(item, data)

def make_run(text):
    return f'<w:r><w:t xml:space="preserve">{text}</w:t></w:r>'

def get_tables(xml):
    return re.findall(r'(<w:tbl>.*?</w:tbl>)', xml, re.DOTALL)

def get_rows(xml):
    return re.findall(r'(<w:tr\b[^>]*>.*?</w:tr>)', xml, re.DOTALL)

def get_cells(row_xml):
    return re.findall(r'(<w:tc>.*?</w:tc>)', row_xml, re.DOTALL)

def has_vmerge(cell_xml):
    """Check if this cell is a vertical merge continuation (no content)."""
    return bool(re.search(r'<w:vMerge/>', cell_xml) or
                re.search(r'<w:vMerge\s*w:val="(?!restart)', cell_xml))

def set_cell_text(cell_xml, text, align='left'):
    """Replace ALL paragraphs in a cell with a single paragraph containing text."""
    tcpr_m = re.search(r'(<w:tcPr\b[^>]*>.*?</w:tcPr>)', cell_xml, re.DOTALL)
    tcpr = tcpr_m.group(1) if tcpr_m else ''
    ppr = f'<w:pPr><w:jc w:val="{align}"/></w:pPr>'
    new_para = f'<w:p>{ppr}<w:r><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'
    return f'<w:tc>{tcpr}{new_para}</w:tc>'

def replace_cell(row_xml, cell_idx, text):
    """Replace a specific cell in a row with placeholder text, skipping vMerge cells."""
    cells = get_cells(row_xml)
    if cell_idx >= len(cells):
        return row_xml
    old = cells[cell_idx]
    if has_vmerge(old):
        return row_xml  # skip vMerge continuation cells
    new = set_cell_text(old, text)
    return row_xml.replace(old, new, 1)

def replace_row(table_xml, old_row, new_row):
    return table_xml.replace(old_row, new_row, 1)

def merge_row_cells_to_one(row_xml, start_cell, end_cell, placeholder, align='left'):
    """Merge cells[start_cell..end_cell] into one cell with combined gridSpan."""
    cells = get_cells(row_xml)
    end_cell = min(end_cell, len(cells) - 1)
    total_gs = sum(
        int(re.search(r'<w:gridSpan w:val="(\d+)"', c).group(1))
        if re.search(r'<w:gridSpan w:val="(\d+)"', c) else 1
        for c in cells[start_cell:end_cell + 1]
    )
    first = cells[start_cell]
    tcpr_m = re.search(r'(<w:tcPr\b[^>]*>.*?</w:tcPr>)', first, re.DOTALL)
    tcpr = tcpr_m.group(1) if tcpr_m else '<w:tcPr></w:tcPr>'
    if '<w:gridSpan' in tcpr:
        tcpr = re.sub(r'<w:gridSpan w:val="\d+"/>', f'<w:gridSpan w:val="{total_gs}"/>', tcpr)
    else:
        tcpr = tcpr.replace('</w:tcPr>', f'<w:gridSpan w:val="{total_gs}"/></w:tcPr>')
    # Remove noWrap if present; add it to prevent wrapping
    tcpr = re.sub(r'<w:noWrap/>', '', tcpr)
    tcpr = tcpr.replace('</w:tcPr>', '<w:noWrap/></w:tcPr>')
    new_cell = (f'<w:tc>{tcpr}'
                f'<w:p><w:pPr><w:jc w:val="{align}"/></w:pPr>'
                f'<w:r><w:t xml:space="preserve">{placeholder}</w:t></w:r></w:p></w:tc>')
    old_xml = ''.join(cells[start_cell:end_cell + 1])
    return row_xml.replace(old_xml, new_cell, 1)

def remove_trailing_blank_pages(xml):
    """移除文件末尾造成空白頁的多餘段落（保留最後一個段落）。"""
    # 找到所有段落
    paras = re.findall(r'(<w:p\b[^>]*>.*?</w:p>)', xml, re.DOTALL)
    if not paras:
        return xml
    # 從末尾往前找連續空白段落
    blank = re.compile(r'<w:p\b[^>]*>\s*(?:<w:pPr\b[^>]*>.*?</w:pPr>)?\s*</w:p>', re.DOTALL)
    # 刪除末尾的空白段落（只保留最後一個，以免破壞格式）
    i = len(paras) - 1
    to_remove = []
    while i > 0 and blank.fullmatch(paras[i].strip()):
        to_remove.append(paras[i])
        i -= 1
    for para in to_remove[:-1]:  # 保留最後一個空白段落
        xml = xml.replace(para, '', 1)
    return xml

# ═══════════════════════════════════════════════════════════
# 員工基本資料卡
# ═══════════════════════════════════════════════════════════
def prepare_basic_info():
    src = os.path.join(TPL, 'basic-info-source.docx')
    dst = os.path.join(TPL, 'basic-info.docx')
    xml = read_docx_xml(src)

    # ── 頁首段落：員工編號 和 到職日 ──────────────────────
    # para[3] 包含 "員工編號 EMPLOYEE NUMBER: ... 到職日期ONBOARD DATE: ... 年 ... 月 ... 日"
    # 找到 ":" 後的第一個空白 run，插入 {employeeId}
    # 找到日期段 "年...月...日"，替換成 {startDateY}年{startDateM}月{startDateD}日
    def add_header_placeholders(xml):
        # 員工編號：找到 ':' 後面 tab+空格的 run，把空格替換成 {employeeId}
        # 結構：...:<w:t>:</w:t></w:r><w:r>...<w:tab/></w:r><w:r>...<w:tab/><w:t>       </w:t></w:r>
        xml = re.sub(
            r'(NUMBER</w:t></w:r>(?:.*?)<w:t>:)(</w:t></w:r>)'
            r'((?:.*?)<w:tab/></w:r>)'
            r'((?:.*?)<w:tab/><w:t xml:space="preserve">)\s+(</w:t></w:r>)',
            r'\1\2\3\4{employeeId}\5',
            xml, count=1, flags=re.DOTALL
        )
        # 日期
        xml = re.sub(r'(<w:t[^>]*>)\s+年\s*(</w:t>)', r'\1{startDateY}年\2', xml)
        xml = re.sub(r'(<w:t[^>]*>)\s+月\s*(</w:t>)', r'\1{startDateM}月\2', xml)
        xml = re.sub(r'(<w:t[^>]*>)\s+日(</w:t>)',    r'\1{startDateD}日\2', xml)
        return xml

    xml = add_header_placeholders(xml)
    tables = get_tables(xml)

    # ── Table 1: 基本資料 / 學歷 / 經歷 ──────────────────
    t1_orig = tables[0]
    t1 = t1_orig
    rows = get_rows(t1)

    def edit_row(idx, edits):
        """edits: list of (cell_idx, placeholder_text)"""
        nonlocal t1
        r = rows[idx]; nr = r
        for ci, ph in edits:
            nr = replace_cell(nr, ci, ph)
        t1 = replace_row(t1, r, nr)

    # Row 1 (基本 row 2): 中文姓名 | 英文護照全名
    edit_row(1, [(2, '{nameChinese}'), (4, '{nameEnglishFull}')])
    # Row 2: 英文別名 | 出生年/月/日
    # cell[2]=英文名, cell[6]=年(空白格,在'民國'後), cell[8]=月(空白格), cell[10]=日(空白格)
    edit_row(2, [(2, '{nameEnglishAlt}'), (6, '{birthYear}'), (8, '{birthMonth}'), (10, '{birthDay}')])
    # Row 3: 身分證 | 出生地 | 國籍
    edit_row(3, [(1, '{idNumber}'), (3, '{birthplace}'), (5, '{nationality}')])
    # Row 4: 血型 | 性別 | 婚姻
    edit_row(4, [(1, '{bloodType}'), (3, '{genderText}'), (5, '{maritalText}')])
    # Row 5: 子/女 人數
    edit_row(5, [(6, '{sonsCount}'), (8, '{daughtersCount}')])
    # Row 6: 電話 | email
    edit_row(6, [(2, '{contactPhone}'), (4, '{email}')])
    # Row 7: 戶籍地址 — 合併 cells[2..10] 為單一寬格（靠左不換行）
    # 原 cells[2..10] 的 gridSpan 加總 = 34
    r7 = rows[7]
    new_r7 = merge_row_cells_to_one(r7, 2, 10, '{permanentAddress}', 'left')
    t1 = replace_row(t1, r7, new_r7)
    rows = get_rows(t1)  # refresh after structural change
    # Row 8: 地址第二行 (路,街)/段/巷/弄/號/樓之 — 全部清空
    edit_row(8, [(4, ''), (6, ''), (8, ''), (10, ''), (12, ''), (14, '')])
    # Row 9: 通訊地址
    edit_row(9, [(2, '{currentAddress}')])

    # Education:
    # Row 12 = sub-header (年Y|月M labels) + vMerge for school cols → keep as is
    # Rows 13-15 = 3 actual data rows (all 9 cells usable)
    edu_ph = [
        ('{eduFromY1}','{eduFromM1}','{eduToY1}','{eduToM1}','{eduSchool1}','{eduDept1}','{eduDayNight1}','{eduYears1}','{eduGrad1}'),
        ('{eduFromY2}','{eduFromM2}','{eduToY2}','{eduToM2}','{eduSchool2}','{eduDept2}','{eduDayNight2}','{eduYears2}','{eduGrad2}'),
        ('{eduFromY3}','{eduFromM3}','{eduToY3}','{eduToM3}','{eduSchool3}','{eduDept3}','{eduDayNight3}','{eduYears3}','{eduGrad3}'),
    ]
    for ei, ph in enumerate(edu_ph):
        if 13 + ei < len(rows):
            edit_row(13 + ei, [(i, ph[i]) for i in range(9)])

    # Work:
    # Row 18 = sub-header (年Y|月M labels) + vMerge → keep as is
    # Rows 19-23 = 5 actual data rows (all 8 cells usable)
    wk_ph = [
        ('{wkFromY1}','{wkFromM1}','{wkToY1}','{wkToM1}','{wkCompany1}','{wkPosition1}','{wkSalary1}','{wkReason1}'),
        ('{wkFromY2}','{wkFromM2}','{wkToY2}','{wkToM2}','{wkCompany2}','{wkPosition2}','{wkSalary2}','{wkReason2}'),
        ('{wkFromY3}','{wkFromM3}','{wkToY3}','{wkToM3}','{wkCompany3}','{wkPosition3}','{wkSalary3}','{wkReason3}'),
        ('{wkFromY4}','{wkFromM4}','{wkToY4}','{wkToM4}','{wkCompany4}','{wkPosition4}','{wkSalary4}','{wkReason4}'),
        ('{wkFromY5}','{wkFromM5}','{wkToY5}','{wkToM5}','{wkCompany5}','{wkPosition5}','{wkSalary5}','{wkReason5}'),
    ]
    for wi, ph in enumerate(wk_ph):
        if 19 + wi < len(rows):
            edit_row(19 + wi, [(i, ph[i]) for i in range(8)])

    xml = xml.replace(t1_orig, t1, 1)

    # ── Table 2: 語言 / 緊急 / 家庭 / NHI / 勞退 ─────────
    t2_orig = tables[1]
    t2 = t2_orig
    rows2 = get_rows(t2)

    def edit_row2(idx, edits):
        nonlocal t2
        r = rows2[idx]; nr = r
        for ci, ph in edits:
            nr = replace_cell(nr, ci, ph)
        t2 = replace_row(t2, r, nr)

    # Language rows: index 2-5
    for li in range(4):
        edit_row2(2 + li, [
            (0, f'{{langName{li+1}}}'), (1, f'{{langListen{li+1}}}'),
            (2, f'{{langSpeak{li+1}}}'), (3, f'{{langRead{li+1}}}'),
            (4, f'{{langWrite{li+1}}}'),
        ])

    # Emergency contact row: index 7
    edit_row2(7, [(1, '{emergName}'), (3, '{emergRelation}'), (5, '{emergPhone}')])

    # Family rows: index 10-14
    for fi in range(5):
        edit_row2(10 + fi, [
            (0, f'{{famRel{fi+1}}}'), (1, f'{{famName{fi+1}}}'),
            (2, f'{{famBirth{fi+1}}}'), (3, f'{{famOcc{fi+1}}}'),
            (4, f'{{famAddr{fi+1}}}'),
        ])

    # NHI dependents: 3 × 4 fields, rows 17-30
    # Dep 1: row 17 (name), 18 (id), 19 (birth), 20 (rel)
    for di in range(3):
        base = 17 + di * 5
        for fi, ph in enumerate(['Name', 'Id', 'Birth', 'Rel']):
            if base + fi < len(rows2):
                edit_row2(base + fi, [(2, f'{{nhi{di+1}{ph}}}')])

    # Labor pension row: index 32
    if 32 < len(rows2):
        edit_row2(32, [(2, '{laborPensionText}')])

    xml = xml.replace(t2_orig, t2, 1)
    xml = remove_trailing_blank_pages(xml)
    write_docx_xml(src, dst, xml)
    print('✓ basic-info.docx prepared')

# ═══════════════════════════════════════════════════════════
# 薪資扣繳選擇表及個資同意書
# ═══════════════════════════════════════════════════════════
def prepare_withholding():
    src = os.path.join(TPL, 'withholding-source.docx')
    dst = os.path.join(TPL, 'withholding.docx')
    xml = read_docx_xml(src)

    # 移除強制分頁符號（造成空白頁的根本原因）
    xml = re.sub(r'<w:br\s+w:type="page"\s*/>', '', xml)
    tables = get_tables(xml)

    # Table 1: top info (name, employee no, ID)
    t1_orig = tables[0]
    t1 = t1_orig
    rows1 = get_rows(t1)

    def edit1(idx, edits):
        nonlocal t1
        r = rows1[idx]; nr = r
        for ci, ph in edits:
            nr = replace_cell(nr, ci, ph)
        t1 = replace_row(t1, r, nr)

    # ── Table 1: 基本資訊 ────────────────────────────────
    edit1(0, [(1, '{nameChinese}'), (3, '{nameEnglish}')])
    edit1(1, [(1, '{employeeId}'), (3, '{idNumber}')])
    edit1(3, [(1, '{sigDate}')])
    xml = xml.replace(t1_orig, t1, 1)

    # ── Table 2: 薪資受領人（本人 + 配偶）────────────────
    # 結構：每位身分證數字各佔一格
    # r0: cell[2]=姓名, cell[4]=出生年(gs=2), cell[6-10]=身分證前5碼, cell[12]=住址
    # r1: cell[4]=月, cell[5]=日, cell[7-11]=身分證後5碼
    # r2: 配偶 cell[2]=姓名, cell[4]=出生年, cell[6-10]=身分證前5碼, cell[12]=住址
    # r3: 配偶 cell[4]=月, cell[5]=日, cell[7-11]=身分證後5碼
    if len(tables) > 1:
        t2_orig = tables[1]
        t2 = t2_orig
        rows2 = get_rows(t2)

        def edit2(idx, edits):
            nonlocal t2
            r = rows2[idx]; nr = r
            for ci, ph in edits:
                nr = replace_cell(nr, ci, ph)
            t2 = replace_row(t2, r, nr)

        # 本人 row 0
        edit2(0, [
            (2, '{selfName}'),
            (4, '{selfBY}'),
            (6, '{selfId1}'), (7, '{selfId2}'), (8, '{selfId3}'), (9, '{selfId4}'), (10, '{selfId5}'),
            (12, '{selfAddr}'),
        ])
        # 本人 row 1（月/日 + 後5碼）
        edit2(1, [
            (4, '{selfBM}'), (5, '{selfBD}'),
            (7, '{selfId6}'), (8, '{selfId7}'), (9, '{selfId8}'), (10, '{selfId9}'), (11, '{selfId10}'),
        ])
        # 配偶 row 2
        edit2(2, [
            (2, '{spouseName}'),
            (4, '{spouseBY}'),
            (6, '{spouseId1}'), (7, '{spouseId2}'), (8, '{spouseId3}'), (9, '{spouseId4}'), (10, '{spouseId5}'),
            (12, '{spouseAddr}'),
        ])
        # 配偶 row 3
        edit2(3, [
            (4, '{spouseBM}'), (5, '{spouseBD}'),
            (7, '{spouseId6}'), (8, '{spouseId7}'), (9, '{spouseId8}'), (10, '{spouseId9}'), (11, '{spouseId10}'),
        ])
        xml = xml.replace(t2_orig, t2, 1)

    # ── Table 3: 直系尊親屬（5列）───────────────────────
    # 每列 15 cells: [0]=姓名,[1]=稱謂,[2]=出生日期,[3-12]=身分證10碼,[13]=住址,[14]=條件
    if len(tables) > 2:
        t3_orig = tables[2]
        t3 = t3_orig
        rows3 = get_rows(t3)

        def edit3(idx, prefix):
            nonlocal t3
            r = rows3[idx]; nr = r
            edits = [(0, f'{{{prefix}Name}}'), (1, f'{{{prefix}Rel}}'), (2, f'{{{prefix}Birth}}')]
            for d in range(10):
                edits.append((3 + d, f'{{{prefix}Id{d+1}}}'))
            edits += [(13, f'{{{prefix}Addr}}'), (14, f'{{{prefix}Cond}}')]
            for ci, ph in edits:
                nr = replace_cell(nr, ci, ph)
            t3 = replace_row(t3, r, nr)

        for i in range(min(5, len(rows3) - 1)):
            edit3(1 + i, f'anc{i+1}')
        xml = xml.replace(t3_orig, t3, 1)

    # ── Tables 4-6: 子女/兄弟姊妹/其他（兩欄格式）────────
    # 每列有左右兩組：左 cells[0-13]，右 cells[14-27]
    # 格式：[0]=姓名,[1]=稱謂,[2]=生年月日,[3-12]=身分證10碼,[13]=條件
    exemption_tables = [
        (3, 'chi', 'sib'),   # Table 4: 子女(左) + 兄弟姊妹(右)
        (4, 'oth', 'xtr'),   # Table 5: 其他(左+右)
        (5, 'xtr2', 'xtr3'), # Table 6: 繼續
    ]
    for tbl_idx, left_prefix, right_prefix in exemption_tables:
        if len(tables) > tbl_idx:
            t_orig = tables[tbl_idx]
            t = t_orig
            t_rows = get_rows(t)

            def edit_exempt(idx, lp, rp):
                nonlocal t
                r = t_rows[idx]; nr = r
                cells = re.findall(r'(<w:tc>.*?</w:tc>)', r, re.DOTALL)
                # 左欄：cells 0-13
                le = [(0, f'{{{lp}Name}}'), (1, f'{{{lp}Rel}}'), (2, f'{{{lp}Birth}}')]
                for d in range(10):
                    le.append((3 + d, f'{{{lp}Id{d+1}}}'))
                le.append((13, f'{{{lp}Cond}}'))
                # 右欄：cells 14-27
                re_edits = [(14, f'{{{rp}Name}}'), (15, f'{{{rp}Rel}}'), (16, f'{{{rp}Birth}}')]
                for d in range(10):
                    re_edits.append((17 + d, f'{{{rp}Id{d+1}}}'))
                re_edits.append((27, f'{{{rp}Cond}}'))
                for ci, ph in le + re_edits:
                    nr = replace_cell(nr, ci, ph)
                t = replace_row(t, r, nr)

            for i in range(min(6, len(t_rows) - 1)):
                edit_exempt(1 + i, f'{left_prefix}{i+1}', f'{right_prefix}{i+1}')
            xml = xml.replace(t_orig, t, 1)

    # 扣繳方式：在 table 1 row 2 大文字中插入選項標記
    xml = re.sub(
        r'((?:Please|按薪資所得扣繳率表)[^<]{0,300})',
        r'\1 {withholdingChoice}',
        xml, count=1, flags=re.DOTALL
    )

    write_docx_xml(src, dst, xml)
    print('✓ withholding.docx prepared')

if __name__ == '__main__':
    prepare_basic_info()
    prepare_withholding()
    print('Done.')
