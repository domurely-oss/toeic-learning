# 將 book_text/*.txt 轉成 web/data/units.js（重新執行即可更新）
import json, re, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, 'book_text')
OUT = os.path.join(BASE, 'web', 'data', 'units.js')

UNITS = [
    (1, '資通安全基本觀念', 'unit1_資通安全基本觀念.txt', '16-29',
     [('1.1','資通系統之組成',16),('1.2','建立資通安全之危機意識',19),('1.3','資通安全之防護目標',21)]),
    (2, '資通安全相關法規', 'unit2_資通安全相關法規.txt', '30-63',
     [('2.1','我國資通安全管理體系',30),('2.2','資通安全管理法與子法',34),('2.3','其他相關法規',58)]),
    (3, '資通安全風險管理', 'unit3_資通安全風險管理.txt', '64-93',
     [('3.1','風險管理之流程',64),('3.2','風險管理之全景建立',68),('3.3','風險評鑑之作法',70),
      ('3.4','風險處理之作法',80),('3.5','風險接受之作法',84),('3.6','國際相關防護及管理標準',86)]),
    (4, '管理面暨認知與訓練應辦事項', 'unit4_管理面暨認知與訓練應辦事項.txt', '94-145',
     [('4.1','資通系統分級與防護基準',94),('4.2','ISMS 之導入及驗證',99),('4.3','資通安全專責人員',105),
      ('4.4','內部資通安全稽核',106),('4.5','業務持續運作演練',109),('4.6','資通安全治理成熟度',123),
      ('4.7','資通安全教育訓練',138),('4.8','資安專業證照及職能訓練證書',140)]),
    (5, '資通系統防護控制措施', 'unit5_資通系統防護控制措施.txt', '146-203',
     [('5.1','存取控制',146),('5.2','事件日誌與可歸責性',150),('5.3','營運持續計畫',155),
      ('5.4','識別與鑑別',161),('5.5','系統與服務獲得',178),('5.6','系統與通訊保護',183),
      ('5.7','系統與資訊完整性',194),('5.8','媒體控管及可攜式設備',198)]),
    (6, '技術面—防護及偵測', 'unit6_技術面_防護及偵測.txt', '204-245',
     [('6.1','防毒軟體',204),('6.2','網路防火牆',209),('6.3','應用程式防火牆',214),
      ('6.4','電子郵件過濾機制',218),('6.5','IDS 與 IPS',222),('6.6','APT 攻擊防禦',228),
      ('6.7','SOC 管理機制',231),('6.8','GCB 組態基準',235),('6.9','VANS 通報機制',239),('6.10','EDR 偵測及應變',242)]),
    (7, '技術面—安全性檢測及資安健診', 'unit7_技術面_安全性檢測及資安健診.txt', '246-311',
     [('7.1','安全性檢測',246),('7.2','弱點掃描',247),('7.3','滲透測試',258),('7.4','應用程式安全',262),
      ('7.5','資通安全健診',271),('7.6','網路安全',275),('7.7','實體安全',296)]),
    (8, '資訊委外安全管理', 'unit8_資訊委外安全管理.txt', '312-327',
     [('8.1','資訊委外之相關法規',312),('8.2','資訊委外之類別及形態',317),('8.3','資訊委外之風險',319),
      ('8.4','資訊委外之生命週期',321),('8.5','資訊委外之資安要求',323)]),
    (9, '資通安全事件通報及應變', 'unit9_資通安全事件通報及應變.txt', '328-390',
     [('9.1','通報及應變流程',338),('9.2','通報及應變作業規範',340),('9.3','事件等級評估',342),
      ('9.4','通報及應變作業流程',355),('9.5','通報及應變演練作業',364),('9.6','資通安全事件處理',366),
      ('9.7','數位證據及數位鑑識',379),('9.8','社交工程',381)]),
]

JUNK = re.compile(r'^[\s0-9ɨɪʹɨ]*$|^資通安全概論$|^單$|^元$|^MEMO$')
# 各頁頁眉（running header），出現為獨立短行時過濾
HEADERS = {
    '資通安全基本概念', '資通安全基本觀念', '資通安全相關法規', '資通安全風險管理',
    '管理面暨認知與訓練應辦事項', '資通安全管理面暨認知與訓練應辦事項',
    '資通系統防護控制措施', '資通安全技術面應辦事項',
    '―資通安全之防護及偵測', '―安全性檢測及資通安全健診',
    '資通安全之防護及偵測', '安全性檢測及資通安全健診',
    '資訊委外安全管理', '資通安全事件通報及應變',
}
PAGE_MARK = re.compile(r'^--- 書頁 p\.(\d+) \(PDF p\.\d+\) ---$')

def clean_page(lines):
    out = []
    for ln in lines:
        ln = ln.replace('ɨ', '').replace('ɪʹ', '').rstrip()
        if JUNK.match(ln.strip()) or ln.strip() in HEADERS:
            continue
        out.append(ln)
    # 合併被 PDF 斷開的行：上一行若非句末標點結尾且下一行不是條列起頭，則接續
    paras, buf = [], ''
    bullet = re.compile(r'^\s*(\(\d+\)|[¼hh]|\d+\.\d+(\.\d+)?\s|圖\s?\d+|表\s?\d+|[一二三四五六七八九十]+、)')
    for ln in out:
        s = ln.strip()
        if not s:
            continue
        if buf and (buf[-1] in '。：；！？)」』' or bullet.match(s)):
            paras.append(buf); buf = s
        elif buf:
            buf += s
        else:
            buf = s
    if buf:
        paras.append(buf)
    return paras

units = []
for uid, title, fname, pages, sections in UNITS:
    text = open(os.path.join(SRC, fname), encoding='utf-8').read()
    cur, page_no, pages_data = [], None, []
    for ln in text.split('\n'):
        m = PAGE_MARK.match(ln.strip())
        if m:
            if page_no is not None:
                pages_data.append({'p': page_no, 'paras': clean_page(cur)})
            page_no, cur = int(m.group(1)), []
        else:
            cur.append(ln)
    if page_no is not None:
        pages_data.append({'p': page_no, 'paras': clean_page(cur)})
    units.append({'id': uid, 'title': title, 'pages': pages,
                  'sections': [{'no': n, 'title': t, 'page': p} for n, t, p in sections],
                  'content': pages_data})

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('window.BOOK=' + json.dumps({'title': '資通安全概論（114年11月版）', 'units': units}, ensure_ascii=False) + ';')
print('written', OUT, os.path.getsize(OUT), 'bytes')
