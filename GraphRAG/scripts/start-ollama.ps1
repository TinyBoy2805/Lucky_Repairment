$ErrorActionPreference = 'Stop'

$ollama = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'
if (-not (Test-Path $ollama)) {
    throw "Ollama not found at $ollama"
}

$models = [Environment]::GetEnvironmentVariable('OLLAMA_MODELS', 'User')
if (-not $models) {
    $models = Join-Path $env:USERPROFILE '.ollama\models'
}

Write-Host 'Stopping existing Ollama processes...'
Get-Process 'ollama app', 'ollama', 'llama-server' -ErrorAction SilentlyContinue |
    Stop-Process -Force
Start-Sleep -Seconds 2

function Start-OllamaServer {
    param(
        [string]$Name,
        [hashtable]$Settings
    )

    foreach ($key in $Settings.Keys) {
        Set-Item -Path "Env:$key" -Value $Settings[$key]
    }

    Start-Process $ollama `
        -ArgumentList 'serve' `
        -RedirectStandardOutput (Join-Path $env:TEMP "$Name.out") `
        -RedirectStandardError (Join-Path $env:TEMP "$Name.err") `
        -WindowStyle Hidden |
        Out-Null
}

function Test-OllamaPort {
    param([int]$Port)

    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect('127.0.0.1', $Port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

Start-OllamaServer -Name 'ollama-gpu' -Settings @{
    OLLAMA_MODELS            = $models
    OLLAMA_HOST              = '0.0.0.0:11434'
    OLLAMA_CONTEXT_LENGTH    = '4096'
    OLLAMA_KEEP_ALIVE        = '30m'
    OLLAMA_MAX_LOADED_MODELS = '1'
    OLLAMA_NUM_PARALLEL      = '1'
    OLLAMA_FLASH_ATTENTION   = '1'
    OLLAMA_KV_CACHE_TYPE     = 'q8_0'
}

Start-OllamaServer -Name 'ollama-cpu' -Settings @{
    OLLAMA_MODELS            = $models
    OLLAMA_HOST              = '0.0.0.0:11435'
    OLLAMA_CONTEXT_LENGTH    = '512'
    OLLAMA_KEEP_ALIVE        = '30m'
    OLLAMA_MAX_LOADED_MODELS = '1'
    OLLAMA_NUM_PARALLEL      = '1'
    OLLAMA_LLM_LIBRARY       = 'cpu'
}

foreach ($port in 11434, 11435) {
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if (Test-OllamaPort -Port $port) {
            $ready = $true
            break
        }
        Start-Sleep -Milliseconds 500
    }

    if (-not $ready) {
        throw "Ollama did not start on port $port"
    }
}

Write-Host 'Ollama ready:'
Write-Host '  chat       http://127.0.0.1:11434 (GPU)'
Write-Host '  embeddings http://127.0.0.1:11435 (CPU)'

exit 0
