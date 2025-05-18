#!/bin/bash

# Exit on any error
set -e

# Install server dependencies
echo "Installing server dependencies..."
npm install

# Install Chromium for Puppeteer
echo "Installing Chromium for Puppeteer..."
npx puppeteer browsers install chrome

# Build client
echo "🛠 Building frontend..."
cd ../client
npm install
npx vite build

# Copy to server/public
echo "Copying frontend to server/public..."
rm -rf ../server/public
cp -r dist ../server/public
