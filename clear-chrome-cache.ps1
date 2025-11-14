# Simple script to clear Chrome cache
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$chromeCache = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
if (Test-Path $chromeCache) {
    try {
        Remove-Item -Path "$chromeCache\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Chrome cache cleared successfully"
    } catch {
        Write-Host "Warning: Could not fully clear Chrome cache"
    }
} else {
    Write-Host "Chrome cache path not found"
}

