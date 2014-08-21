#!/bin/bash
trap "kill 0" EXIT

source VENV/bin/activate
node_modules/.bin/gulp --debug &
nginx -p . -c nginx.conf &
python3 -m elpizo.server
