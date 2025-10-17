#!/bin/bash
# Demo setup script for AntiVenom
# Prepares Docker services, database, and Redpanda topics

set -e

echo "🚀 AntiVenom Demo Setup"
echo "========================"

# Start Docker services
echo ""
echo "📦 Starting Docker services (Postgres + Redpanda)..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready (10 seconds)..."
sleep 10

# Run Prisma migrations
echo ""
echo "🗄️  Running database migrations..."
pnpm db:generate
pnpm db:migrate

# Create Redpanda topics
echo ""
echo "📨 Creating Redpanda topics..."
docker exec redpanda rpk topic create defense-rules detections feedback --brokers localhost:9092 || echo "Topics may already exist"

# Verify connections
echo ""
echo "✅ Verifying connections..."
echo "   - Postgres: postgresql://antivenom:antivenom@localhost:5432/antivenom"
echo "   - Redpanda Console: http://localhost:8080"
echo "   - Redpanda Broker: localhost:19092"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure .env.local has OPENAI_API_KEY and APIFY_API_TOKEN"
echo "  2. Run: pnpm dev"
echo "  3. Open: http://localhost:3000"
echo "  4. Click 'Initialize System' to seed sample threats"
echo "  5. Click 'Ingest Live Threats' to scrape from Apify"
echo ""

