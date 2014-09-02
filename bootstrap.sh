#!/bin/bash
apt-get update
apt-get install -y libpython3.4-dev libxml2-dev libxslt1-dev cython3 nodejs-legacy python3.4 nodejs python3-setuptools npm git build-essential libtool autoconf redis-server nginx
easy_install-3.4 pip
pip3.4 install virtualenv
npm install -g bower
cd /vagrant
git submodule init
git submodule update
make
virtualenv -ppython3 VENV
source VENV/bin/activate
pip install -r requirements.txt
npm install --unsafe-perm
bower install --allow-root
openssl genrsa -out elpizo.pem 2048
openssl rsa -in elpizo.pem -pubout -out elpizo.pub
node_modules/.bin/gulp protos
python -m elpizo.tools.initdb
rm -f /etc/nginx/nginx.conf
ln -s /vagrant/nginx.conf /etc/nginx/nginx.conf
service nginx restart
