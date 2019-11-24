#!/usr/bin/env bash
ffmpeg \
	-i "./out/videos/AOI.mp4" \
	-i "./out/videos/Chord.mp4" \
	-i "./out/videos/ClientServer.mp4" \
	-i "./out/videos/Complete.mp4" \
	-i "./out/videos/Delaunay.mp4" \
	-i "./out/videos/Kiwano.mp4" \
	-i "./out/videos/Ours (minK = 1).mp4" \
	-i "./out/videos/Ours (minK = 2).mp4" \
	-i "./out/videos/Superpeers (n = 2).mp4" \
	-i "./out/videos/Superpeers (n = 3).mp4" \
	-i "./out/videos/SuperpeersK (n = 2).mp4" \
	-i "./out/videos/SuperpeersK (n = 3).mp4" \
	-filter_complex " \
		[0:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='AOI':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a0]; \
		[1:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='Chord':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a1]; \
		[2:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='ClientServer':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a2]; \
		[3:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='Complete':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a3]; \
		[4:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='Delaunay':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a4]; \
		[5:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='Kiwano':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a5]; \
		[6:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='Ours (minK = 1)':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a6]; \
		[7:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='Ours (minK = 2)':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a7]; \
		[8:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='Superpeers (n = 2)':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a8]; \
		[9:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='Superpeers (n = 3)':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a9]; \
		[10:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='SuperpeersK (n = 2)':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a10]; \
		[11:v] setpts=PTS-STARTPTS, scale=qvga, pad=h=ih+24:color=white, pad=iw+2:ih+2:1:1, drawtext=text='SuperpeersK (n = 3)':fontfile=/home/amar/.fonts/cmunrm.ttf:fontsize=20:x=(w-text_w)/2:y=(h-text_h-4) [a11]; \
		[a0][a1][a2][a3][a4][a5][a6][a7][a8][a9][a10][a11]xstack=inputs=12:layout=0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0|0_h0+h1|w0_h0+h1|w0+w1_h0+h1|w0+w1+w2_h0+h1[out] \
		" \
	-map "[out]" \
	-c:v libx264 -t '30' -f matroska ./out/tiled.mp4
