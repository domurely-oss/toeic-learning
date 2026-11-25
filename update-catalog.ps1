# Updates public file names/IDs only; no sign-in, token, or transcript download.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$folder = '1T7ukANBenmR298EYb2gFcpv1SAWtrMev'
$response = Invoke-WebRequest -UseBasicParsing -Uri ('https://drive.google.com/embeddedfolderview?id=' + $folder)
$items = @()
$seen = @{}
$pattern = '<a href="https://drive.google.com/file/d/([\w-]+)/[^"]*"[^>]*>(.*?)</a>'
foreach ($match in [regex]::Matches($response.Content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
    $title = [regex]::Match($match.Groups[2].Value, 'class="flip-entry-title">(.*?)</div>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    $fileId = $match.Groups[1].Value
    if ($title.Success -and -not $seen.ContainsKey($fileId)) {
        $name = [System.Net.WebUtility]::HtmlDecode([regex]::Replace($title.Groups[1].Value, '<[^>]+>', ''))
        $items += @{id=$fileId;name=$name}
        $seen[$fileId] = $true
    }
}
if ($items.Count -eq 0) { throw 'No public files found. Check folder sharing or Google page format. Existing catalog was preserved.' }
$payload = @{updated=(Get-Date -Format 'yyyy-MM-dd');files=@($items)} | ConvertTo-Json -Depth 5 -Compress
$destination = Join-Path $PSScriptRoot 'guest-catalog.js'
[System.IO.File]::WriteAllText($destination, ('window.TOEIC_GUEST_CATALOG = ' + $payload + ';'), (New-Object System.Text.UTF8Encoding($false)))
Write-Host ('Updated ' + $items.Count + ' public files. Upload guest-catalog.js to GitHub.')
# Also refresh editable public TXT copies. Keep old copies if any download fails.
$publicTexts = @{}
foreach ($item in $items) {
    if ($item.name -match '\.txt$') {
        $temporaryFile = [System.IO.Path]::GetTempFileName()
        try {
            Invoke-WebRequest -UseBasicParsing -Uri ('https://drive.google.com/uc?export=download&id=' + $item.id) -OutFile $temporaryFile
            $value = [System.IO.File]::ReadAllText($temporaryFile, [System.Text.Encoding]::UTF8)
            if ($value -match '<!doctype|<html') { throw ('Not a text response: ' + $item.name) }
            $publicTexts[$item.id] = $value
        } finally { Remove-Item -LiteralPath $temporaryFile -Force }
    }
}
$textPayload = @{updated=(Get-Date -Format 'yyyy-MM-dd');texts=$publicTexts} | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'guest-texts.js'), ('window.TOEIC_GUEST_TEXTS = ' + $textPayload + ';'), (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'Upload BOTH guest-catalog.js and guest-texts.js to GitHub.'
