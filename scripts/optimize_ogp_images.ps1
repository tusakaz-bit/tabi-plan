Add-Type -AssemblyName System.Drawing

$files = @(
    "bg_tokyo_new.jpg",
    "bg_osaka_new.jpg",
    "bg_kyoto_new.jpg",
    "bg_sapporo_new.jpg",
    "bg_okinawa_new.jpg",
    "bg_fukuoka_new.jpg",
    "bg_kanazawa_new.jpg",
    "bg_hero_new.jpg"
)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

foreach ($f in $files) {
    if (Test-Path $f) {
        $fullPath = (Resolve-Path $f).Path
        $origSize = [math]::Round((Get-Item $fullPath).Length / 1KB, 1)

        $backupPath = "$fullPath.bak"
        Copy-Item -Path $fullPath -Destination $backupPath -Force

        $img = [System.Drawing.Image]::FromFile($backupPath)

        $targetWidth = 1200
        if ($img.Width -lt 1200) {
            $targetWidth = $img.Width
        }
        $targetHeight = [int]($img.Height * ($targetWidth / $img.Width))

        $bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
        $graph = [System.Drawing.Graphics]::FromImage($bmp)
        $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graph.DrawImage($img, 0, 0, $targetWidth, $targetHeight)

        $bmp.Save($fullPath, $codec, $encoderParams)

        $graph.Dispose()
        $bmp.Dispose()
        $img.Dispose()

        Remove-Item -Path $backupPath -Force

        $newSize = [math]::Round((Get-Item $fullPath).Length / 1KB, 1)
        Write-Host "SUCCESS: $f : ${origSize} KB -> ${newSize} KB (${targetWidth}x${targetHeight})"
    }
}

if (Test-Path "bg_hero_new.jpg") {
    Copy-Item "bg_hero_new.jpg" "hero-bg.jpg" -Force
    Write-Host "SUCCESS: Created fallback hero-bg.jpg from bg_hero_new.jpg"
}
