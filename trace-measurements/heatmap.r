library(ggplot2)
library(extrafont)
#library(tidyr)
#library(dplyr, warn.conflicts = FALSE)

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

heatmap = read.csv('~/share/mlrecs/3-heatmap.csv')
colnames(heatmap) = c('x', 'y', 'h')
#xx <- seq(min(heatmap$x), max(heatmap$x), by=1)
#yy <- seq(min(heatmap$y), max(heatmap$y), by=1)
#heatmap <- merge(heatmap, xx, by.x='date', by.y='date', all.x=T, all.y=T)
#heatmap <- merge(heatmap, yy, by.x='date', by.y='date', all.x=T, all.y=T)
#heatmap$h[is.na(res$value)] <- 0
#heatmap = complete(heatmap, x, y, fill = list(h = 0))

cap = quantile(heatmap$h, 0.995)
summary(heatmap$h)
print(cap)
print(max(heatmap$h))
heatmap$h[heatmap$h > cap] = cap

#heatmap['x'] = floor(heatmap['x'] / 10) * 10
#heatmap['y'] = floor(heatmap['y'] / 10) * 10
#heatmap = aggregate(h ~ x + y, data = heatmap, sum)

heatmap$h = heatmap$h / max(heatmap$h)
heatmap$h = 1 - exp(-5 * heatmap$h)
summary(heatmap$h)

#
# Position heatmap
#

ggplot(heatmap, aes(x = x, y = y, fill = h)) +
	geom_raster() +
	#geom_tile(width = 10, height = 10) +
	#stat_density_2d(aes(fill = ..level..), geom = "polygon")
	#geom_bin2d(bins = 1000) +
	scale_fill_viridis_c(option = "C") +
	theme_bw(base_size=14) +
	labs(fill = "Occupancy") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x     = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 20),
		legend.title     = element_text(size = 28),
		legend.position  = c(0.9, 0.8)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./3-heatmap-1.pdf', width = 14)
embed_fonts('./3-heatmap-1.pdf')
