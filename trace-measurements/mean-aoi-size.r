library(ggplot2)
#library(tikzDevice)
library(extrafont)
loadfonts()

filename = './mean-aoi-size.pdf'

data3         = read.csv('~/share/mlrecs/3-mean-aoi-size.csv')
data3$area    = 'Dynamic'
dataStar      = read.csv('~/share/mlrecs/starbucks-mean-aoi-size.csv')
dataStar$area = 'Static'
data          = rbind(data3, dataStar)
data$ts = as.POSIXct(data$ts/1000, origin='1970-01-01')
data$meanAOISize = data$sumAOISize / data$playerCount
summary(data[data$area == 'Dynamic',]$meanAOISize)
summary(data[data$area == 'Static',]$meanAOISize)

#tikz('./mean-aoi-size.tex', width = 18)
ggplot(data, aes(x = ts, y = meanAOISize, color = area)) +
	geom_line(size = 1.2, alpha = 0.2) +
	stat_smooth(method = 'loess', span = 0.05) +
	#geom_tile(width = 10, height = 10) +
	#scale_fill_identity() +
	#stat_density_2d(aes(fill = ..level..), geom = "polygon")
	#geom_bin2d(bins = 1000) +
	scale_color_brewer(palette = "Set1") +
	scale_x_datetime(date_breaks = "day", date_labels = "%a") +
	theme_bw(base_size = 14) +
	xlab("Time (UTC)") +
	ylab("Mean AOI density") +
	labs(color = "Area") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		#axis.text        = element_text(size = 28),
		axis.text        = element_text(size = 28, family='CM Roman'),
		axis.title       = element_text(size = 30, family='CM Roman'),
		legend.text      = element_text(size = 20, family='CM Roman'),
		legend.title     = element_text(size = 28, family='CM Roman'),
		legend.position  = c(0.9, 0.87)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave(filename, width = 18)
embed_fonts(filename)

filename = './aoi-size-vs-player-count.pdf'

ggplot(data, aes(x = playerCount, y = meanAOISize, color = area)) +
	stat_smooth(method = 'loess', span = 0.5) +
	#geom_tile(width = 10, height = 10) +
	#scale_fill_identity() +
	#stat_density_2d(aes(fill = ..level..), geom = "polygon")
	#geom_bin2d(bins = 1000) +
	scale_color_brewer(palette = "Set1") +
	theme_bw(base_size = 14) +
	xlab("Avatar count") +
	ylab("Mean AOI density") +
	labs(color = "Area") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		#axis.text        = element_text(size = 28),
		axis.text        = element_text(size = 28, family='CM Roman'),
		axis.title       = element_text(size = 30, family='CM Roman'),
		legend.text      = element_text(size = 20, family='CM Roman'),
		legend.title     = element_text(size = 28, family='CM Roman'),
		legend.position  = c(0.75, 0.87)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave(filename, width = 10)
embed_fonts(filename)
