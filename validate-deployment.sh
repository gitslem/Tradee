#!/bin/bash
# Firebase Deployment Validation Script
# This script validates all requirements for Firebase deployment

set -e

echo "🔍 Firebase Deployment Validation"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ((ERRORS++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# 1. Check Node.js version
echo "1. Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   Node.js version: $NODE_VERSION"
    print_status 0 "Node.js is installed"
else
    print_status 1 "Node.js is not installed"
fi
echo ""

# 2. Check npm
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "   npm version: $NPM_VERSION"
    print_status 0 "npm is installed"
else
    print_status 1 "npm is not installed"
fi
echo ""

# 3. Check package.json
echo "3. Checking package.json..."
if [ -f "package.json" ]; then
    print_status 0 "package.json exists"

    # Check build script
    if grep -q '"build"' package.json; then
        print_status 0 "Build script is defined"
    else
        print_status 1 "Build script is missing"
    fi
else
    print_status 1 "package.json not found"
fi
echo ""

# 4. Check Firebase configuration
echo "4. Checking Firebase configuration..."
if [ -f ".firebaserc" ]; then
    print_status 0 ".firebaserc exists"

    # Check project ID
    if grep -q '"traddii"' .firebaserc; then
        print_status 0 "Project ID 'traddii' is configured"
    else
        print_warning "Project ID might not be 'traddii'"
    fi
else
    print_status 1 ".firebaserc not found"
fi

if [ -f "firebase.json" ]; then
    print_status 0 "firebase.json exists"

    # Check hosting config
    if grep -q '"hosting"' firebase.json; then
        print_status 0 "Hosting configuration found"
    else
        print_status 1 "Hosting configuration missing"
    fi

    # Check public directory
    if grep -q '"dist"' firebase.json; then
        print_status 0 "Public directory set to 'dist'"
    else
        print_warning "Public directory might not be 'dist'"
    fi
else
    print_status 1 "firebase.json not found"
fi
echo ""

# 5. Check GitHub Actions workflows
echo "5. Checking GitHub Actions workflows..."
if [ -d ".github/workflows" ]; then
    print_status 0 ".github/workflows directory exists"

    if [ -f ".github/workflows/firebase-deploy.yml" ]; then
        print_status 0 "firebase-deploy.yml exists"

        # Check if projectId is hardcoded
        if grep -q 'projectId: traddii' .github/workflows/firebase-deploy.yml; then
            print_status 0 "Project ID is hardcoded in workflow"
        else
            print_warning "Project ID might be using secrets (can cause issues)"
        fi
    else
        print_status 1 "firebase-deploy.yml not found"
    fi

    if [ -f ".github/workflows/firebase-preview.yml" ]; then
        print_status 0 "firebase-preview.yml exists"
    else
        print_warning "firebase-preview.yml not found"
    fi
else
    print_status 1 ".github/workflows directory not found"
fi
echo ""

# 6. Test dependencies installation
echo "6. Testing dependency installation..."
if npm ci --dry-run &> /dev/null; then
    print_status 0 "npm ci (dry-run) successful"
else
    print_warning "npm ci (dry-run) had warnings"
fi
echo ""

# 7. Test build
echo "7. Testing build process..."
echo "   Running: npm run build"
if npm run build > /tmp/build.log 2>&1; then
    print_status 0 "Build successful"

    # Check dist directory
    if [ -d "dist" ]; then
        print_status 0 "dist directory created"

        # Check index.html
        if [ -f "dist/index.html" ]; then
            print_status 0 "dist/index.html exists"
        else
            print_status 1 "dist/index.html not found"
        fi

        # Check assets
        if [ -d "dist/assets" ]; then
            print_status 0 "dist/assets directory exists"

            # Count files
            ASSET_COUNT=$(ls -1 dist/assets | wc -l)
            echo "   Found $ASSET_COUNT asset files"
        else
            print_warning "dist/assets directory not found"
        fi
    else
        print_status 1 "dist directory not created"
    fi
else
    print_status 1 "Build failed - check /tmp/build.log"
    echo "   Last 10 lines of build log:"
    tail -10 /tmp/build.log | sed 's/^/   /'
fi
echo ""

# Summary
echo "=================================="
echo "📊 Validation Summary"
echo "=================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your project is ready for Firebase deployment."
    echo ""
    echo "Next steps:"
    echo "1. Ensure GitHub secrets are configured:"
    echo "   - FIREBASE_SERVICE_ACCOUNT (JSON from Firebase)"
    echo "2. Push to main branch to trigger deployment"
    echo "3. Check GitHub Actions tab for deployment status"
    EXIT_CODE=0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo "The project should deploy, but review warnings above."
    EXIT_CODE=0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors above before attempting deployment."
    EXIT_CODE=1
fi

echo ""
exit $EXIT_CODE
