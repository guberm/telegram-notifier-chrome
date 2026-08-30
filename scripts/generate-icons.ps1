Add-Type -AssemblyName System.Drawing

$iconDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'public\icons'
New-Item -ItemType Directory -Path $iconDirectory -Force | Out-Null

foreach ($size in 16, 32, 48, 128) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $scale = $size / 128.0
    $background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(37, 99, 235))
    $bubble = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $bell = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(19, 32, 54))
    $graphics.FillEllipse($background, 2 * $scale, 2 * $scale, 124 * $scale, 124 * $scale)
    $graphics.FillEllipse($bubble, 24 * $scale, 25 * $scale, 80 * $scale, 60 * $scale)
    $graphics.FillPolygon($bubble, [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(39 * $scale, 75 * $scale),
        [System.Drawing.PointF]::new(28 * $scale, 96 * $scale),
        [System.Drawing.PointF]::new(58 * $scale, 82 * $scale)
    ))
    $graphics.FillEllipse($bell, 49 * $scale, 52 * $scale, 30 * $scale, 30 * $scale)
    $graphics.FillRectangle($bell, 45 * $scale, 67 * $scale, 38 * $scale, 23 * $scale)
    $graphics.FillEllipse($bell, 42 * $scale, 82 * $scale, 44 * $scale, 13 * $scale)
    $graphics.FillEllipse($bell, 58 * $scale, 94 * $scale, 12 * $scale, 8 * $scale)

    $path = Join-Path $iconDirectory "icon-$size.png"
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bell.Dispose(); $bubble.Dispose(); $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
