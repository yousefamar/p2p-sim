#!/bin/sh

git clone https://github.com/yousefamar/p2p-sim.git
cd p2p-sim
npm install
rm -rf share-out
mkdir -p share-out/data/stats
node cheatsim.js
