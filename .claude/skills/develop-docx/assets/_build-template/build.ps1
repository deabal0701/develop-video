# insa-IT 산출물 docx 재생성 (Windows + Word)
#  사용법:  powershell -ExecutionPolicy Bypass -File build.ps1
#          powershell -ExecutionPolicy Bypass -File build.ps1 -NoWord   (목차 자동갱신 생략 — Word 없을 때)
#          powershell -ExecutionPolicy Bypass -File build.ps1 -Pdf      (PDF 동시 산출)
param([switch]$NoWord, [switch]$Pdf)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# 1) 의존성
if (-not (Test-Path 'node_modules/docx')) { npm install }
# 2) 본문 생성 (docx-js) → out/gen_*.docx + out/manifest.json
node build.js
# 3) 스타일 적용 + 헤딩 ID 치환 → out/styled_*.docx
python apply-style.py
# 3-1) 본문 금지 문자 점검(★ · em dash · 박스드로잉 등). 발견 시 경고만 하고 진행한다
python check-text.py
if ($LASTEXITCODE -ne 0) { Write-Warning '금지 문자가 있습니다. build.js 본문을 수정하고 다시 생성하십시오.' }

$out = Join-Path $PSScriptRoot 'out'
$final = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content (Join-Path $out 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$jobs = @()
foreach ($m in $manifest) {
  $jobs += @{ src = (Join-Path $out (($m.gen -replace '^gen_', 'styled_') + '.docx')); dst = (Join-Path $final $m.dst) }
}

# 4) 목차(TOC)·필드 갱신 후 최종 저장
if ($NoWord) {
  foreach ($j in $jobs) { Copy-Item $j.src $j.dst -Force }
  Write-Output 'copied (목차 미갱신 — Word 에서 [목차 업데이트] 필요)'
  return
}
# Word 는 단일 인스턴스 COM 서버다. 이미 실행 중이면 그 인스턴스에 붙고 Quit 하지 않는다
# (새로 만든 경우에만 Quit — 사용자가 열어둔 문서를 닫아버리는 사고 방지).
$word = $null; $createdWord = $false
try { $word = [Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application') } catch { }
if (-not $word) { $word = New-Object -ComObject Word.Application; $word.Visible = $false; $createdWord = $true }
try {
  foreach ($j in $jobs) {
    $doc = $word.Documents.Open($j.src)
    if ($doc.TablesOfContents.Count -gt 0) { $doc.TablesOfContents.Item(1).Update() }
    $doc.Fields.Update() | Out-Null; $doc.Repaginate()
    $doc.Close($true)
    Copy-Item $j.src $j.dst -Force
    Write-Output ('saved: ' + (Split-Path $j.dst -Leaf))
    if ($Pdf) {
      $d2 = $word.Documents.Open($j.dst)
      $d2.SaveAs([ref]([IO.Path]::ChangeExtension($j.dst, '.pdf')), [ref]17)   # 17 = wdFormatPDF
      $d2.Close($false)
      Write-Output ('pdf:   ' + (Split-Path ([IO.Path]::ChangeExtension($j.dst, '.pdf')) -Leaf))
    }
  }
} finally { if ($createdWord) { $word.Quit() } }

# 5) 마크다운 미러 갱신(pandoc 이 있을 때만). docx 가 정본, md 는 열람용 사본이다
if (Get-Command pandoc -ErrorAction SilentlyContinue) {
  foreach ($j in $jobs) {
    $md = [IO.Path]::ChangeExtension($j.dst, '.md')
    pandoc $j.dst -t gfm -o $md
    Write-Output ('md:    ' + (Split-Path $md -Leaf))
  }
} else {
  Write-Warning 'pandoc 이 없어 md 미러를 갱신하지 못했습니다.'
}
