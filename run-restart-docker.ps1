# Wrapper script to run restart-docker.ps1 with bypassed execution policy
# This script bypasses the execution policy to run the main script

powershell.exe -ExecutionPolicy Bypass -File ".\restart-docker.ps1"

