# Agenda o commit diario do perfil (automacao/commit-diario.mjs) no Agendador de Tarefas do Windows.
# Roda todo dia as 20h; se o PC estiver desligado nesse horario, roda assim que ele ligar.
# Instalar:  powershell -ExecutionPolicy Bypass -File automacao/agendar-commit-diario.ps1
# Desfazer:  Unregister-ScheduledTask -TaskName "Perfil GitHub - commit diario" -Confirm:$false
$ErrorActionPreference = 'Stop'
$nome = 'Perfil GitHub - commit diario'
$raiz = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source

$acao = New-ScheduledTaskAction -Execute $node -Argument "`"$raiz\automacao\commit-diario.mjs`"" -WorkingDirectory $raiz
$gatilho = New-ScheduledTaskTrigger -Daily -At '20:00'
# So com o usuario logado: o push usa as credenciais do Git do Kevin, sem guardar senha na tarefa.
$usuario = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $nome -Action $acao -Trigger $gatilho -Principal $usuario -Settings $config `
  -Description 'Regenera o README do perfil e faz o commit do dia se ainda nao houver nenhum (mantem a ofensiva).' -Force | Out-Null
Write-Host "Tarefa '$nome' agendada: todo dia as 20h (ou assim que o PC ligar)."
