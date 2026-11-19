# scripts/ferma-test.ps1 — spegne SOLO i processi di test (node.exe con --test)
# e mostra l'elenco PRIMA e DOPO. Nessun altro node viene toccato: gli
# strumenti di lavoro restano vivi.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ferma-test.ps1
#
# Esce 0 se dopo la pulizia non resta nessun processo di test, 1 se ne resta
# qualcuno. Il testo va dritto in console, cosi' la corsa della suite lo scrive
# nel suo log e Alice lo legge.

$ErrorActionPreference = "Continue"

function Elenco-Test {
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
        Where-Object { $_.CommandLine -and $_.CommandLine -match '--test' } |
        Select-Object ProcessId, ParentProcessId, CreationDate, CommandLine
}

function Mostra($titolo, $voci) {
    $n = @($voci).Count
    Write-Output "$titolo ($n)"
    if ($n -eq 0) {
        Write-Output "  nessuno"
        return
    }
    foreach ($v in $voci) {
        $cmd = [string]$v.CommandLine
        if ($cmd.Length -gt 90) { $cmd = $cmd.Substring(0, 87) + "..." }
        Write-Output ("  PID {0}  padre {1}  avviato {2}" -f $v.ProcessId, $v.ParentProcessId, $v.CreationDate)
        Write-Output ("       {0}" -f $cmd)
    }
}

$prima = @(Elenco-Test)
Mostra "PROCESSI DI TEST PRIMA" $prima

foreach ($p in $prima) {
    try {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
        Write-Output ("  spento PID {0}" -f $p.ProcessId)
    } catch {
        Write-Output ("  NON spento PID {0}: {1}" -f $p.ProcessId, $_.Exception.Message)
    }
}

# Un attimo di respiro: Windows deve davvero chiudere i processi.
if ($prima.Count -gt 0) { Start-Sleep -Milliseconds 700 }

$dopo = @(Elenco-Test)
Mostra "PROCESSI DI TEST DOPO" $dopo

if ($dopo.Count -eq 0) {
    Write-Output "ESITO: nessun processo di test rimasto"
    if ($prima.Count -eq 0) { exit 0 }
    exit 0
}
Write-Output "ESITO: restano $($dopo.Count) processi di test"
exit 1
