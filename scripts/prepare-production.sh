#!/bin/bash

# Production Preparation Script
# This script helps prepare the application for production deployment

set -e

echo "🚀 Production Preparation Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
check_env_files() {
    echo "📋 Checking environment files..."
    
    if [ ! -f "server/.env" ]; then
        echo -e "${YELLOW}⚠️  server/.env not found${NC}"
        echo "   Creating from server/env.example..."
        cp server/env.example server/.env
        echo -e "${GREEN}✅ Created server/.env${NC}"
        echo -e "${YELLOW}⚠️  Please update server/.env with production values!${NC}"
    else
        echo -e "${GREEN}✅ server/.env exists${NC}"
    fi
    
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  Root .env not found${NC}"
        echo "   Creating from env.example..."
        cp env.example .env
        echo -e "${GREEN}✅ Created .env${NC}"
        echo -e "${YELLOW}⚠️  Please update .env with production values!${NC}"
    else
        echo -e "${GREEN}✅ .env exists${NC}"
    fi
    
    if [ ! -f "client/.env.production" ]; then
        echo -e "${YELLOW}⚠️  client/.env.production not found${NC}"
        echo "   Creating template..."
        cat > client/.env.production << EOF
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
EOF
        echo -e "${GREEN}✅ Created client/.env.production${NC}"
        echo -e "${YELLOW}⚠️  Please update client/.env.production with your domain!${NC}"
    else
        echo -e "${GREEN}✅ client/.env.production exists${NC}"
    fi
}

# Generate secrets
generate_secrets() {
    echo ""
    echo "🔐 Generating secure secrets..."
    
    if command -v node &> /dev/null; then
        node scripts/generate-secrets.js
    else
        echo -e "${RED}❌ Node.js not found. Please install Node.js to generate secrets.${NC}"
        echo "   Or use: openssl rand -hex 32"
    fi
}

# Check dependencies
check_dependencies() {
    echo ""
    echo "📦 Checking dependencies..."
    
    if [ -d "server/node_modules" ]; then
        echo -e "${GREEN}✅ Server dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Server dependencies not installed${NC}"
        echo "   Run: cd server && npm install"
    fi
    
    if [ -d "client/node_modules" ]; then
        echo -e "${GREEN}✅ Client dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Client dependencies not installed${NC}"
        echo "   Run: cd client && npm install"
    fi
}

# Run security audit
run_security_audit() {
    echo ""
    echo "🔒 Running security audit..."
    
    if [ -d "server/node_modules" ]; then
        echo "   Checking server dependencies..."
        cd server
        npm audit --audit-level=moderate || echo -e "${YELLOW}⚠️  Some vulnerabilities found. Review and update dependencies.${NC}"
        cd ..
    fi
    
    if [ -d "client/node_modules" ]; then
        echo "   Checking client dependencies..."
        cd client
        npm audit --audit-level=moderate || echo -e "${YELLOW}⚠️  Some vulnerabilities found. Review and update dependencies.${NC}"
        cd ..
    fi
}

# Build check
check_builds() {
    echo ""
    echo "🏗️  Checking builds..."
    
    if [ -d "server/dist" ]; then
        echo -e "${GREEN}✅ Server build exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Server not built. Run: cd server && npm run build${NC}"
    fi
    
    if [ -d "client/dist" ]; then
        echo -e "${GREEN}✅ Client build exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Client not built. Run: cd client && npm run build${NC}"
    fi
}

# Check Docker
check_docker() {
    echo ""
    echo "🐳 Checking Docker..."
    
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✅ Docker installed${NC}"
        
        if docker ps &> /dev/null; then
            echo -e "${GREEN}✅ Docker daemon running${NC}"
        else
            echo -e "${RED}❌ Docker daemon not running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Docker not installed${NC}"
    fi
    
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo -e "${GREEN}✅ Docker Compose available${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker Compose not found${NC}"
    fi
}

# Main execution
main() {
    check_env_files
    check_dependencies
    check_builds
    check_docker
    run_security_audit
    
    echo ""
    echo "================================"
    echo -e "${GREEN}✅ Production preparation check complete!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Update environment files with production values"
    echo "   2. Generate and set secure secrets"
    echo "   3. Review security audit results"
    echo "   4. Build the application: npm run build (in server and client)"
    echo "   5. Test the build locally"
    echo "   6. Deploy using Docker Compose or Kubernetes"
    echo ""
    echo "📚 See docs/PRODUCTION_DEPLOYMENT.md for detailed instructions"
    echo ""
}

# Run main function
main
