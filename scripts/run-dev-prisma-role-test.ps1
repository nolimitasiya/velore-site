$ErrorActionPreference = "Stop"

function Get-EnvValue {
    param([string]$File, [string]$Name)

    $line = Get-Content $File |
        Where-Object { $_ -match "^\s*$Name\s*=" } |
        Select-Object -Last 1

    if (-not $line) {
        throw "Missing environment variable: $Name"
    }

    $value = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")

    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Empty environment variable: $Name"
    }

    return $value
}

function Get-ProjectRef {
    param([string]$Url)

    $uri = [System.Uri]$Url

    if ($uri.Host -match '^db\.([^.]+)\.supabase\.co$') {
        return $Matches[1]
    }

    $username = [System.Uri]::UnescapeDataString(
        $uri.UserInfo.Split(':')[0]
    )

    if (
        $uri.Host -match 'pooler\.supabase\.com$' -and
        $username -match '^postgres\.(.+)$'
    ) {
        return $Matches[1]
    }

    throw "Unrecognized Supabase connection format."
}

$devDatabaseUrl = Get-EnvValue ".env.development.test" "DATABASE_URL"
$devDirectUrl = Get-EnvValue ".env.development.test" "DIRECT_URL"

$prodDatabaseUrl = Get-EnvValue ".env.local" "DATABASE_URL"
$prodDirectUrl = Get-EnvValue ".env.local" "DIRECT_URL"

$devRef = Get-ProjectRef $devDatabaseUrl
$devDirectRef = Get-ProjectRef $devDirectUrl
$prodRef = Get-ProjectRef $prodDatabaseUrl
$prodDirectRef = Get-ProjectRef $prodDirectUrl

if ($devRef -ne $devDirectRef) {
    throw "Development URLs refer to different projects."
}

if ($prodRef -ne $prodDirectRef) {
    throw "Production URLs refer to different projects."
}

if ($devRef -eq $prodRef) {
    throw "Development and production refer to the same project."
}

Write-Output "SAFETY CHECK PASSED: Development project is separate from production."

Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DIRECT_URL -ErrorAction SilentlyContinue

$env:DATABASE_URL = $devDatabaseUrl
$env:DIRECT_URL = $devDirectUrl

try {
    Write-Output "TARGET: Verified development database."
    Write-Output "ACTION: Read Prisma database connection role."

    $confirmation = Read-Host "Type TEST-DEV to continue"

    if ($confirmation -cne "TEST-DEV") {
        throw "Development integration test cancelled."
    }

    $env:VEILORA_DEV_INTEGRATION_TEST = "true"
    $env:SECURITY_AUDIT_ENABLED = "false"

    npx.cmd vitest run "scripts/test-dev-prisma-role.test.ts" --maxWorkers=1 --no-file-parallelism

    if ($LASTEXITCODE -ne 0) {
        throw "Development Prisma role verification failed."
    }

    Write-Output "Development Prisma role verification completed."
} finally {
    Remove-Item Env:VEILORA_DEV_INTEGRATION_TEST -ErrorAction SilentlyContinue
    Remove-Item Env:SECURITY_AUDIT_ENABLED -ErrorAction SilentlyContinue
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:DIRECT_URL -ErrorAction SilentlyContinue
}