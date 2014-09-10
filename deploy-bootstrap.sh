#!/bin/bash
sudo ln -s . /vagrant
sudo add-apt-repository -y ppa:fkrull/deadsnakes
sudo ./bootstrap.sh
