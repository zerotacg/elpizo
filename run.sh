#!/bin/bash
trap "kill 0" EXIT

source ~/VENV/bin/activate
gulp protos-py
gulp --debug &
python3.4 -m elpizo.server --debug
