library(ggplot2)
library(sitools)
library(forcats)
library(ggrepel)

library(extrafont)

format_si <- function(...) {
	# Based on code by Ben Tupper
	# https://stat.ethz.ch/pipermail/r-help/2012-January/299804.html

	function(x) {
		limits <- c(1e-24, 1e-21, 1e-18, 1e-15, 1e-12,
								1e-9,  1e-6,  1e-3,  1e0,   1e3,
								1e6,   1e9,   1e12,  1e15,  1e18,
								1e21,  1e24)
		prefix <- c("y",   "z",   "a",   "f",   "p",
								"n",   "µ",   "m",   " ",   "k",
								"M",   "G",   "T",   "P",   "E",
								"Z",   "Y")

		# Vector with array indices according to position in intervals
		i <- findInterval(abs(x), limits)

		# Set prefix to " " for very small values < 1e-24
		i <- ifelse(i==0, which(limits == 1e0), i)

		paste(format(round(x/limits[i], 1),
								 trim=TRUE, scientific=FALSE, ...),
					prefix[i])
	}
}

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

latencies = read.csv('./out/latency.csv')
colnames(latencies) = c('latency', 'Topology')
connections = read.csv('./out/connections.csv')
colnames(connections) = c('players', 'connections', 'Topology')
connections['connectedness'] = 2 * connections['connections'] / (connections['players'] * (connections['players'] - 1))
connections$connectedness[connections$players < 2 ] = 1
updown = read.csv('./out/updown.csv')
colnames(updown) = c('playerID', 'Topology', 'up', 'down')
meanLats = aggregate(latency ~ Topology, data = latencies, mean)
meanConn = aggregate(connectedness ~ Topology, data = connections, mean)
latCon = merge(meanLats, meanConn)

print(latCon)

#
# Latency-connectedness scatter plot
#

#ylim1 = boxplot.stats(latencies$latency)$stats[c(1, 5)]

ggplot(latCon, aes(x=connectedness, y=latency, label=Topology)) +
	geom_point(size=3) +
	geom_label_repel(size = 6, box.padding = 0.5, point.padding = 0.25) +
	#coord_cartesian(ylim = ylim1) +
	theme_bw(base_size=14) +
	xlab("Mean connectedness") +
	ylab("Mean end-to-end latency (ms)") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title       = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 25),
		legend.title     = element_text(size = 25),
		legend.position  = c(0.75, 0.6)
	)

ggsave('./out/plots/latency-connectedness.pdf', width = 12)
embed_fonts('./out/plots/latency-connectedness.pdf')

#
# Latency box plots
#

#ylim1 = boxplot.stats(latencies$latency)$stats[c(1, 5)]

ggplot(latencies, aes(x=reorder(Topology, latency, FUN=median), y=latency)) +
	geom_boxplot(outlier.shape = NA) +
	stat_summary(fun.y=mean, colour="darkred", geom="point",
	             shape=18, size=6, show.legend = FALSE) +
	#coord_cartesian(ylim = ylim1) +
	theme_bw(base_size=14) +
	xlab("Connections") +
	ylab("End-to-end latency") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title       = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30),
		legend.position  = c(0.25, 0.75)
	)

ggsave('./out/plots/latency.pdf', width = 12, height = 12)
embed_fonts('./out/plots/latency.pdf')

#
# Connections per playercount
#

ggplot(connections, aes(x=players, y=connections, group=Topology)) +
	#geom_line(aes(color=Topology)) +
	stat_summary(aes(fill = Topology), geom = 'ribbon', fun.data = mean_cl_normal, fun.args = list(conf.int=0.95), alpha = 0.5) +
	stat_summary(aes(y = connections, color = Topology), fun.y = mean, geom = 'line') +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	#scale_y_continuous(labels=format_si()) +
	xlab("Number of Nodes") +
	ylab("Connections") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30)
	)

ggsave('./out/plots/connections.pdf', width = 18)
embed_fonts('./out/plots/connections.pdf')

#
# Connectedness per playercount
#

ggplot(connections, aes(x=players, y=connectedness, group=Topology)) +
	#geom_line(aes(color=Topology)) +
	stat_summary(aes(fill = Topology), geom = 'ribbon', fun.data = mean_cl_normal, fun.args = list(conf.int=0.95), alpha = 0.5) +
	stat_summary(aes(y = connectedness, color = Topology), fun.y = mean, geom = 'line') +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	#scale_y_continuous(labels=format_si()) +
	xlab("Number of nodes") +
	ylab("Connectedness") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30)
	)

ggsave('./out/plots/connectedness.pdf', width = 18)
embed_fonts('./out/plots/connectedness.pdf')

#
# Upload distributions by topology
#

#ylim1 = boxplot.stats(latencies$latency)$stats[c(1, 5)]

