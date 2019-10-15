library(ggplot2)

library(extrafont)

data = read.csv('lat-ranges.csv')
colnames(data) = c('range')

ggplot(data, aes(x=range)) +
	geom_histogram(binwidth=1) +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	xlab("Latency range (ms)") +
	ylab("Number of edges") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
	)

ggsave('ranges.pdf', width = 12)
embed_fonts('ranges.pdf')

data = read.csv('lat-sds.csv')
colnames(data) = c('sd')

ggplot(data, aes(x=sd)) +
	geom_density() +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	xlab("Latency standard deviations") +
	ylab("Density") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
	)

ggsave('sds.pdf', width = 12)
embed_fonts('sds.pdf')

data = read.csv('lat-means.csv')
colnames(data) = c('means')

ggplot(data, aes(x=means)) +
	geom_density() +
	theme_bw(base_size=14) +
	#scale_fill_brewer(palette = 'Set2') +
	#scale_y_log10() +
	#scale_y_continuous(labels=f2si) +
	xlab("Latency means") +
	ylab("Density") +
	#labs(color = "Topology") +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x      = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
	)

ggsave('means.pdf', width = 12)
embed_fonts('means.pdf')
