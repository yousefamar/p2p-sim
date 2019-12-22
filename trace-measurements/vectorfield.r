library(ggplot2)
library(extrafont)
#library(tidyr)
#library(dplyr, warn.conflicts = FALSE)

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

heatmap = read.csv('~/share/mlrecs/3-velocities.csv')
colnames(heatmap) = c('x', 'y', 'vx', 'vy')
#xx <- seq(min(heatmap$x), max(heatmap$x), by=1)
#yy <- seq(min(heatmap$y), max(heatmap$y), by=1)
#heatmap <- merge(heatmap, xx, by.x='date', by.y='date', all.x=T, all.y=T)
#heatmap <- merge(heatmap, yy, by.x='date', by.y='date', all.x=T, all.y=T)
#heatmap$h[is.na(res$value)] <- 0
#heatmap = complete(heatmap, x, y, fill = list(h = 0))

#maxV = ceiling(max(abs(min(heatmap$vx)),
#                   abs(max(heatmap$vx)),
#                   abs(min(heatmap$vy)),
#                   abs(max(heatmap$vy))))
#heatmap$col   = rgb((log(heatmap$vx) + maxV) / (2 * maxV), 0, (heatmap$vy + maxV) / (2 * maxV))

#heatmap$x = floor(heatmap$x / 10) * 10
#heatmap$y = floor(heatmap$y / 10) * 10
#heatmap = aggregate(. ~ x + y, data = heatmap, mean)

heatmap$mag   = sqrt(heatmap$vx ** 2  + heatmap$vy ** 2)
#cap = quantile(heatmap$mag, 0.99)
#print(cap)
#print(max(heatmap$mag))
#heatmap$mag[heatmap$mag > cap] = cap
heatmap$mag   = heatmap$mag / max(heatmap$mag)
heatmap$mag = 1 - exp(-10000 * heatmap$mag)
summary(heatmap$mag)
heatmap$angle = ifelse(heatmap$mag == 0, NA, atan2(heatmap$vy, heatmap$vx) * 180 / pi)

#
# Position heatmap
#

ggplot(heatmap, aes(x = x, y = y, fill = angle, alpha = mag)) +
	geom_raster() +
	#geom_tile(width = 10, height = 10) +
	#scale_fill_identity() +
	#stat_density_2d(aes(fill = ..level..), geom = "polygon")
	#geom_bin2d(bins = 1000) +
	#scale_fill_viridis_c(option = "C") +
	scale_fill_gradientn(colours = c("red","blue","green","yellow","red"),
	                                 breaks=c(-180,-90,0,90,180), labels=c(-180,-90,0,90,180), limits=c(-180,180)) +
	theme_bw(base_size=14) +
	#labs(fill = expression(theta)) +
	guides(alpha = FALSE, fill = FALSE) +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x     = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 20),
		legend.title     = element_text(size = 35),
		legend.position  = c(0.9, 0.8)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./3-velocities-1.pdf', width = 10)
embed_fonts('./3-velocities-1.pdf')

heatmap = read.csv('~/share/mlrecs/3-velocities.csv')
colnames(heatmap) = c('x', 'y', 'vx', 'vy')

heatmap$x = floor(heatmap$x / 10) * 10
heatmap$y = floor(heatmap$y / 10) * 10
heatmap = aggregate(. ~ x + y, data = heatmap, mean)

heatmap$mag   = sqrt(heatmap$vx ** 2  + heatmap$vy ** 2)
#cap = quantile(heatmap$mag, 0.99)
#print(cap)
#print(max(heatmap$mag))
#heatmap$mag[heatmap$mag > cap] = cap
heatmap$mag   = heatmap$mag / max(heatmap$mag)
heatmap$mag = 1 - exp(-100 * heatmap$mag)
summary(heatmap$mag)
heatmap$angle = ifelse(heatmap$mag == 0, NA, atan2(heatmap$vy, heatmap$vx) * 180 / pi)

#
# Position heatmap
#

ggplot(heatmap, aes(x = x, y = y, fill = angle, alpha = mag)) +
	#geom_raster() +
	geom_tile(width = 10, height = 10) +
	#scale_fill_identity() +
	#stat_density_2d(aes(fill = ..level..), geom = "polygon")
	#geom_bin2d(bins = 1000) +
	#scale_fill_viridis_c(option = "C") +
	scale_fill_gradientn(colours = c("red","blue","green","yellow","red"),
	                                 breaks=c(-180,-90,0,90,180), labels=c(-180,-90,0,90,180), limits=c(-180,180)) +
	theme_bw(base_size=14) +
	#labs(fill = expression(theta)) +
	guides(alpha = FALSE, fill = FALSE) +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x     = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 20),
		legend.title     = element_text(size = 35),
		legend.position  = c(0.9, 0.8)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./3-velocities-10.pdf', width = 10)
