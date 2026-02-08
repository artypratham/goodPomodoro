#!/bin/bash
# Setup script for Pomodoro Focus

echo "🍅 Setting up Pomodoro Focus..."

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)

if [ -z "$NODE_VERSION" ]; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Redis is available
echo "🔍 Checking Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is installed but not running"
        echo "   Start with: redis-server"
        echo "   Or: brew services start redis (macOS)"
        echo "   App will work in offline mode without Redis"
    fi
else
    echo "⚠️  Redis is not installed"
    echo "   Install with:"
    echo "   - macOS: brew install redis"
    echo "   - Ubuntu: sudo apt install redis-server"
    echo "   - Windows: Use Docker or WSL"
    echo "   App will work in offline mode without Redis"
fi

# Create placeholder icons if they don't exist
if [ ! -f "assets/icon.png" ]; then
    echo "📷 Note: Icon files not generated."
    echo "   For production builds, generate icons from assets/icon.svg"
    echo "   You can use tools like: electron-icon-builder"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the application:"
echo "  npm run dev     - Development mode"
echo "  npm start       - Start Electron app"
echo ""
echo "To build for distribution:"
echo "  npm run build:win   - Build for Windows"
echo "  npm run build:mac   - Build for macOS"
echo ""
