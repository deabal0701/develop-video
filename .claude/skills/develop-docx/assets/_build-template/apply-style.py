# styles.xml(v0.6 동결본)을 생성물에 입히고 헤딩 스타일 ID 를 v0.6 것으로 치환한다.
#   out/gen_*.docx (docx-js 생성, 스타일 미적용) → out/styled_*.docx
#   styles.xml = DEVELOPMENT-PLAN-v0.6.docx 에서 동결 스냅샷한 스타일 정의(전 산출물 공통)
import glob
import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
styles = open(os.path.join(HERE, 'styles.xml'), 'rb').read()

for sp in sorted(glob.glob(os.path.join(OUT, 'gen_*.docx'))):
    name = os.path.basename(sp)
    dp = os.path.join(OUT, name.replace('gen_', 'styled_', 1))
    zg = zipfile.ZipFile(sp)
    out = zipfile.ZipFile(dp, 'w', zipfile.ZIP_DEFLATED)
    for it in zg.infolist():
        d = zg.read(it.filename)
        if it.filename == 'word/styles.xml':
            d = styles                                  # v0.6 스타일로 교체
        elif it.filename == 'word/document.xml':
            t = d.decode('utf-8')
            for i in range(1, 7):                       # Heading1~6 → v0.6 스타일 ID 1~6
                t = t.replace('w:val="Heading%d"' % i, 'w:val="%d"' % i)
            d = t.encode('utf-8')
        out.writestr(it, d)
    out.close()
    zg.close()
    print('styled:', os.path.basename(dp))