embed_fonts('./3-velocities-10.pdf')

heatmap = read.csv('~/share/mlrecs/starbucks-velocities.csv')
colnames(heatmap) = c('x', 'y', 'vx', 'vy')
#xx <- seq(min(heatmap$x), max(heatmap$x), by=1)
#yy <- seq(min(heatmap$y), max(heatmap$y), by=1)
#heatmap <- merge(heatmap, xx, by.x='date', by.y='date', all.x=T, all.y=T)
#heatmap <- merge(heatmap, yy, by.x='date', by.y='date', all.x=T, all.y=T)
#heatmap$h[is.na(res$value)] <- 0
#heatmap = complete(heatmap, x, y, fill = list(h = 0))

#maxV = ceiling(max(abs(min(heatmap$vx)),
#                   abs(max(heatmap$vx)),
#                   abs(min(heatmap$vy)),
#                   abs(max(heatmap$vy))))
#heatmap$col   = rgb((log(heatmap$vx) + maxV) / (2 * maxV), 0, (heatmap$vy + maxV) / (2 * maxV))

#heatmap$x = floor(heatmap$x / 10) * 10
#heatmap$y = floor(heatmap$y / 10) * 10
#heatmap = aggregate(. ~ x + y, data = heatmap, mean)

heatmap$mag   = sqrt(heatmap$vx ** 2  + heatmap$vy ** 2)
#cap = quantile(heatmap$mag, 0.99)
#print(cap)
#print(max(heatmap$mag))
#heatmap$mag[heatmap$mag > cap] = cap
heatmap$mag   = heatmap$mag / max(heatmap$mag)
heatmap$mag = 1 - exp(-10000 * heatmap$mag)
summary(heatmap$mag)
heatmap$angle = ifelse(heatmap$mag == 0, NA, atan2(heatmap$vy, heatmap$vx) * 180 / pi)

#
# Position heatmap
#

ggplot(heatmap, aes(x = x, y = y, fill = angle, alpha = mag)) +
	geom_raster() +
	#geom_tile(width = 10, height = 10) +
	#scale_fill_identity() +
	#stat_density_2d(aes(fill = ..level..), geom = "polygon")
	#geom_bin2d(bins = 1000) +
	#scale_fill_viridis_c(option = "C") +
	scale_fill_gradientn(colours = c("red","blue","green","yellow","red"),
	                                 breaks=c(-180,-90,0,90,180), labels=c(-180,-90,0,90,180), limits=c(-180,180)) +
	theme_bw(base_size=14) +
	#labs(fill = expression(theta)) +
	guides(alpha = FALSE, fill = FALSE) +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x     = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 20),
		legend.title     = element_text(size = 35),
		legend.position  = c(0.9, 0.8)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./starbucks-velocities-1.pdf', width = 10)
embed_fonts('./starbucks-velocities-1.pdf')

heatmap = read.csv('~/share/mlrecs/starbucks-velocities.csv')
colnames(heatmap) = c('x', 'y', 'vx', 'vy')

heatmap$x = floor(heatmap$x / 10) * 10
heatmap$y = floor(heatmap$y / 10) * 10
heatmap = aggregate(. ~ x + y, data = heatmap, mean)

heatmap$mag   = sqrt(heatmap$vx ** 2  + heatmap$vy ** 2)
#cap = quantile(heatmap$mag, 0.99)
#print(cap)
#print(max(heatmap$mag))
#heatmap$mag[heatmap$mag > cap] = cap
heatmap$mag   = heatmap$mag / max(heatmap$mag)
heatmap$mag = 1 - exp(-100 * heatmap$mag)
summary(heatmap$mag)
heatmap$angle = ifelse(heatmap$mag == 0, NA, atan2(heatmap$vy, heatmap$vx) * 180 / pi)

#
# Position heatmap
#

ggplot(heatmap, aes(x = x, y = y, fill = angle, alpha = mag)) +
	#geom_raster() +
	geom_tile(width = 10, height = 10) +
	#scale_fill_identity() +
	#stat_density_2d(aes(fill = ..level..), geom = "polygon")
	#geom_bin2d(bins = 1000) +
	#scale_fill_viridis_c(option = "C") +
	scale_fill_gradientn(colours = c("red","blue","green","yellow","red"),
	                                 breaks=c(-180,-90,0,90,180), labels=c(-180,-90,0,90,180), limits=c(-180,180)) +
	theme_bw(base_size=14) +
	#labs(fill = expression(theta)) +
	guides(alpha = FALSE, fill = FALSE) +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x     = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 20),
		legend.title     = element_text(size = 35),
		legend.position  = c(0.9, 0.8)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./starbucks-velocities-10.pdf', width = 10)
embed_fonts('./starbucks-velocities-10.pdf')
