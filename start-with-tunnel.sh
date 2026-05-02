#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Analytics Dashboard + ngrok Tunnel${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${YELLOW}⚠️  ngrok not found. Install it:${NC}"
    echo "   macOS: brew install ngrok"
    echo "   Or download: https://ngrok.com/download"
    exit 1
fi

# Check if ngrok auth token is set
if ! ngrok config check &> /dev/null; then
    echo -e "${YELLOW}⚠️  ngrok auth token not configured${NC}"
    echo "   1. Get your token: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "   2. Run: ngrok config add-authtoken YOUR_TOKEN"
    exit 1
fi

echo -e "${GREEN}✓ ngrok is installed and configured${NC}"
echo ""

# Start local server in background
echo -e "${BLUE}Starting Next.js server on port 3000...${NC}"
npm run dev > .next/dev-server.log 2>&1 &
DEV_PID=$!
echo -e "${GREEN}✓ Development server PID: $DEV_PID${NC}"

sleep 3

# Check if dev server started successfully
if ! kill -0 $DEV_PID 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Dev server failed to start. Check logs:${NC}"
    cat .next/dev-server.log
    exit 1
fi

# Verify local API is working
echo -e "${BLUE}Verifying local API...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/brands)
if [ "$RESPONSE" != "200" ]; then
    echo -e "${YELLOW}⚠️  Local API returned status $RESPONSE${NC}"
    kill $DEV_PID
    exit 1
fi
echo -e "${GREEN}✓ Local API is working${NC}"
echo ""

# Start ngrok tunnel
echo -e "${BLUE}Starting ngrok tunnel...${NC}"
ngrok http 3000 --log=stdout > .next/ngrok.log 2>&1 &
NGROK_PID=$!
echo -e "${GREEN}✓ ngrok PID: $NGROK_PID${NC}"

sleep 3

# Extract ngrok URL
NGROK_URL=$(grep -oP 'https://[^"]+\.ngrok\.io' .next/ngrok.log | head -1)

if [ -z "$NGROK_URL" ]; then
    echo -e "${YELLOW}⚠️  Failed to start ngrok tunnel${NC}"
    kill $DEV_PID $NGROK_PID 2>/dev/null
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Everything is running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Local Server:${NC}"
echo "  http://localhost:3000"
echo ""
echo -e "${BLUE}Public Tunnel URL:${NC}"
echo -e "${YELLOW}  $NGROK_URL${NC}"
echo ""
echo -e "${BLUE}For Amplify Deployment:${NC}"
echo "  1. Go to Amplify Console"
echo "  2. Settings → Environment Variables"
echo "  3. Add: NEXT_PUBLIC_API_URL = ${NGROK_URL}"
echo "  4. Redeploy"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo "  Dev Server: tail -f .next/dev-server.log"
echo "  ngrok:      tail -f .next/ngrok.log"
echo ""
echo -e "${YELLOW}⚠️  Keep this terminal open to maintain the tunnel${NC}"
echo ""

# Wait for processes
wait $DEV_PID $NGROK_PID

# Cleanup on exit
trap "kill $DEV_PID $NGROK_PID 2>/dev/null; echo -e '\n${GREEN}Stopped${NC}'" EXIT
