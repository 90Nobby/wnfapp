#!/bin/bash

# Quick Demo Script for Football Match Management App
# This script helps you test the app quickly

echo "⚽ Football Match Management App - Quick Demo"
echo "============================================="
echo ""

# Check if server is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✓ Server is already running on port 3000"
else
    echo "✗ Server is not running"
    echo "  Please run: npm run dev"
    echo ""
    exit 1
fi

echo ""
echo "📱 Quick Test Steps:"
echo ""
echo "1. Open as MANAGER:"
echo "   → Copy the manager link from 'npm run init'"
echo "   → Open in your browser"
echo "   → Create your manager account"
echo ""
echo "2. Create a test match:"
echo "   → Click '+ Create Match'"
echo "   → Date: $(date -d tomorrow '+%Y-%m-%d' 2>/dev/null || date -v +1d '+%Y-%m-%d' 2>/dev/null || echo 'tomorrow')"
echo "   → Time: 19:00"
echo "   → Location: Test Arena"
echo ""
echo "3. Open as PLAYER (use incognito/private window):"
echo "   → http://localhost:3000/join"
echo "   → Create a test player account"
echo "   → Mark yourself available for the match"
echo ""
echo "4. Back to MANAGER view:"
echo "   → Click 'Manage' on your match"
echo "   → See your test player in the list"
echo "   → Click 'Generate Teams'"
echo "   → Click 'Copy Teams'"
echo ""
echo "5. Complete the match:"
echo "   → Click 'Mark as Completed'"
echo "   → Check Players tab to see balance updated"
echo ""
echo "============================================="
echo ""
echo "Need the manager link again?"
echo "Run: npm run init"
echo ""
