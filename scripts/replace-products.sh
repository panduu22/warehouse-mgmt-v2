#!/bin/bash

# Script to replace products in a warehouse
# Usage: ./scripts/replace-products.sh

echo "🏭 Warehouse Product Replacement Tool"
echo "======================================"
echo ""

# Check if tsx is installed
if ! command -v tsx &> /dev/null; then
    echo "📦 Installing tsx..."
    npm install -g tsx
fi

# Get list of warehouses
echo "📋 Fetching warehouses..."
echo ""

# Run the replacement script
echo "To get your warehouse ID, run:"
echo "  npx prisma studio"
echo ""
echo "Then find your warehouse ID and run:"
echo "  npx tsx scripts/replace-warehouse-products.ts <warehouse-id>"
echo ""
echo "Example:"
echo "  npx tsx scripts/replace-warehouse-products.ts 507f1f77bcf86cd799439011"
