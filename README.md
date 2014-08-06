## Installing

1. Update git submodules.

        git submodule init && git submodule update

2. Build protobuf-py3.

        make

3. Start a Python 3 virtualenv.

        virtualenv -ppython3 VENV

4. Activate the virtualenv.

        source VENV/bin/activate

5. Install pip requirements.

        pip install -r requirements.txt

6. Install npm requirements.

        npm install

7. Install Bower requirements.

        bower install

8. Generate an RSA key pair with OpenSSL for minting.

        openssl genrsa -out elpizo.pem 2048
        openssl rsa -in elpizo.pem -pubout elpizo.pub

9. Copy `elpizo.conf.sample` to `elpizo.conf`, and update the options to match your settings.

10. Initialize the Postgres database.

        python -m elpizo.tools.initdb

## Running

1. Activate the virtualenv.

        source VENV/bin/activate

2. Start a client Gulp build.

        node_modules/.bin/gulp

3. In another terminal, start the server.

        python -m elpizo --debug

4. For testing, run `admit_mint.py`.

        ./admit_mint.py --debug --port=5000

5. Mint a token with the mint. If you're using `admit_mint.py`, go to `http://localhost:5000/admit_mint.py?user=dumas&actor=Athos`. The token will be valid for 10 minutes. If the token expires, mint a new one.

6. Visit `http://localhost:9999`.