ggplot(updown, aes(x=Topology, y=up)) +
	geom_violin() +
	geom_boxplot(width=0.25, outlier.shape = NA) +
	#geom_boxplot(outlier.shape = NA) +
	#geom_point(size = 3) +
	#geom_jitter(position=position_jitter(0.5)) +
	stat_summary(fun.y=mean, colour="darkred", geom="point",
	             shape=18, size=6, show.legend = FALSE) +
	#coord_cartesian(ylim = ylim1) +
	scale_y_continuous(labels=format_si()) +
	theme_bw(base_size=14) +
	xlab("Topology") +
	ylab("Upload (bytes)") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title       = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30),
		legend.position  = c(0.25, 0.75)
	)

ggsave('./out/plots/up.pdf', width = 12, height = 12)
embed_fonts('./out/plots/up.pdf')

#
# Download distributions by topology
#

#ylim1 = boxplot.stats(latencies$latency)$stats[c(1, 5)]

ggplot(updown, aes(x=Topology, y=down)) +
	geom_violin() +
	geom_boxplot(width=0.25, outlier.shape = NA) +
	#geom_boxplot(outlier.shape = NA) +
	#geom_point(size = 3) +
	#geom_jitter(position=position_jitter(0.5)) +
	stat_summary(fun.y=mean, colour="darkred", geom="point",
	             shape=18, size=6, show.legend = FALSE) +
	#coord_cartesian(ylim = ylim1) +
	scale_y_continuous(labels=format_si()) +
	theme_bw(base_size=14) +
	xlab("Topology") +
	ylab("Download (bytes)") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title       = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30),
		legend.position  = c(0.25, 0.75)
	)

ggsave('./out/plots/down.pdf', width = 12, height = 12)
embed_fonts('./out/plots/down.pdf')

exit()

data = read.csv('./out/traffic-short.csv')
colnames(data) = c('ts', 'players', 'hops', 'latency', 'sender', 'up', 'down', 'Topology', 'msgID')
data['tss'] = floor(data['ts'] / 1000) * 1000
#data1$hops[data1$hops < 1 ] = 1

#options(scipen = 999)
#head(subset(data, players > 30 & Topology == 'Complete'), 25)

data2 = data[,c('latency', 'Topology', 'msgID' )]
data2 = aggregate(latency ~ Topology + msgID, data = data2, sum)

data1 = data[,c('tss', 'players', 'down', 'Topology')]
data1 = aggregate(down ~ tss + players + Topology, data = data1, sum)

ggplot(data1, aes(x=players, y=down, group=Topology)) +
	#geom_line(aes(color=Topology)) +
	stat_summary(aes(fill = Topology), geom = 'ribbon', fun.data = mean_cl_normal, fun.args = list(conf.int=0.95), alpha = 0.5) +
	stat_summary(aes(y = down, color = Topology), fun.y = mean, geom = 'line') +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	scale_y_continuous(labels=format_si()) +
	xlab("Number of Peers/Clients") +
	ylab("Mean Server Traffic (KB/s)") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30),
		legend.position  = c(0.25, 0.75)
	)

ggsave('./out/plots/traffic.pdf', width = 12)
embed_fonts('./out/plots/traffic.pdf')


ggplot(data2, aes(x=players, y=connections, group=Topology)) +
	#geom_line(aes(color=Topology)) +
	stat_summary(aes(fill = Topology), geom = 'ribbon', fun.data = mean_cl_normal, fun.args = list(conf.int=0.95), alpha = 0.5) +
	stat_summary(aes(y = connections, color = Topology), fun.y = mean, geom = 'line') +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	#scale_y_continuous(labels=format_si()) +
	xlab("Number of Peers/Clients") +
	ylab("Mean connections") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30),
		legend.position  = c(0.25, 0.75)
	)

ggsave('./out/plots/connections.pdf', width = 12)
embed_fonts('./out/plots/connections.pdf')

exit()

data2 = data[,c('players', 'hops', 'Topology')]

ggplot(data2, aes(x=players, y=hops, group=Topology)) +
	#geom_line(aes(color=Topology)) +
	stat_summary(aes(fill = Topology), geom = 'ribbon', fun.data = mean_cl_normal, fun.args = list(conf.int=0.95), alpha = 0.5) +
	stat_summary(aes(y = hops, color = Topology), fun.y = mean, geom = 'line') +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	#scale_y_continuous(labels=format_si()) +
	xlab("Number of Peers/Clients") +
	ylab("Mean hops") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30),
		legend.position  = c(0.25, 0.75)
	)

ggsave('./out/plots/hops.pdf', width = 12)
embed_fonts('./out/plots/hops.pdf')

data2 = data[,c('players', 'latency', 'Topology')]

ggplot(data2, aes(x=players, y=latency, group=Topology)) +
	#geom_line(aes(color=Topology)) +
	stat_summary(aes(fill = Topology), geom = 'ribbon', fun.data = mean_cl_normal, fun.args = list(conf.int=0.95), alpha = 0.5) +
	stat_summary(aes(y = latency, color = Topology), fun.y = mean, geom = 'line') +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	#scale_y_continuous(labels=format_si()) +
	xlab("Number of Peers/Clients") +
	ylab("Mean latency") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30),
		legend.position  = c(0.25, 0.75)
	)

ggsave('./out/plots/latency.pdf', width = 12)
embed_fonts('./out/plots/latency.pdf')
