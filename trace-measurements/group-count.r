library(ggplot2)
library(extrafont)
#library(tidyr)
#library(dplyr, warn.conflicts = FALSE)
library(scales)

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

data = read.csv('~/share/mlrecs/3-group-hist.csv')
colnames(data) = c('size', 'count')
data$area = 'A'
print(sum(data$count))
summary(data$count)
print('dist')
summary(data$size)
print(sd(data$size))
data$frac = data$count / sum(data$count)#log10(data$count) # / sum(log10(data$count))

data1 = read.csv('~/share/mlrecs/starbucks-group-hist.csv')
colnames(data1) = c('size', 'count')
data1$area = 'B'
print(sum(data1$count))
summary(data1$count)
print('dist')
summary(data1$size)
print(sd(data1$size))
data1$frac = data1$count / sum(data1$count)#log10(data1$count) # / sum(log10(data1$count))

data = rbind(data, data1)

#
# Histograms
#

ggplot(data, aes(x = size, y = count)) +
	geom_bar(aes(fill = area), stat = 'identity', position = 'identity', alpha = 0.2) +
	geom_smooth(aes(color = area)) +
	scale_y_log10(labels = trans_format('log10', math_format(10^.x))) +
	annotation_logticks(sides = 'l') +
	scale_fill_brewer(palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Group size") +
	ylab("Count") +
	guides(color = FALSE) +
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

ggsave('./group-hist.pdf', width = 10)
embed_fonts('./group-hist.pdf')

#
# Densities
#

ggplot(data, aes(x = size, fill = area, weights = frac)) +
	geom_density(alpha = 0.4) +
	scale_fill_brewer(palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Group size") +
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

ggsave('./group-density.pdf', width = 10)
embed_fonts('./group-density.pdf')

#
# Position data
#

data = read.csv('~/share/mlrecs/3-group-count-mean.csv')
colnames(data) = c('ts', 'count')
data$ts = as.POSIXct(data$ts / 1000, origin="1970-01-01")
data$area = 'A'
summary(data$count)
data1 = read.csv('~/share/mlrecs/starbucks-group-count-mean.csv')
colnames(data1) = c('ts', 'count')
data1$ts = as.POSIXct(data1$ts / 1000, origin="1970-01-01")
data1$area = 'B'
summary(data1$count)

data = rbind(data, data1)

ggplot(data, aes(x = ts, y = count, color = area)) +
	geom_line(size = 1.2, alpha = 0.2) +
	stat_smooth(method = 'loess', span = 0.05) +
	#geom_tile(width = 10, height = 10) +
	#scale_fill_identity() +
	#stat_density_2d(aes(fill = ..level..), geom = "polygon")
	#geom_bin2d(bins = 1000) +
	scale_color_brewer(palette = "Set1") +
	scale_x_datetime(date_breaks = "day", date_labels = "%a") +
	theme_bw(base_size=14) +
	xlab("Time (UTC)") +
	ylab("Group count") +
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

ggsave('./group-count.pdf', width = 18)
embed_fonts('./group-count.pdf')

#
# Densities
#


data = read.csv('~/share/mlrecs/3-idle-times.csv')
colnames(data) = c('id', 't')
data$area = 'A'
print(nrow(data))
print(sum(data$t))
summary(data$t)

data1 = read.csv('~/share/mlrecs/starbucks-idle-times.csv')
colnames(data1) = c('id', 't')
data1$area = 'B'
print(nrow(data1))
print(sum(data1$t))
summary(data1$t)

data$t  = (data$t / 1000) / 60
data1$t = (data1$t / 1000) / 60

print('A')
print(ecdf(data$t)(180))
print(quantile(data$t, 0.5))
print(quantile(data$t, 0.95))
print('B')
print(ecdf(data1$t)(180))
print(quantile(data1$t, 0.5))
print(quantile(data1$t, 0.95))

data = rbind(data, data1)

ggplot(data, aes(x = t, color = area)) +
	stat_ecdf(pad = FALSE) +
	scale_color_brewer(palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Avatar idle time (m)") +
	ylab("CDF") +
	xlim(0, 180) +
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
		legend.position  = c(0.8, 0.2)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./idle-time-cdf.pdf', width = 10)
embed_fonts('./idle-time-cdf.pdf')
