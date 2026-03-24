#!/usr/bin/env bash
# Install SIDControl module to Move
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$REPO_ROOT"

# Build first if dist doesn't exist
if [ ! -d "dist/sidcontrol" ]; then
    echo "Building first..."
    ./scripts/build.sh
fi

echo "=== Installing SIDControl Module ==="

echo "Copying module to Move..."
ssh ableton@move.local "mkdir -p /data/UserData/schwung/modules/overtake/sidcontrol"
scp -r dist/sidcontrol/* ableton@move.local:/data/UserData/schwung/modules/overtake/sidcontrol/

# Set permissions so Module Store can update later
echo "Setting permissions..."
ssh ableton@move.local "chmod -R a+rw /data/UserData/schwung/modules/overtake/sidcontrol"

echo ""
echo "=== Install Complete ==="
echo "Module installed to: /data/UserData/schwung/modules/overtake/sidcontrol/"
echo "Restart Move Anything or use host_rescan_modules() to load."
