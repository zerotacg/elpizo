#!/bin/bash

if [[ -z $ATOM_SHELL ]]; then
  echo "The environment variable ATOM_SHELL is not set."
  echo
  echo "Please set it to point to the atom-shell binary."
  exit 1
fi

scriptdir=`dirname "$BASH_SOURCE"`
$ATOM_SHELL $scriptdir $@
