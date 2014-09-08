#!/bin/bash
trap "kill 0" EXIT

export NODE_ENV=development
gulp &
python3.4 -m elpizo.server --debug
