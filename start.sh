#!/bin/bash
# Quick Start Script for Bode CRM

echo "🏢 Bode CRM - Quick Start"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the bode-crm directory."
    exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js $(node --version) found"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "📝 Environment Setup:"
echo "The .env.local file is ready with default MongoDB settings."
echo "If you want to use a different MongoDB instance:"
echo "  1. Edit .env.local"
echo "  2. Update MONGODB_URI to your MongoDB connection string"
echo ""

echo "🚀 Starting development server..."
echo "The app will be available at http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

npm run dev
