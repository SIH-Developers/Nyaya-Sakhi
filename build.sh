#!/usr/bin/env bash
# Exit on error
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt
python seed_data.py

cd frontend
npm install
npm run build
cd ..
