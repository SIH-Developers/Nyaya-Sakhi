#!/usr/bin/env bash
# Nyaya Sakhi — Render.com build script
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Seed initial district/victim data
python -c "from backend.seed_data import seed_initial_data; seed_initial_data()"

# Build React frontend
cd frontend
npm install
npm run build
cd ..
