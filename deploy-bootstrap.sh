#!/bin/bash
sudo ln -s . /vagrant
sudo add-apt-repository -y ppa:fkrull/deadsnakes
sudo add-apt-repository -y ppa:chris-lea/node.js
sudo ./bootstrap.sh
