library(ggplot2)
library(extrafont)
loadfonts()

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

filename = './player-count-densities.pdf'

ggplot(data, aes(x = Value, group = Series)) +
	geom_density(aes(fill = Series), alpha = 0.4) +
	scale_fill_brewer(labels = c("Dynamic", "Static", "Global"), palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Avatar count") +
	ylab("Density") +
	labs(fill = "Area") +
	theme(
		axis.text        = element_text(size = 28, family='CM Roman'),
		axis.title       = element_text(size = 30, family='CM Roman'),
		legend.text      = element_text(size = 20, family='CM Roman'),
		legend.title     = element_text(size = 28, family='CM Roman'),
		legend.position  = c(0.75, 0.8)
	)

ggsave(filename, width = 10)
embed_fonts(filename)

#
# Position data
#

filename = './player-count.pdf'

ggplot(data, aes(x = Time, y = Value, group = Series)) +
	geom_line(aes(color = Series), size = 1.2) +
	scale_color_brewer(labels = c("Dynamic", "Static", "Global"), palette = "Set1") +
	scale_x_datetime(date_breaks = "day", date_labels = "%a") +
	theme_bw(base_size=14) +
	xlab("Time (UTC)") +
	ylab("Avatar count") +
	labs(color = "Area") +
	theme(
		axis.text        = element_text(size = 28, family='CM Roman'),
		axis.title       = element_text(size = 30, family='CM Roman'),
		legend.text      = element_text(size = 20, family='CM Roman'),
		legend.title     = element_text(size = 28, family='CM Roman'),
		legend.position  = c(0.24, 0.875)
	)

ggsave(filename, width = 18)
embed_fonts(filename)
