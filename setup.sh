#!/bin/bash

echo "🚀 BetSnap Setup Script"
echo "======================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Install it with: brew install gh"
    echo "Then run: gh auth login"
    exit 1
fi

# Check if user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub."
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Get GitHub username
GITHUB_USER=$(gh api user --jq '.login')
echo "GitHub user: $GITHUB_USER"
echo ""

# Ask for repository name
read -p "Enter repository name (default: betsnap): " REPO_NAME
REPO_NAME=${REPO_NAME:-betsnap}

# Ask if repository should be private or public
read -p "Make repository private? (y/N): " PRIVATE_REPO
if [[ $PRIVATE_REPO =~ ^[Yy]$ ]]; then
    VISIBILITY="--private"
else
    VISIBILITY="--public"
fi

echo ""
echo "Creating repository: $REPO_NAME"
echo "Visibility: ${VISIBILITY#--}"
echo ""

# Create GitHub repository
if gh repo create "$REPO_NAME" $VISIBILITY --description "AI-powered sports betting tracker with Google Sheets integration" --source=. --remote=origin --push; then
    echo "✅ Repository created and code pushed successfully!"
    echo ""
    echo "Repository URL: https://github.com/$GITHUB_USER/$REPO_NAME"
    echo ""
else
    echo "❌ Failed to create repository"
    exit 1
fi

echo "📋 Next Steps:"
echo "============="
echo ""
echo "1. Set up Supabase:"
echo "   - Go to https://supabase.com and create a new project"
echo "   - Run the migration script in supabase/migrations/001_initial_schema.sql"
echo "   - Copy your project URL and keys"
echo ""
echo "2. Create .env file:"
echo "   cp .env.example .env"
echo "   # Then edit .env with your credentials"
echo ""
echo "3. Install Supabase dependencies:"
echo "   npm install @supabase/supabase-js @supabase/auth-helpers-react"
echo ""
echo "4. Deploy to Vercel:"
echo "   - Go to https://vercel.com"
echo "   - Import your GitHub repository"
echo "   - Add environment variables from .env"
echo "   - Deploy!"
echo ""
echo "5. Set up Stripe webhooks:"
echo "   - In Stripe dashboard, add webhook endpoint: https://your-app.vercel.app/api/stripe/webhook"
echo "   - Copy the webhook secret to Vercel environment variables"
echo ""
echo "Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "Good luck with your deployment! 🎉"