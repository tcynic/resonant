#!/bin/bash

# /push slash command for Claude Code CLI
# Runs prettier, commits, and pushes code with a generated commit message

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[PUSH]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PUSH]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[PUSH]${NC} $1"
}

print_error() {
    echo -e "${RED}[PUSH]${NC} $1"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Check if there are any changes to commit
if git diff --quiet && git diff --cached --quiet; then
    print_warning "No changes to commit"
    exit 0
fi

print_status "Starting /push command..."

# Step 1: Run prettier
print_status "Running prettier..."
if npm run format > /dev/null 2>&1; then
    print_success "Prettier formatting completed"
else
    print_warning "Prettier completed with warnings (some files may have syntax errors)"
fi

# Step 2: Check git status and generate commit message
print_status "Analyzing changes..."

# Get list of modified files
MODIFIED_FILES=$(git diff --name-only)
STAGED_FILES=$(git diff --cached --name-only)
ALL_CHANGED_FILES=$(echo -e "$MODIFIED_FILES\n$STAGED_FILES" | sort -u | grep -v '^$' || true)

# Count changes by type
TS_CHANGES=$(echo "$ALL_CHANGED_FILES" | grep -E '\.(ts|tsx)$' | wc -l | tr -d ' ')
JS_CHANGES=$(echo "$ALL_CHANGED_FILES" | grep -E '\.(js|jsx)$' | wc -l | tr -d ' ')
CSS_CHANGES=$(echo "$ALL_CHANGED_FILES" | grep -E '\.(css|scss|sass)$' | wc -l | tr -d ' ')
CONFIG_CHANGES=$(echo "$ALL_CHANGED_FILES" | grep -E '\.(json|yaml|yml|toml|config\.|\.config)' | wc -l | tr -d ' ')
TEST_CHANGES=$(echo "$ALL_CHANGED_FILES" | grep -E '\.test\.|\.spec\.|__tests__' | wc -l | tr -d ' ')
DOC_CHANGES=$(echo "$ALL_CHANGED_FILES" | grep -E '\.(md|txt|rst)$' | wc -l | tr -d ' ')

# Generate commit message based on changes
COMMIT_TYPE="feat"
COMMIT_SCOPE=""
COMMIT_DESCRIPTION=""

# Determine commit type and description
if [ "$TEST_CHANGES" -gt 0 ] && [ "$((TS_CHANGES + JS_CHANGES))" -eq 0 ]; then
    COMMIT_TYPE="test"
    COMMIT_DESCRIPTION="Add/update tests"
elif [ "$DOC_CHANGES" -gt 0 ] && [ "$((TS_CHANGES + JS_CHANGES + CSS_CHANGES))" -eq 0 ]; then
    COMMIT_TYPE="docs"
    COMMIT_DESCRIPTION="Update documentation"
elif [ "$CONFIG_CHANGES" -gt 0 ] && [ "$((TS_CHANGES + JS_CHANGES + CSS_CHANGES))" -eq 0 ]; then
    COMMIT_TYPE="chore"
    COMMIT_DESCRIPTION="Update configuration"
elif [ "$CSS_CHANGES" -gt 0 ] && [ "$((TS_CHANGES + JS_CHANGES))" -eq 0 ]; then
    COMMIT_TYPE="style"
    COMMIT_DESCRIPTION="Update styles"
else
    # Check for specific patterns in file names to determine scope
    if echo "$ALL_CHANGED_FILES" | grep -q "dashboard"; then
        COMMIT_SCOPE="dashboard"
    elif echo "$ALL_CHANGED_FILES" | grep -q "journal"; then
        COMMIT_SCOPE="journal"
    elif echo "$ALL_CHANGED_FILES" | grep -q "relationship"; then
        COMMIT_SCOPE="relationships"
    elif echo "$ALL_CHANGED_FILES" | grep -q "auth"; then
        COMMIT_SCOPE="auth"
    elif echo "$ALL_CHANGED_FILES" | grep -q "notification"; then
        COMMIT_SCOPE="notifications"
    elif echo "$ALL_CHANGED_FILES" | grep -q "search"; then
        COMMIT_SCOPE="search"
    elif echo "$ALL_CHANGED_FILES" | grep -q "convex"; then
        COMMIT_SCOPE="backend"
    fi
    
    COMMIT_DESCRIPTION="Update components and functionality"
fi

# Build commit message
if [ -n "$COMMIT_SCOPE" ]; then
    COMMIT_MSG="${COMMIT_TYPE}(${COMMIT_SCOPE}): ${COMMIT_DESCRIPTION}"
else
    COMMIT_MSG="${COMMIT_TYPE}: ${COMMIT_DESCRIPTION}"
fi

# Add file summary to commit body
COMMIT_BODY=""
if [ "$TS_CHANGES" -gt 0 ]; then
    COMMIT_BODY="${COMMIT_BODY}- Update ${TS_CHANGES} TypeScript file(s)\n"
fi
if [ "$JS_CHANGES" -gt 0 ]; then
    COMMIT_BODY="${COMMIT_BODY}- Update ${JS_CHANGES} JavaScript file(s)\n"
fi
if [ "$CSS_CHANGES" -gt 0 ]; then
    COMMIT_BODY="${COMMIT_BODY}- Update ${CSS_CHANGES} CSS file(s)\n"
fi
if [ "$TEST_CHANGES" -gt 0 ]; then
    COMMIT_BODY="${COMMIT_BODY}- Update ${TEST_CHANGES} test file(s)\n"
fi
if [ "$CONFIG_CHANGES" -gt 0 ]; then
    COMMIT_BODY="${COMMIT_BODY}- Update ${CONFIG_CHANGES} config file(s)\n"
fi
if [ "$DOC_CHANGES" -gt 0 ]; then
    COMMIT_BODY="${COMMIT_BODY}- Update ${DOC_CHANGES} documentation file(s)\n"
fi

# Add Claude Code signature
COMMIT_BODY="${COMMIT_BODY}\n🤖 Generated with [Claude Code](https://claude.ai/code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

print_status "Generated commit message: $COMMIT_MSG"

# Step 3: Stage all changes
print_status "Staging changes..."
git add .

# Step 4: Commit with generated message
print_status "Committing changes..."
if [ -n "$COMMIT_BODY" ]; then
    git commit -m "$COMMIT_MSG" -m "$(echo -e "$COMMIT_BODY")"
else
    git commit -m "$COMMIT_MSG"
fi

print_success "Changes committed successfully"

# Step 5: Push to remote
print_status "Pushing to remote..."
CURRENT_BRANCH=$(git branch --show-current)

if git push 2>/dev/null; then
    print_success "Successfully pushed to origin/$CURRENT_BRANCH"
else
    # If push fails, try to set upstream
    print_status "Setting upstream and pushing..."
    if git push -u origin "$CURRENT_BRANCH"; then
        print_success "Successfully pushed to origin/$CURRENT_BRANCH (upstream set)"
    else
        print_error "Failed to push to remote"
        exit 1
    fi
fi

# Step 6: Show summary
print_success "✨ /push command completed successfully!"
echo ""
print_status "Summary:"
echo "  • Formatted code with prettier"
echo "  • Committed $(echo "$ALL_CHANGED_FILES" | wc -l | tr -d ' ') file(s)"
echo "  • Pushed to origin/$CURRENT_BRANCH"
echo ""
print_status "Commit: $COMMIT_MSG"