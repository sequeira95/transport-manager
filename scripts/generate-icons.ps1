Add-Type -AssemblyName System.Drawing

function Draw-Arrows($graphics, [float]$cx, [float]$cy, [float]$scale, [float]$strokeWidth) {
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, $strokeWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # Arrow 1: top shaft and head
    $p1 = [System.Drawing.PointF]::new([float]($cx + (8.0 - 12.0) * $scale), [float]($cy + (7.0 - 12.0) * $scale))
    $p2 = [System.Drawing.PointF]::new([float]($cx + (20.0 - 12.0) * $scale), [float]($cy + (7.0 - 12.0) * $scale))
    $h1 = [System.Drawing.PointF]::new([float]($cx + (16.0 - 12.0) * $scale), [float]($cy + (3.0 - 12.0) * $scale))
    $h2 = [System.Drawing.PointF]::new([float]($cx + (16.0 - 12.0) * $scale), [float]($cy + (11.0 - 12.0) * $scale))

    $graphics.DrawLine($pen, $p1, $p2)
    $graphics.DrawLine($pen, $h1, $p2)
    $graphics.DrawLine($pen, $h2, $p2)

    # Arrow 2: bottom shaft and head
    $q1 = [System.Drawing.PointF]::new([float]($cx + (16.0 - 12.0) * $scale), [float]($cy + (17.0 - 12.0) * $scale))
    $q2 = [System.Drawing.PointF]::new([float]($cx + (4.0 - 12.0) * $scale), [float]($cy + (17.0 - 12.0) * $scale))
    $k1 = [System.Drawing.PointF]::new([float]($cx + (8.0 - 12.0) * $scale), [float]($cy + (21.0 - 12.0) * $scale))
    $k2 = [System.Drawing.PointF]::new([float]($cx + (8.0 - 12.0) * $scale), [float]($cy + (13.0 - 12.0) * $scale))

    $graphics.DrawLine($pen, $q1, $q2)
    $graphics.DrawLine($pen, $k1, $q2)
    $graphics.DrawLine($pen, $k2, $q2)

    $pen.Dispose()
}

function Create-RoundedRectanglePath([System.Drawing.RectangleF]$rect, [float]$radius) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $radius * 2.0
    $size = [System.Drawing.SizeF]::new($diameter, $diameter)
    $arc = [System.Drawing.RectangleF]::new($rect.Location, $size)

    # Top-left
    $path.AddArc($arc, 180, 90)

    # Top-right
    $arc.X = $rect.Right - $diameter
    $path.AddArc($arc, 270, 90)

    # Bottom-right
    $arc.Y = $rect.Bottom - $diameter
    $path.AddArc($arc, 0, 90)

    # Bottom-left
    $arc.X = $rect.Left
    $path.AddArc($arc, 90, 90)

    $path.CloseFigure()
    return $path
}

function Generate-IconSet([string]$dir, [int]$iconSize, [int]$fgSize) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    # 1. Square / rounded launcher icon
    $bmp = [System.Drawing.Bitmap]::new($iconSize, $iconSize)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $pStart = [System.Drawing.PointF]::new(0.0, [float]$iconSize)
    $pEnd = [System.Drawing.PointF]::new([float]$iconSize, 0.0)
    $gradBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        $pStart, $pEnd,
        [System.Drawing.Color]::FromArgb(255, 5, 150, 105), # #059669
        [System.Drawing.Color]::FromArgb(255, 37, 99, 235)  # #2563eb
    )
    $blend = [System.Drawing.Drawing2D.ColorBlend]::new()
    $blend.Colors = @(
        [System.Drawing.Color]::FromArgb(255, 5, 150, 105),
        [System.Drawing.Color]::FromArgb(255, 13, 148, 136),
        [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
    )
    $blend.Positions = @(0.0, 0.5, 1.0)
    $gradBrush.InterpolationColors = $blend

    $rect = [System.Drawing.RectangleF]::new(0.0, 0.0, [float]$iconSize, [float]$iconSize)
    $radius = [float]($iconSize * 0.22)
    $roundPath = Create-RoundedRectanglePath $rect $radius
    $g.FillPath($gradBrush, $roundPath)
    $roundPath.Dispose()

    # Draw arrows centered
    $scale = ([float]$iconSize * 0.52) / 24.0
    $strokeWidth = [Math]::Max(2.0, [float]($scale * 2.2))
    Draw-Arrows $g ([float]($iconSize / 2.0)) ([float]($iconSize / 2.0)) $scale $strokeWidth

    $bmp.Save("$dir\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()

    # 2. Round launcher icon
    $bmpRound = [System.Drawing.Bitmap]::new($iconSize, $iconSize)
    $gRound = [System.Drawing.Graphics]::FromImage($bmpRound)
    $gRound.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gRound.Clear([System.Drawing.Color]::Transparent)

    $gRound.FillEllipse($gradBrush, 0.0, 0.0, [float]$iconSize, [float]$iconSize)
    Draw-Arrows $gRound ([float]($iconSize / 2.0)) ([float]($iconSize / 2.0)) $scale $strokeWidth

    $bmpRound.Save("$dir\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $gRound.Dispose()
    $bmpRound.Dispose()
    $gradBrush.Dispose()

    # 3. Foreground icon (transparent with arrows)
    $bmpFg = [System.Drawing.Bitmap]::new($fgSize, $fgSize)
    $gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
    $gFg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gFg.Clear([System.Drawing.Color]::Transparent)

    $fgScale = ([float]$fgSize * 0.48) / 24.0
    $fgStroke = [Math]::Max(2.0, [float]($fgScale * 2.2))
    Draw-Arrows $gFg ([float]($fgSize / 2.0)) ([float]($fgSize / 2.0)) $fgScale $fgStroke

    $bmpFg.Save("$dir\ic_launcher_foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $gFg.Dispose()
    $bmpFg.Dispose()

    Write-Host "Success: generated icons for $dir ($iconSize x $iconSize, fg: $fgSize x $fgSize)"
}

$base = "c:\Users\user\Documents\admitracionTransporte\android\app\src\main\res"

Generate-IconSet "$base\mipmap-mdpi" 48 108
Generate-IconSet "$base\mipmap-hdpi" 72 162
Generate-IconSet "$base\mipmap-xhdpi" 96 216
Generate-IconSet "$base\mipmap-xxhdpi" 144 324
Generate-IconSet "$base\mipmap-xxxhdpi" 192 432
