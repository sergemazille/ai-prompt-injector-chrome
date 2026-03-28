#!/bin/bash

# Build script for Chrome extension store submission
# Creates a clean ZIP file without development files

VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
FILENAME="dist/ai-prompt-injector-v${VERSION}-chrome.zip"

echo "Building Chrome extension package v${VERSION}..."

mkdir -p dist
rm -f "$FILENAME"

TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"

# Copy only extension files (not test configs)
cp manifest.json "$TEMP_DIR/"
for f in background.js content.js i18n.js popup.js storage.js; do
  cp "$f" "$TEMP_DIR/"
done
cp popup.html "$TEMP_DIR/"
cp popup.css "$TEMP_DIR/"
mkdir -p "$TEMP_DIR/icons"
cp icons/*.png "$TEMP_DIR/icons/"
cp PRIVACY.md LICENSE README.md "$TEMP_DIR/" 2>/dev/null || true

# Create ZIP using Python with proper argument passing
python3 - "$TEMP_DIR" "$FILENAME" <<'PYEOF'
import zipfile
import os
import sys

temp_dir = sys.argv[1]
output_file = sys.argv[2]

with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(temp_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, temp_dir)
            zf.write(file_path, arcname)
PYEOF

rm -rf "$TEMP_DIR"

echo "Chrome extension package created: $FILENAME"
echo "Size: $(du -h "$FILENAME" | cut -f1)"
echo ""
echo "Ready for submission to Chrome Web Store!"
