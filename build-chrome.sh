#!/bin/bash

# Build script for Chrome extension store submission
# Creates a clean ZIP file without development files

VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
FILENAME="dist/ai-prompt-injector-v${VERSION}-chrome.zip"

echo "Building Chrome extension package v${VERSION}..."

# Create dist directory if it doesn't exist
mkdir -p dist

# Remove old build if exists
rm -f "$FILENAME"

# Create temporary directory for clean build
TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"

# Copy files preserving structure
cp manifest.json "$TEMP_DIR/"
cp *.js "$TEMP_DIR/"
cp *.html "$TEMP_DIR/"
cp *.css "$TEMP_DIR/"
mkdir -p "$TEMP_DIR/icons"
cp icons/*.png "$TEMP_DIR/icons/"
cp PRIVACY.md LICENSE README.md "$TEMP_DIR/" 2>/dev/null || true

# Create ZIP from temp directory using Python
python3 -c "
import zipfile
import os
from pathlib import Path

temp_dir = '$TEMP_DIR'
output_file = '$FILENAME'

with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(temp_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, temp_dir)
            zf.write(file_path, arcname)
"

# Clean up
rm -rf "$TEMP_DIR"

echo "✅ Chrome extension package created: $FILENAME"
echo "📦 Size: $(du -h "$FILENAME" | cut -f1)"
echo ""
echo "Ready for submission to Chrome Web Store!"