#!/bin/bash

# Create mock GraphQL files
mkdir -p src/graphql/data/__generated__
mkdir -p src/graphql/thegraph/__generated__

# Set environment variables
export NODE_OPTIONS=--openssl-legacy-provider
export GENERATE_SOURCEMAP=false
export TSC_COMPILE_ON_ERROR=true
export DISABLE_ESLINT_PLUGIN=true
export DISABLE_NEW_JSX_TRANSFORM=true
export SKIP_PREFLIGHT_CHECK=true

# Run the build with simplified settings
yarn build:simple 