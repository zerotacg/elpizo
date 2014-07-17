#!/bin/bash
echo "Running watchify..."
./node_modules/.bin/watchify -t reactify elpizo/static/app/main.jsx -o elpizo/static/js/bundle.js
