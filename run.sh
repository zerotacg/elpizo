#!/bin/bash
trap "kill 0" EXIT

gulp protos-py
gulp --debug &
python3.4 -m elpizo.server --debug
