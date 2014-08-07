#!/bin/bash
trap "kill 0" EXIT

#source VENV/bin/activate
node_modules/.bin/gulp &
./admit_mint.py --debug --port=5000 &
python3 -m elpizo --debug
