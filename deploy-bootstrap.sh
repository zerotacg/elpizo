#!/bin/bash
sudo ln -s `pwd` /vagrant
sudo add-apt-repository -y ppa:fkrull/deadsnakes
sudo ./bootstrap.sh
