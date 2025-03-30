#!/bin/bash

# Create mock GraphQL files if they don't exist
mkdir -p src/graphql/data/__generated__
mkdir -p src/graphql/thegraph/__generated__

# Set environment variables
export NODE_OPTIONS=--openssl-legacy-provider
export GENERATE_SOURCEMAP=false
export TSC_COMPILE_ON_ERROR=true
export DISABLE_ESLINT_PLUGIN=true
export SKIP_PREFLIGHT_CHECK=true
export REACT_APP_BABEL_REACT_RUNTIME=automatic

# Apply a manual fix for the React import in Privacy Policy
# This is needed because certain components use JSX in objects/arrays outside of component functions
echo "Adding React import to problematic files..."
for file in $(find src -name "*.tsx" -type f); do
  if ! grep -q "import React" "$file"; then
    sed -i '1s/^/import React from "react";\n/' "$file"
    echo "Added React import to $file"
  fi
done

# Start the development server
echo "Starting development server..."
yarn start 