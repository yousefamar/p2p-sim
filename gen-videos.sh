#!/usr/bin/env bash
mkdir -p ./out/videos/
for d in ./out/snapshots/*/
do
	topo=$(basename "$d")
	outfile="./out/videos/$topo.mp4"
	echo "Generating video for $topo topology..."
	ffmpeg -framerate 24 -i "$d%07d.png" "$outfile"
	echo "Video saved at $outfile"
done
