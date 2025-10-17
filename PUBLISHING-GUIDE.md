# Setup Guide for Claude Memory Package

This guide will help you publish the package to GitHub Packages and install it in other projects.

## Prerequisites

1. GitHub account
2. Node.js 18+ installed
3. npm configured

## Step 1: Update Package Information

Before publishing, update these files:

### package.json
Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username:
```json
{
  "name": "@YOUR_GITHUB_USERNAME/claude-memory",
  "repository": {
    "url": "https://github.com/YOUR_GITHUB_USERNAME/claude-memory.git"
  }
}
```

### README.md
Search and replace all instances of `YOUR_GITHUB_USERNAME` with your GitHub username.

## Step 2: Create GitHub Repository

```bash
# Initialize git (if not already done)
cd claude-memory
git init

# Create repository on GitHub (via web interface or gh CLI)
gh repo create claude-memory --private

# Add remote and push
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/claude-memory.git
git add .
git commit -m "Initial commit: Claude Memory debugging system"
git push -u origin main
```

## Step 3: Generate GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "NPM Package Publishing"
4. Select scopes:
   - ✅ `write:packages` (includes read:packages)
   - ✅ `delete:packages` (optional, for unpublishing)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

## Step 4: Configure npm Authentication

Create or edit `~/.npmrc`:

```bash
# Open in editor
nano ~/.npmrc

# Add these lines (replace YOUR_GITHUB_USERNAME and paste your token)
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Security Note:** Never commit `.npmrc` with your token to git!

## Step 5: Build and Publish

```bash
# Ensure everything is built
npm run build

# Publish to GitHub Packages
npm publish

# You should see:
# npm notice Publishing to https://npm.pkg.github.com
# + @YOUR_GITHUB_USERNAME/claude-memory@1.0.0
```

## Step 6: Install in Other Projects

### Option A: Project Installation

```bash
cd /path/to/your/project

# Install the package
npm install @YOUR_GITHUB_USERNAME/claude-memory

# Use in code
import { debugWithMemory } from '@YOUR_GITHUB_USERNAME/claude-memory';
```

### Option B: Global Installation (for CLI)

```bash
# Install globally
npm install -g @YOUR_GITHUB_USERNAME/claude-memory

# Use CLI from anywhere
claude-memory --help
claude-memory debug "symptom description"
```

## Step 7: Verify Installation

```bash
# Check it's installed
npm list @YOUR_GITHUB_USERNAME/claude-memory

# Test CLI
claude-memory config
claude-memory status

# Test in code
node -e "const m = require('@YOUR_GITHUB_USERNAME/claude-memory'); console.log(m);"
```

## Updating the Package

### 1. Make Changes

Edit source files in `src/`

### 2. Update Version

```bash
# Patch release (bug fixes): 1.0.0 → 1.0.1
npm version patch

# Minor release (new features): 1.0.0 → 1.1.0
npm version minor

# Major release (breaking changes): 1.0.0 → 2.0.0
npm version major
```

### 3. Build and Publish

```bash
npm run build
npm publish
```

### 4. Update in Consumer Projects

```bash
cd /path/to/consuming/project

# Update to latest
npm update @YOUR_GITHUB_USERNAME/claude-memory

# Or install specific version
npm install @YOUR_GITHUB_USERNAME/claude-memory@1.1.0
```

## Troubleshooting

### "npm ERR! 404 Not Found"

**Cause:** Package not found in GitHub Packages

**Solutions:**
1. Verify package was published: Check GitHub → Packages
2. Ensure `.npmrc` has correct username
3. Verify token has `read:packages` permission

### "npm ERR! 403 Forbidden"

**Cause:** Authentication failed

**Solutions:**
1. Check token in `~/.npmrc` is correct
2. Regenerate token with correct scopes
3. Ensure token hasn't expired

### "Error: Cannot find module"

**Cause:** Package not installed or import path wrong

**Solutions:**
1. Run `npm install @YOUR_GITHUB_USERNAME/claude-memory`
2. Check import statement matches package name
3. Verify package.json has correct exports

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

## Using in atomize-news

Once published, update atomize-news to use the package:

### 1. Install Package

```bash
cd /path/to/atomize-news
npm install @YOUR_GITHUB_USERNAME/claude-memory
```

### 2. Remove Old Implementation

```bash
# Remove old memory system (back up first!)
mv .claude/lib/memory .claude/lib/memory.backup
```

### 3. Update Code

Replace imports:

```typescript
// Old
import { debugWithMemory } from './.claude/lib/debug-with-memory';

// New
import { debugWithMemory } from '@YOUR_GITHUB_USERNAME/claude-memory';
```

### 4. Configure Storage Mode

```bash
# Use shared mode across all projects
export CLAUDE_MEMORY_MODE=shared

# Or in .env file
echo "CLAUDE_MEMORY_MODE=shared" >> .env
```

### 5. Migrate Data (Optional)

```bash
# Copy existing incidents to shared memory
mkdir -p ~/.claude-memory/incidents
cp .claude/memory/incidents/* ~/.claude-memory/incidents/

# Copy patterns
mkdir -p ~/.claude-memory/patterns
cp .claude/memory/patterns/* ~/.claude-memory/patterns/
```

## Environment Configuration

### Project-Specific (.env)

```bash
# .env in project root
CLAUDE_MEMORY_MODE=local
CLAUDE_MEMORY_PATH=./.claude/memory
```

### Global (shell profile)

```bash
# Add to ~/.bashrc or ~/.zshrc
export CLAUDE_MEMORY_MODE=shared
export CLAUDE_MEMORY_PATH=$HOME/.claude-memory
```

## Testing the Package

```bash
# Run all tests
npm test

# Test specific command
node dist/cli/index.js debug "test symptom"

# Test TypeScript imports
npx ts-node -e "import {checkMemory} from './src'; checkMemory('test')"
```

## Next Steps

1. ✅ Publish package to GitHub Packages
2. ✅ Install in atomize-news project
3. ✅ Test CLI commands
4. ✅ Test programmatic API
5. ✅ Migrate existing incidents (optional)
6. ✅ Set up shared memory mode
7. ✅ Update agent prompts to use the package

## Resources

- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [npm Publishing Guide](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)

---

**Questions?** Open an issue on the GitHub repository.
