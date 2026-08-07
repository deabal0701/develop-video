# 산출물 본문 문자 점검. 생성된 docx 의 실제 표시 텍스트에서 금지 문자를 찾아 보고한다.
#   금지 1: em/en dash(— –), 박스드로잉 선(─ ━ ═ │)
#   금지 2: 이모지·딩벳 기호 전반(★ ☆ ✅ ✔ ⛔ 💡 📌 등). 문서에 아이콘을 쓰지 않는다
#   허용: 가운뎃점(·), 화살표(→), 원문자(①②③)
# 사용: python check-text.py [out/styled_*.docx]   (인자 없으면 out/styled_*.docx 전체)
import glob
import os
import re
import sys
import zipfile

FORBIDDEN_CHARS = {
    '—': 'em dash. 쉼표·괄호·마침표로 문장을 끊는다',
    '–': 'en dash. 범위는 물결표 또는 하이픈',
    '─': '박스드로잉 선',
    '━': '박스드로잉 선',
    '═': '박스드로잉 선',
    '│': '박스드로잉 선',
}
# 딩벳(2600~27BF) + 이모지(1F300~1FAFF). ★ ☆ ✅ ✔ ⛔ 💡 등이 모두 여기 걸린다.
ICON_RE = re.compile('[☀-➿\U0001F300-\U0001FAFF]')

HERE = os.path.dirname(os.path.abspath(__file__))
targets = sys.argv[1:] or sorted(glob.glob(os.path.join(HERE, 'out', 'styled_*.docx')))
if not targets:
    print('check-text: 대상 docx 없음')
    sys.exit(0)


def context(text, start, end):
    return text[max(0, start - 25):end + 25].replace('\n', ' ')


total = 0
for f in targets:
    with zipfile.ZipFile(f) as z:
        xml = z.read('word/document.xml').decode('utf-8')
    text = ''.join(re.findall(r'<w:t[^>]*>(.*?)</w:t>', xml, re.S))
    hits = []
    for ch, why in FORBIDDEN_CHARS.items():
        for m in re.finditer(re.escape(ch), text):
            hits.append(('%s %s' % (ch, why), context(text, m.start(), m.end())))
    for m in ICON_RE.finditer(text):
        hits.append(('%s 아이콘 기호. 문서에 아이콘을 쓰지 않는다' % m.group(), context(text, m.start(), m.end())))
    print('%s: %s' % (os.path.basename(f), '금지 문자 %d건' % len(hits) if hits else 'OK'))
    enc = sys.stdout.encoding or 'utf-8'
    for why, ctx in hits[:40]:
        # 콘솔 인코딩이 좁으면(cp949 등) 표현 불가 문자를 대체 문자로 낮춰 출력한다
        line = '   - %s  ... %s ...' % (why, ctx)
        print(line.encode(enc, 'replace').decode(enc, 'replace'))
    total += len(hits)

sys.exit(1 if total else 0)
