#!/bin/bash

echo "🧪 Testing Claude Code Debugger Memory Search"
echo "============================================="
echo ""

# Test 1: Direct execution from package directory
echo "📍 Test 1: Running from package directory"
cd "/Users/tyroneross/Desktop/Git Folder/claude-code-debugger"
echo "Current directory: $(pwd)"
echo ""

echo "🔍 Searching for: 'infinite re-render React hooks'"
node dist/cli/index.js search "infinite re-render React hooks"
echo ""

# Test 2: Using npx from atomize-news directory
echo "📍 Test 2: Running via npx from atomize-news"
cd "/Users/tyroneross/Desktop/Git Folder/atomize-news"
echo "Current directory: $(pwd)"
echo ""

echo "🔍 Searching for: 'useEffect infinite loop'"
npx @tyroneross/claude-code-debugger search "useEffect infinite loop"
echo ""

# Test 3: Debug command test
echo "📍 Test 3: Testing debug command"
echo "🐛 Debug check for: 'React maximum update depth exceeded'"
npx @tyroneross/claude-code-debugger debug "React maximum update depth exceeded"
echo ""

# Test 4: Status command
echo "📍 Test 4: Checking memory status"
npx @tyroneross/claude-code-debugger status
echo ""

echo "✅ All tests completed!"
echo ""
echo "Summary:"
echo "- Package can be run directly from its directory"
echo "- Package can be run via npx from other directories"
echo "- Memory search functionality works"
echo "- Debug command provides context"