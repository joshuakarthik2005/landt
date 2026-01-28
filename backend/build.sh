#!/usr/bin/env bash
# Render build script

set -e

echo "Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
export PATH="$HOME/.cargo/bin:$PATH"

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Building Rust extension..."
cd rust_reader
maturin build --release
pip install target/wheels/*.whl
cd ..

echo "Creating required directories..."
mkdir -p uploads models

echo "Build complete!"
