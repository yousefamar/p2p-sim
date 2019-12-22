library(ggplot2)
library(extrafont)
#library(tidyr)
#library(dplyr, warn.conflicts = FALSE)

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

data = read.csv('~/share/mlrecs/player-count.csv', sep = ";")
data = data[(data$Series=="total players" | data$Series=="3" | data$Series=="starbucks"),]
data$Time = as.POSIXct(data$Time, format = "%Y-%m-%dT%H:%M:%S")
head(data)
summary(data[data$Series == "3",]$Value)
summary(data[data$Series == "starbucks",]$Value)
summary(data[data$Series == "total players",]$Value)

#
# Densities
#

ggplot(data, aes(x = Value, group = Series)) +
	geom_density(aes(fill = Series), alpha = 0.4) +
	scale_fill_brewer(labels = c("A", "B", "Global"), palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Avatar count") +
	ylab("Density") +
	labs(fill = "Area") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x     = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 20),
		legend.title     = element_text(size = 28),
		legend.position  = c(0.8, 0.8)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./player-count-densities.pdf', width = 10)
embed_fonts('./player-count-densities.pdf')

#
# Position data
#

ggplot(data, aes(x = Time, y = Value, group = Series)) +
	geom_line(aes(color = Series), size = 1.2) +
	#geom_tile(width = 10, height = 10) +
	#scale_fill_identity() +
	#stat_density_2d(aes(fill = ..level..), geom = "polygon")
	#geom_bin2d(bins = 1000) +
	scale_color_brewer(labels = c("A", "B", "Global"), palette = "Set1") +
	scale_x_datetime(date_breaks = "day", date_labels = "%a") +
	theme_bw(base_size=14) +
	xlab("Time (UTC)") +
	ylab("Avatar count") +
	labs(color = "Area") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x     = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 20),
		legend.title     = element_text(size = 28),
		legend.position  = c(0.24, 0.875)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./player-count.pdf', width = 18)
embed_fonts('./player-count.pdf')
