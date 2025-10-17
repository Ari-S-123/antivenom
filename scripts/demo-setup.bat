@echo off
REM AntiVenom Demo Setup Script for Windows CMD/Batch
REM Prepares Docker services, database, and Redpanda topics

echo.
echo ==========================================
echo   AntiVenom Demo Setup
echo ==========================================
echo.

REM Start Docker services
echo [1/5] Starting Docker services (Postgres + Redpanda)...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker services. Please ensure Docker Desktop is running.
    pause
    exit /b 1
)

REM Wait for services to be ready
echo [2/5] Waiting for services to be ready (10 seconds)...
timeout /t 10 /nobreak >nul

REM Run Prisma migrations
echo.
echo [3/5] Generating Prisma client...
call pnpm db:generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client.
    pause
    exit /b 1
)

echo [4/5] Running database migrations...
call pnpm db:migrate
if %errorlevel% neq 0 (
    echo WARNING: Migration failed. This might be okay if migrations already exist.
)

REM Create Redpanda topics
echo.
echo [5/5] Creating Redpanda topics...
docker exec redpanda rpk topic create defense-rules detections feedback --brokers localhost:9092 2>nul
if %errorlevel% neq 0 (
    echo INFO: Topics may already exist (this is okay^)
)

REM Verify connections
echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo Connections:
echo   - Postgres: postgresql://antivenom:antivenom@localhost:5432/antivenom
echo   - Redpanda Console: http://localhost:8080
echo   - Redpanda Broker: localhost:19092
echo.
echo Next steps:
echo   1. Ensure .env.local has OPENAI_API_KEY and APIFY_API_TOKEN
echo   2. Run: pnpm dev
echo   3. Open: http://localhost:3000
echo   4. Click 'Initialize System' to seed sample threats
echo   5. Click 'Ingest Live Threats' to scrape from Apify
echo.
pause

