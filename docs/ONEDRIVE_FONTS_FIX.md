# OneDrive Fonts Deletion Fix

## Problem
The `Frontend/fonts/` folder keeps getting deleted, likely due to OneDrive sync issues.

## Root Cause
OneDrive can have issues with:
- Large binary files (fonts are typically 50KB-500KB each)
- Files in nested directories
- Sync conflicts that result in deletion

## Solutions

### Solution 1: Exclude Fonts from OneDrive Sync (Recommended)

1. **Right-click** on `Frontend/fonts/` folder
2. Select **"Always keep on this device"** (pins the folder locally)
3. Or exclude it from sync:
   - Right-click → **OneDrive** → **Free up space** (but keep locally)
   - Or go to OneDrive Settings → **Sync and backup** → **Advanced** → Exclude folders

### Solution 2: Move Project Out of OneDrive

Move the entire project to a non-OneDrive location:
```powershell
# Example: Move to C:\Projects\elior_fitness
Move-Item "C:\Users\noamc\OneDrive\Desktop\Projects\elior_fitness" "C:\Projects\elior_fitness"
```

Then update your IDE/terminal to use the new path.

### Solution 3: Use Git to Restore Fonts

If fonts are deleted, restore them from git:
```bash
git checkout HEAD -- Frontend/fonts/
git checkout HEAD -- Frontend/public/fonts/
```

### Solution 4: Add Fonts to .gitignore and Use Git LFS

For very large fonts, consider using Git LFS:
```bash
git lfs install
git lfs track "*.ttf"
git lfs track "*.otf"
git add .gitattributes
git commit -m "Track fonts with Git LFS"
```

## Prevention

1. **Always commit font changes immediately**:
   ```bash
   git add Frontend/fonts/
   git commit -m "Add/update fonts"
   git push
   ```

2. **Check git status regularly**:
   ```bash
   git status
   # If fonts are missing, restore them
   git checkout HEAD -- Frontend/fonts/
   ```

3. **Use .gitattributes** (already added):
   - Ensures fonts are treated as binary files
   - Prevents line ending issues

## Verification

After applying fixes, verify fonts exist:
```bash
# Check if fonts are tracked
git ls-files Frontend/fonts/

# List actual files
ls -R Frontend/fonts/
```

## Current Font Files (Should Always Exist)

- `Frontend/fonts/Airbolt/ttf/airbolt-airbolt-regular-400.ttf`
- `Frontend/fonts/Airbolt/otf/airbolt-airbolt-regular-400.otf`
- `Frontend/fonts/BlackPast/ttf/blackpast-blackpast-400.ttf`
- `Frontend/fonts/BlackPast/otf/blackpast-blackpast-400.otf`
- `Frontend/public/fonts/airbolt.ttf`

## Quick Fix Script

If fonts keep getting deleted, create a restore script:

```powershell
# restore-fonts.ps1
git checkout HEAD -- Frontend/fonts/
git checkout HEAD -- Frontend/public/fonts/
Write-Host "Fonts restored from git!"
```

Run it whenever fonts are missing:
```powershell
.\restore-fonts.ps1
```

