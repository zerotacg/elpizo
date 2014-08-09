#!/bin/bash
sudo apt-get install -y postgresql-server-dev-9.3 libpython3.4-dev libxml2-dev \
                        libxslt1-dev cython3 nodejs-legacy python3.4 \
                        rabbitmq-server nodejs python3-setuptools npm \
                        git build-essential libtool autoconf postgresql-9.3 && \
sudo easy_install-3.4 pip && \
sudo pip3.4 install virtualenv && \
sudo npm install -g bower && \
git submodule init && git submodule update && \
make && \
virtualenv -ppython3 VENV && \
source VENV/bin/activate && \
pip install -r requirements.txt && \
npm install && \
bower install && \
openssl genrsa -out elpizo.pem 2048 && \
openssl rsa -in elpizo.pem -pubout -out elpizo.pub && \
node_modules/.bin/gulp protos && \
sudo -u postgres psql -c "CREATE USER elpizo WITH PASSWORD 'elpizo';" && \
sudo -u postgres createdb elpizo -O elpizo && \
echo "dsn = \"postgres://elpizo:elpizo@localhost/elpizo\"" > elpizo.conf && \
python -m elpizo.tools.initdb