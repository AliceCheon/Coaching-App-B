# scripts/elenco-test.ps1 — elenca SOLO i processi di test (node.exe con --test).
# Serve per guardare senza toccare niente.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/elenco-test.ps1

$ErrorActionPreference = "Continue"

$voci = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine -match '--test' })

Write-Output ("PROCESSI DI TEST ({0})" -f $voci.Count)
if ($voci.Count -eq 0) {
    Write-Output "  nessuno"
    exit 0
}
foreach ($v in $voci) {
    $cmd = [string]$v.CommandLine
    if ($cmd.Length -gt 90) { $cmd = $cmd.Substring(0, 87) + "..." }
    Write-Output ("  PID {0}  padre {1}  avviato {2}" -f $v.ProcessId, $v.ParentProcessId, $v.CreationDate)
    Write-Output ("       {0}" -f $cmd)
}
exit 0
