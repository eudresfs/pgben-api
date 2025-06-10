$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluQG5hdGFsLnBnYmVuLmdvdi5iciIsInN1YiI6IjU1ODJiNzhjLTUyNWYtNDk5NC04YjllLTI5MWM3MGE2ZjI5ZSIsInJvbGVzIjpbXSwidW5pZGFkZV9pZCI6Ijg1N2FmMzFiLTk4YjctNDhhMy04MGQ0LTlmYmZjY2JiMWRkYSIsInBlcm1pc3Npb25zIjpbIiouKiJdLCJpYXQiOjE3NDk0NjM3ODAsImV4cCI6MTc0OTQ2NzM4MCwiYXVkIjoiaHR0cHM6Ly9wZ2Jlbi1mcm9udC5rZW1vc29mdC5jb20uYnIvIiwiaXNzIjoicGdiZW4iLCJqdGkiOiJtYm94a2Nwbi1yOHhydzE0MXBkbiJ9.l0t-qdvmBUwRxwce88ExdymOxPw3oiu9L5ebBm2JTbjvDcAjCjmU0USQPh9LUUrWpjH-3CH1IiiFvUHlVzQBbLR3oK0rtJg5xRFGF9PxYI8IO37NhkYOCamsbIP3YXQ2bjgfDjJ5b6LHL7WzBbrNOibBcDCh7MXXDkIkuT_5yPJH1jINmb5jO9HigUMTJzCeWW1KzLqs5qJNvsZPhF1bkYdeAbJcP4bUQpgbFk4KtMBKk2MEcM6Cge5iP3Fq2spu--7lIaeAMfp92uYGBDkQxXDyZP_pSRQG3wVXFk9Bash9kffEMi5Ayh9X20xw24n5slddwBYiZ6JA2LYxbHZkfw'
}

Write-Host "=== Teste 1: Apenas status=aberta ==="
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/solicitacao/pendencias?status=aberta' -Method GET -Headers $headers
    Write-Host "✅ Status Code: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
        $reader.Close()
        $stream.Close()
    }
}

Write-Host "`n=== Teste 2: Sem parâmetros ==="
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/solicitacao/pendencias' -Method GET -Headers $headers
    Write-Host "✅ Status Code: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
        $reader.Close()
        $stream.Close()
    }
}