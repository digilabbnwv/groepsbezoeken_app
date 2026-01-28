$baseUrl = "https://groepsbezoeken-bieb-app.digilab-464.workers.dev"
$secret = "BNWV2026"  # Using the known test secret
$headers = @{ "Content-Type" = "application/json" }

Write-Host "--- 1. Creating Session ---" -ForegroundColor Cyan
$createPayload = @{
    secret      = $secret
    sessionName = "PowerShell AutoTest"
} | ConvertTo-Json

try {
    $session = Invoke-RestMethod -Uri "$baseUrl/api/createSession?secret=$secret" -Method Post -Body $createPayload -Headers $headers
}
catch {
    Write-Error "Create Session Request Failed: $_"
    exit
}

$code = $session.sessionCode
if (-not $code) {
    Write-Error "No session code returned. Response: $($session | Out-String)"
    exit
}
Write-Host "Session Created. Name: $($session.sessionName) | Code: $code" -ForegroundColor Green

# Wait a moment for consistency
Start-Sleep -Seconds 1

Write-Host "`n--- 2. Joining 3 Teams ---" -ForegroundColor Cyan
$animals = @(
    @{ id = 1; name = "Panda"; teamName = "Pittige Panda's" }, 
    @{ id = 2; name = "Koe"; teamName = "Kale Koeien" }, 
    @{ id = 3; name = "Leeuw"; teamName = "Lollige Leeuwen" }
)

foreach ($a in $animals) {
    $joinPayload = @{
        secret      = $secret
        sessionCode = $code
        animalId    = $a.id
        teamName    = $a.teamName
    } | ConvertTo-Json
    
    try {
        $res = Invoke-RestMethod -Uri "$baseUrl/api/joinTeam?secret=$secret" -Method Post -Body $joinPayload -Headers $headers
        Write-Host "Joined Team '$($a.name)' -> Token: $($res.teamToken)" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to join team $($a.name): $_"
    }
}

# Wait for consistency
Start-Sleep -Seconds 2

Write-Host "`n--- 3. Verifying Session State (Admin View) ---" -ForegroundColor Cyan
$stateUrl = "$baseUrl/api/fetchSessionState?secret=$secret&code=$code"

try {
    $state = Invoke-RestMethod -Uri $stateUrl -Method Get
    
    if ($state.sessionCode -eq $code) {
        Write-Host "Fetched State Successfully."
        Write-Host "Raw State Dump:" -ForegroundColor Gray
        $state | ConvertTo-Json -Depth 5 | Write-Host
        
        $count = 0
        if ($state.teams) { 
            # Powershell handles single object vs array weirdly for .Count, enforce array
            $teamsArr = @($state.teams)
            $count = $teamsArr.Count 
        }
        
        Write-Host "Teams Count: $count" -ForegroundColor Yellow
        
        if ($count -eq 3) {
            Write-Host "SUCCESS: 3 Teams found in session." -ForegroundColor Green
        }
        else {
            Write-Host "WARNING: Expected 3 teams, found $($state.teams.Count)." -ForegroundColor Red
        }
    }
    else {
        Write-Error "Fetched session code ($($state.sessionCode)) does not match created code ($code)."
    }
}
catch {
    Write-Error "Failed to fetch session state: $_"
}
