#!/bin/bash
trap "kill 0" EXIT

source VENV/bin/activate
node_modules/.bin/gulp protos-py
node_modules/.bin/gulp --debug &
python3 -m elpizo.server --debug
