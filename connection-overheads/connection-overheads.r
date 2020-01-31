library(ggplot2)
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

#
# Latency
#

data = read.csv('./latency.csv')

ggplot(data, aes(x=delay, y=time)) +
	#stat_summary(aes(), geom = 'ribbon', fun.data = mean_cl_normal, fun.args = list(conf.int=0.95), alpha = 0.5) +
	#stat_summary(aes(), fun.y = mean, geom = 'line') +
	#geom_violin() +
	#geom_boxplot(width=1, outlier.shape = NA, alpha = 0.5) +
	#stat_summary(fun.y=mean, colour="darkred", geom="point",
	#             shape=18, size=6, show.legend = FALSE) +
	stat_smooth(aes(), span = 1) +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	#scale_y_continuous(labels=format_si()) +
	xlab("Delay (ms)") +
	ylab("Time (ms)") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30)
	)

ggsave('./latency-overhead.pdf', width = 12, height = 12)
embed_fonts('./latency-overhead.pdf')


#
# Latency
#

data = read.csv('./loss.csv')

ggplot(data, aes(x=loss, y=time)) +
	#geom_line(aes(color=Topology)) +
	#stat_summary(aes(fill = Topology), geom = 'ribbon', fun.data = mean_cl_normal, fun.args = list(conf.int=0.95), alpha = 0.5) +
	#stat_summary(aes(y = data, color = Topology), fun.y = mean, geom = 'line') +
	#geom_violin() +
	#geom_boxplot(width=1, outlier.shape = NA, alpha = 0.5) +
	#stat_summary(fun.y=mean, colour="darkred", geom="point",
	#             shape=18, size=6, show.legend = FALSE) +
	#geom_point(alpha = 0.5, jitter = 10) +
	stat_smooth(aes(), span = 1) +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	#scale_y_continuous(labels=format_si()) +
	xlab("Loss (%)") +
	ylab("Time (ms)") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 30),
		legend.title     = element_text(size = 30)
	)

ggsave('./loss-overhead.pdf', width = 12, height = 12)
embed_fonts('./loss-overhead.pdf')
