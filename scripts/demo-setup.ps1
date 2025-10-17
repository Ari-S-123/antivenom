# AntiVenom Demo Setup Script for Windows PowerShell
# Prepares Docker services, database, and Redpanda topics

Write-Host "🚀 AntiVenom Demo Setup" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Start Docker services
Write-Host "📦 Starting Docker services (Postgres + Redpanda)..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker services. Please ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Run Prisma migrations
Write-Host ""
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
if (-not $env:DATABASE_URL -or $env:DATABASE_URL.Trim() -eq "") {
    # Prisma Data Proxy URLs (prisma+postgres://) are not usable by migrate; use direct URLs locally
    $env:DATABASE_URL = "postgresql://antivenom:antivenom@localhost:5432/antivenom"
}

# Ensure direct URL and shadow DB URL for Prisma migrate (even if DATABASE_URL is prisma+postgres)
if (-not $env:DIRECT_URL -or $env:DIRECT_URL.Trim() -eq "") {
    $env:DIRECT_URL = "postgresql://antivenom:antivenom@localhost:5432/antivenom"
}
if (-not $env:SHADOW_DATABASE_URL -or $env:SHADOW_DATABASE_URL.Trim() -eq "") {
    $env:SHADOW_DATABASE_URL = "postgresql://antivenom:antivenom@localhost:5432/antivenom_shadow"
}

# Wait until Postgres is ready to accept connections
Write-Host "🔎 Waiting for Postgres readiness..." -ForegroundColor Yellow
$maxAttempts = 30
for ($i = 1; $i -le $maxAttempts; $i++) {
    docker exec postgres pg_isready -h localhost -U antivenom -d postgres -q 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
    if ($i -eq $maxAttempts) {
        Write-Host "❌ Postgres not ready after $maxAttempts seconds." -ForegroundColor Red
        exit 1
    }
}

# Ensure the shadow database exists (Prisma does not create it automatically)
Write-Host "🛠️  Ensuring shadow database exists..." -ForegroundColor Yellow
# First attempt to create it (idempotent: will fail if it exists)
docker exec -e PGPASSWORD=antivenom postgres createdb -h localhost -U antivenom antivenom_shadow 2>$null
if ($LASTEXITCODE -ne 0) {
    # If creation failed, verify if it already exists
    $dbExists = docker exec -e PGPASSWORD=antivenom postgres psql -h localhost -U antivenom -d postgres -tA -c "SELECT 1 FROM pg_database WHERE datname = 'antivenom_shadow'" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to query Postgres for shadow DB existence." -ForegroundColor Red
        exit 1
    }
    if ($null -eq $dbExists -or $dbExists.ToString().Trim() -ne "1") {
        Write-Host "❌ Failed to create shadow database 'antivenom_shadow'." -ForegroundColor Red
        exit 1
    }
}

pnpm db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client." -ForegroundColor Red
    exit 1
}

pnpm db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration failed. This might be okay if migrations already exist." -ForegroundColor Yellow
}

# Create Redpanda topics
Write-Host ""
Write-Host "📨 Creating Redpanda topics..." -ForegroundColor Yellow
docker exec redpanda rpk topic create defense-rules detections feedback --brokers localhost:9092 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ℹ️  Topics may already exist (this is okay)" -ForegroundColor Gray
}

# Verify connections
Write-Host ""
Write-Host "✅ Verifying connections..." -ForegroundColor Green
Write-Host "   - Postgres: postgresql://antivenom:antivenom@localhost:5432/antivenom" -ForegroundColor Gray
Write-Host "   - Redpanda Console: http://localhost:8080" -ForegroundColor Gray
Write-Host "   - Redpanda Broker: localhost:19092" -ForegroundColor Gray

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Ensure .env.local has OPENAI_API_KEY and APIFY_API_TOKEN" -ForegroundColor White
Write-Host "  2. Run: pnpm dev" -ForegroundColor White
Write-Host "  3. Open: http://localhost:3000" -ForegroundColor White
Write-Host "  4. Click 'Initialize System' to seed sample threats" -ForegroundColor White
Write-Host "  5. Click 'Ingest Live Threats' to scrape from Apify" -ForegroundColor White
Write-Host ""

