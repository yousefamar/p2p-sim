library(ggplot2)
library(extrafont)
loadfonts()

genHeatmap = function(area, tileSize) {
	heatmap = read.csv(paste('~/share/mlrecs/', area, '-heatmap.csv', sep = ''), header = FALSE)
	colnames(heatmap) = c('x', 'y', 'h')
	#xx <- seq(min(heatmap$x), max(heatmap$x), by=1)
	#yy <- seq(min(heatmap$y), max(heatmap$y), by=1)
	#heatmap <- merge(heatmap, xx, by.x='date', by.y='date', all.x=T, all.y=T)
	#heatmap <- merge(heatmap, yy, by.x='date', by.y='date', all.x=T, all.y=T)
	#heatmap$h[is.na(res$value)] <- 0
	#heatmap = complete(heatmap, x, y, fill = list(h = 0))

	cap = quantile(heatmap$h, 0.995)
	print(cap)
	print(max(heatmap$h))
	heatmap$h[heatmap$h > cap] = cap

	if (tileSize != 1) {
		heatmap['x'] = floor(heatmap['x'] / tileSize) * tileSize
		heatmap['y'] = floor(heatmap['y'] / tileSize) * tileSize
		heatmap = aggregate(h ~ x + y, data = heatmap, sum)
	}

	heatmap$h = heatmap$h / max(heatmap$h)
	heatmap$h = 1 - exp(-5 * heatmap$h)
	print(summary(heatmap$h))

	p = ggplot(heatmap, aes(x = x, y = y, fill = h))

	if (tileSize == 1)
		p = p + geom_raster()
	else
		p = p + geom_tile(width = tileSize, height = tileSize)

	p = p +
		coord_fixed(ratio = 1) +
		scale_fill_viridis_c(option = "C") +
		theme_bw(base_size=14) +
		labs(fill = "Occupancy") +
		theme(
			axis.text        = element_text(size = 28, family='CM Roman'),
			axis.title       = element_text(size = 30, family='CM Roman'),
			legend.text      = element_text(size = 16, family='CM Roman'),
			legend.title     = element_text(size = 18, family='CM Roman'),
			legend.position  = c(if (area == 3) 0.89 else 0.85, 0.85)
		)

	filename = paste('./', area, '-heatmap-', tileSize, '.pdf', sep = '')

	ggsave(filename, width = if (area == '3') 8 else 7)
	embed_fonts(filename)
}

for (area in c('starbucks', '3'))
	for (tileSize in c(1, 10))
		genHeatmap(area, tileSize)
