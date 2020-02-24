#!/bin/sh
# base-64-lts (19.4.0)
# on edit: scp mnx.sh amar.io:~/www
# screen -d -m -S sim bash -c 'curl https://amar.io/mnx.sh | bash -s (1|2)'

yes | pkgin install git
git clone https://github.com/yousefamar/p2p-sim.git
cd p2p-sim
mkdir traces
cd traces
wget amar.io/mlrecs/merged-3.csv
wget amar.io/mlrecs/merged-starbucks.csv
cd ../
npm install
rm -rf share-out
mkdir -p share-out/data/stats
node cheatsim.js $1
