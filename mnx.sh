#!/bin/sh
# base-64-lts (19.x.x)
# on edit: scp mnx.sh amar.io:~/www
# curl https://amar.io/mnx.sh | bash

yes | pkgin install git
git clone https://github.com/yousefamar/p2p-sim.git
cd p2p-sim
npm install
rm -rf share-out
mkdir -p share-out/data/stats
node cheatsim.js
