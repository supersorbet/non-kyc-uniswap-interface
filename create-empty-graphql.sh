#!/bin/bash

# Create directories if they don't exist
mkdir -p src/graphql/thegraph/__generated__

# Create empty AllV3TicksQuery.graphql.ts file
cat > src/graphql/thegraph/__generated__/AllV3TicksQuery.graphql.ts << 'EOF'
// Mock generated file
export type AllV3TicksQuery = {
  readonly response: any;
  readonly variables: {
    poolAddress: string;
    skip: number;
  };
};

export type AllV3TicksQuery$data = {
  readonly ticks: ReadonlyArray<{
    readonly tick: number;
    readonly liquidityNet: string;
    readonly price0: string;
    readonly price1: string;
  }>;
};
EOF

# Create empty FeeTierDistributionQuery.graphql.ts file
cat > src/graphql/thegraph/__generated__/FeeTierDistributionQuery.graphql.ts << 'EOF'
// Mock generated file
export type FeeTierDistributionQuery = {
  readonly response: any;
  readonly variables: {
    token0: string;
    token1: string;
  };
};

export type FeeTierDistributionQuery$data = {
  readonly _meta: {
    readonly block: {
      readonly number: number;
    };
  };
  readonly asToken0: ReadonlyArray<{
    readonly feeTier: string;
    readonly totalValueLockedToken0: string;
    readonly totalValueLockedToken1: string;
  }>;
  readonly asToken1: ReadonlyArray<{
    readonly feeTier: string;
    readonly totalValueLockedToken0: string;
    readonly totalValueLockedToken1: string;
  }>;
};
EOF

# Add any other files that might be needed
echo "Created mock GraphQL generated files" 