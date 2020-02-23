library(ggplot2)
library(extrafont)
loadfonts()
library(scales)

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

data = read.csv('~/share/mlrecs/3-group-hist.csv', header = FALSE)
colnames(data) = c('size', 'count')
data$area = 'Dynamic'
print(sum(data$count))
summary(data$count)
print('dist')
summary(data$size)
print(sd(data$size))
data$frac = data$count / sum(data$count)#log10(data$count) # / sum(log10(data$count))

data1 = read.csv('~/share/mlrecs/starbucks-group-hist.csv', header = FALSE)
colnames(data1) = c('size', 'count')
data1$area = 'Static'
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
	geom_smooth(aes(color = area), span = 1.5, level = 0) +
	scale_x_continuous(breaks = seq(0, 6)) +
	scale_y_log10(labels = trans_format('log10', math_format(10^.x))) +
	annotation_logticks(sides = 'l') +
	scale_fill_brewer(palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Group size") +
	ylab("Number of groups") +
	guides(color = FALSE) +
	labs(fill = "Area") +
	theme(
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.text     = element_text(size = 20, family='CM Roman'),
		legend.title    = element_text(size = 28, family='CM Roman'),
		legend.position = c(0.8, 0.8)
	)

ggsave('./group-hist.pdf', width = 10)
embed_fonts('./group-hist.pdf')

#
# Densities
#

ggplot(data, aes(x = size, fill = area, weights = frac)) +
	geom_density(alpha = 0.4) +
	scale_x_continuous(breaks = seq(0, 6)) +
	scale_fill_brewer(palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Group size") +
	ylab("Density") +
	labs(fill = "Area") +
	theme(
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.text     = element_text(size = 20, family='CM Roman'),
		legend.title    = element_text(size = 28, family='CM Roman'),
		legend.position  = c(0.8, 0.8)
	)

ggsave('./group-density.pdf', width = 10)
embed_fonts('./group-density.pdf')

#
# Position data
#

data = read.csv('~/share/mlrecs/3-group-count.csv', header = FALSE)
colnames(data) = c('ts', 'sum', 'count')
data$ts = as.POSIXct(data$ts / 1000, origin="1970-01-01")
data$area = 'Dynamic'
summary(data$count)
data1 = read.csv('~/share/mlrecs/starbucks-group-count.csv', header = FALSE)
colnames(data1) = c('ts', 'sum', 'count')
data1$ts = as.POSIXct(data1$ts / 1000, origin="1970-01-01")
data1$area = 'Static'
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
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.text     = element_text(size = 20, family='CM Roman'),
		legend.title    = element_text(size = 28, family='CM Roman'),
		legend.position  = c(0.825, 0.9)
	)

ggsave('./group-count.pdf', width = 18)
embed_fonts('./group-count.pdf')

##########################

data$mean = data$sum / data$count

ggplot(data, aes(x = ts, y = mean, color = area)) +
	#geom_line(size = 1.2, alpha = 0.2) +
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
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.text     = element_text(size = 20, family='CM Roman'),
		legend.title    = element_text(size = 28, family='CM Roman'),
		legend.position = c(0.24, 0.875)
	)

filename = './mean-group-size.pdf'
ggsave(filename, width = 18)
embed_fonts(filename)

#
# Densities
#


data = read.csv('~/share/mlrecs/3-idle-times.csv', header = FALSE)
colnames(data) = c('id', 't')
data$area = 'Dynamic'
print(nrow(data))
print(sum(data$t))
summary(data$t)

data1 = read.csv('~/share/mlrecs/starbucks-idle-times.csv', header = FALSE)
colnames(data1) = c('id', 't')
data1$area = 'Static'
print(nrow(data1))
print(sum(data1$t))
summary(data1$t)

data$t  = (data$t / 1000) / 60
data1$t = (data1$t / 1000) / 60

print('Dynamic')
print(ecdf(data$t)(180))
print(quantile(data$t, 0.5))
print(quantile(data$t, 0.95))
line95dyn = round(quantile(data$t, 0.95), 2)
print('Static')
print(ecdf(data1$t)(180))
print(quantile(data1$t, 0.5))
print(quantile(data1$t, 0.95))
line95stat = round(quantile(data1$t, 0.95), 2)

data = rbind(data, data1)

ggplot(data, aes(x = t, color = area)) +
	geom_vline(aes(xintercept = line95dyn), color="forestgreen") +
	geom_text(aes(x=line95dyn + 8, y = 0.3, label=paste("95% of dynamic <", line95dyn, 'mins')), colour="forestgreen", angle=90, size=6, family='CM Roman') +
	geom_vline(aes(xintercept = line95stat), color="forestgreen") +
	geom_text(aes(x=line95stat + 8, y = 0.3, label=paste("95% of static <", line95stat, 'mins')), colour="forestgreen", angle=90, size=6, family='CM Roman') +
	#geom_vline(aes(xintercept = 1000, color="forestgreen")) +
	#geom_text(aes(x=980, label="99.17% are < 1000", y=0.5), colour="forestgreen", angle=90, size=6, family='CM Roman') +

	stat_ecdf(pad = FALSE) +
	#geom_density(alpha = 0.4) +
	scale_color_brewer(palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Avatar idle time (mins)") +
	ylab("CDF") +
	xlim(0, 220) +
	labs(color = "Area") +
	theme(
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.text     = element_text(size = 20, family='CM Roman'),
		legend.title    = element_text(size = 28, family='CM Roman'),
		legend.position = c(0.52, 0.5)
	)

filename = './idle-time-cdf.pdf'
ggsave(filename, width = 10)
embed_fonts(filename)

#
# Transitions
#


data = read.csv('~/share/mlrecs/3-transitions.csv')

print('Dynamic')
summary(data[data$type == 'active2active', ]$probability)
summary(data[data$type == 'active2idle', ]$probability)
summary(data[data$type == 'idle2active', ]$probability)
summary(data[data$type == 'idle2idle', ]$probability)

ggplot(data, aes(x = probability, color = type)) +
	stat_ecdf(pad = FALSE) +
	#geom_density(alpha = 0.4) +
	scale_color_brewer(labels = c("Active to active", "Active to idle", "Idle to active", "Idle to idle"), palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Probability") +
	ylab("CDF") +
	labs(color = "Transition") +
	theme(
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.text     = element_text(size = 20, family='CM Roman'),
		legend.title    = element_text(size = 28, family='CM Roman'),
		legend.position = c(0.5, 0.5)
	)

filename = './3-transitions.pdf'
ggsave(filename, width = 10)
embed_fonts(filename)

data = read.csv('~/share/mlrecs/starbucks-transitions.csv')

print('Static')
summary(data[data$type == 'active2active', ]$probability)
summary(data[data$type == 'active2idle', ]$probability)
summary(data[data$type == 'idle2active', ]$probability)
summary(data[data$type == 'idle2idle', ]$probability)

ggplot(data, aes(x = probability, color = type)) +
	stat_ecdf(pad = FALSE) +
	#geom_density(alpha = 0.4) +
	scale_color_brewer(labels = c("Active to active", "Active to idle", "Idle to active", "Idle to idle"), palette = "Set1") +
	theme_bw(base_size=14) +
	xlab("Probability") +
	ylab("CDF") +
	labs(color = "Transition") +
	theme(
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.text     = element_text(size = 20, family='CM Roman'),
		legend.title    = element_text(size = 28, family='CM Roman'),
		legend.position = c(0.5, 0.5)
	)

filename = './starbucks-transitions.pdf'
ggsave(filename, width = 10)
embed_fonts(filename)
