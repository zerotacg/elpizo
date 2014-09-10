#!/bin/bash
apt-get update
apt-get install -y libpython3.4-dev python3.4 nodejs python3-setuptools npm git \
                   build-essential libtool autoconf redis-server nginx
ln -s /usr/bin/nodejs /usr/bin/node
easy_install-3.4 pip
npm install -g bower gulp
git clone https://github.com/GreatFruitOmsk/protobuf-py3.git
cd protobuf-py3
./autogen.sh
./configure --prefix=/usr
make -j3
make install
cd /vagrant
pip3.4 install -r requirements.txt
npm install --unsafe-perm
bower install --allow-root
openssl genrsa -out elpizo.pem 2048
openssl rsa -in elpizo.pem -pubout -out elpizo.pub
gulp protos
python3.4 -m elpizo.tools.initdb
service nginx stop
rm -f /etc/nginx/nginx.conf
ln -s /vagrant/nginx.conf /etc/nginx/nginx.conf
service nginx start
