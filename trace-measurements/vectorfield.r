library(ggplot2)
library(extrafont)
loadfonts()

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

# TODO: Loops like heatmap.r

heatmap = read.csv('~/share/mlrecs/3-velocities.csv', header = FALSE)
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
summary(heatmap$mag)
print(length(heatmap$mag))
print(length(heatmap[heatmap$mag > 130.0 | heatmap$mag < -130.0, ]$mag))
heatmap$mag   = heatmap$mag / max(heatmap$mag)
heatmap$mag = 1 - exp(-10000 * heatmap$mag)
summary(heatmap$mag)
heatmap$angle = ifelse(heatmap$mag == 0, NA, atan2(heatmap$vy, heatmap$vx) * 180 / pi)

#
# Position heatmap
#

ggplot(heatmap, aes(x = x, y = y, fill = angle, alpha = mag)) +
	geom_raster() +
	coord_fixed(ratio = 1) +
	scale_fill_gradientn(colours = c("red","blue","green","yellow","red"),
	                                 breaks=c(-180,-90,0,90,180), labels=c(-180,-90,0,90,180), limits=c(-180,180)) +
	theme_bw(base_size=14) +
	guides(alpha = FALSE, fill = FALSE) +
	theme(
		axis.text  = element_text(size = 28, family='CM Roman'),
		axis.title = element_text(size = 30, family='CM Roman'),
	)

ggsave('./3-velocities-1.pdf', width = 8)
embed_fonts('./3-velocities-1.pdf')

heatmap = read.csv('~/share/mlrecs/3-velocities.csv', header = FALSE)
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
	geom_tile(width = 10, height = 10) +
	coord_fixed(ratio = 1) +
	scale_fill_gradientn(colours = c("red","blue","green","yellow","red"),
	                                 breaks=c(-180,-90,0,90,180), labels=c(-180,-90,0,90,180), limits=c(-180,180)) +
	theme_bw(base_size=14) +
	guides(alpha = FALSE, fill = FALSE) +
	theme(
		axis.text  = element_text(size = 28, family='CM Roman'),
		axis.title = element_text(size = 30, family='CM Roman'),
	)

ggsave('./3-velocities-10.pdf', width = 8)
embed_fonts('./3-velocities-10.pdf')

heatmap = read.csv('~/share/mlrecs/starbucks-velocities.csv', header = FALSE)
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
summary(heatmap$mag)
print(length(heatmap$mag))
print(length(heatmap[heatmap$mag > 130.0 | heatmap$mag < -130.0, ]$mag))
heatmap$mag   = heatmap$mag / max(heatmap$mag)
heatmap$mag = 1 - exp(-10000 * heatmap$mag)
summary(heatmap$mag)
heatmap$angle = ifelse(heatmap$mag == 0, NA, atan2(heatmap$vy, heatmap$vx) * 180 / pi)

#
# Position heatmap
#

ggplot(heatmap, aes(x = x, y = y, fill = angle, alpha = mag)) +
	geom_raster() +
	coord_fixed(ratio = 1) +
	scale_fill_gradientn(colours = c("red","blue","green","yellow","red"),
	                                 breaks=c(-180,-90,0,90,180), labels=c(-180,-90,0,90,180), limits=c(-180,180)) +
	theme_bw(base_size=14) +
	guides(alpha = FALSE, fill = FALSE) +
	theme(
		axis.text  = element_text(size = 28, family='CM Roman'),
		axis.title = element_text(size = 30, family='CM Roman'),
	)

ggsave('./starbucks-velocities-1.pdf')
embed_fonts('./starbucks-velocities-1.pdf')

heatmap = read.csv('~/share/mlrecs/starbucks-velocities.csv', header = FALSE)
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
	geom_tile(width = 10, height = 10) +
	coord_fixed(ratio = 1) +
	scale_fill_gradientn(colours = c("red","blue","green","yellow","red"),
	                                 breaks=c(-180,-90,0,90,180), labels=c(-180,-90,0,90,180), limits=c(-180,180)) +
	theme_bw(base_size=14) +
	guides(alpha = FALSE, fill = FALSE) +
	theme(
		axis.text  = element_text(size = 28, family='CM Roman'),
		axis.title = element_text(size = 30, family='CM Roman'),
	)

ggsave('./starbucks-velocities-10.pdf')
embed_fonts('./starbucks-velocities-10.pdf')
