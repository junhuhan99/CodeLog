#!/bin/bash

# CodeLog Quick Start Script
# This script helps you quickly set up and run CodeLog

set -e

echo "╔═══════════════════════════════════════╗"
echo "║                                       ║"
echo "║         CodeLog Setup Script          ║"
echo "║                                       ║"
echo "║         Made by Logs0                 ║"
echo "║                                       ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.production..."
    cp .env.production .env

    echo ""
    echo "🔐 Generating secure passwords..."

    # Generate random passwords
    DB_ROOT_PASSWORD=$(openssl rand -base64 24)
    DB_PASSWORD=$(openssl rand -base64 24)
    JWT_SECRET=$(openssl rand -base64 48)

    # Update .env file
    sed -i "s/your_secure_root_password_here/$DB_ROOT_PASSWORD/g" .env
    sed -i "s/your_secure_db_password_here/$DB_PASSWORD/g" .env
    sed -i "s/your_super_secret_jwt_key_minimum_32_characters_long/$JWT_SECRET/g" .env

    echo "✅ .env file created with secure passwords!"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and set your FRONTEND_URL"
    echo "   nano .env"
    echo ""
    read -p "Press Enter to continue or Ctrl+C to exit and edit .env..."
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker first: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "🚀 Starting CodeLog..."
echo ""

# Build and start containers
docker compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║                                       ║"
    echo "║   ✅ CodeLog is now running!          ║"
    echo "║                                       ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""
    echo "🌐 Access CodeLog at:"
    echo "   http://localhost"
    echo ""
    echo "📊 Check service status:"
    echo "   docker compose ps"
    echo ""
    echo "📝 View logs:"
    echo "   docker compose logs -f"
    echo ""
    echo "🛑 Stop CodeLog:"
    echo "   docker compose down"
    echo ""
else
    echo ""
    echo "❌ Something went wrong. Checking logs..."
    docker compose logs --tail=50
    echo ""
    echo "Please check the error messages above."
fi
