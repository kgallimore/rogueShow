# Convert all images in current directory to WebP format
# Requires cwebp to be installed and in PATH
# Install via: choco install webp or download from https://developers.google.com/speed/webp/download

$imageExtensions = @('*.jpg', '*.jpeg', '*.png', '*.bmp', '*.tiff', '*.tif')
$quality = 80  # Adjust quality (0-100, higher = better quality but larger file)

Write-Host "Converting images to WebP format..." -ForegroundColor Green

foreach ($ext in $imageExtensions) {
    $files = Get-ChildItem -Path . -Filter $ext -File
    
    foreach ($file in $files) {
        $outputFile = [System.IO.Path]::ChangeExtension($file.Name, '.webp')
        
        Write-Host "Converting: $($file.Name) -> $outputFile" -ForegroundColor Cyan
        
        & cwebp -q $quality $file.FullName -o $outputFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Success" -ForegroundColor Green
        } else {
            Write-Host "  Failed" -ForegroundColor Red
        }
    }
}
