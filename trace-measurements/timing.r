library(ggplot2)
library(extrafont)
loadfonts()
library(scales)

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

data = read.csv('~/share/mlrecs/3-lifetimes.csv')
data$area = 'Dynamic'
summary(data)

data1 = read.csv('~/share/mlrecs/starbucks-lifetimes.csv')
data1$area = 'Static'
summary(data1)

data = rbind(data, data1)

cap = quantile(data$lifetime, 0.9)
data = data[data$lifetime < cap, ]

data$lifetime = data$lifetime / 1000


#
# Densities
#

ggplot(data, aes(x = lifetime, fill = area)) +
	geom_density(alpha = 0.4) +
	#scale_x_continuous(breaks = seq(0, 6)) +
	scale_fill_brewer(palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Life expectancy (s)") +
	ylab("Density") +
	labs(fill = "Area") +
	theme(
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.text     = element_text(size = 20, family='CM Roman'),
		legend.title    = element_text(size = 28, family='CM Roman'),
		legend.position  = c(0.8, 0.8)
	)

ggsave('./lifetimes.pdf', width = 10)
embed_fonts('./lifetimes.pdf')

data = read.csv('~/share/mlrecs/3-movement-intervals.csv')
data$area = 'Static'
summary(data)

data1 = read.csv('~/share/mlrecs/starbucks-movement-intervals.csv')
data1$area = 'Dynamic'
summary(data1)

data = rbind(data, data1)

cap = quantile(data$intervals, 0.9)
data = data[data$intervals < cap, ]


#
# Densities
#

ggplot(data, aes(x = intervals, fill = area)) +
	geom_density(alpha = 0.4) +
	#scale_x_continuous(breaks = seq(0, 6)) +
	scale_fill_brewer(palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Movement intervals (ms)") +
	ylab("Density") +
	labs(fill = "Area") +
	theme(
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.text     = element_text(size = 20, family='CM Roman'),
		legend.title    = element_text(size = 28, family='CM Roman'),
		legend.position  = c(0.8, 0.8)
	)

ggsave('./movement-intervals.pdf', width = 10)
embed_fonts('./movement-intervals.pdf')
