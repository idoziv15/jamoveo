#!/bin/bash

# Exit on any error
set -e

# Step 1: install server dependencies
echo "Installing server dependencies..."
npm install

# Step 2: build client
echo "🛠 Building frontend..."
cd ../client
npm install
npx vite build

# Step 3: copy to server/public
echo "Copying frontend to server/public..."
rm -rf ../server/public
cp -r dist ../server/public
