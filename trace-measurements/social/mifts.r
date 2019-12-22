library(ggplot2)
library(extrafont)
#library(tidyr)
#library(dplyr, warn.conflicts = FALSE)
library(scales)
library(hexbin)

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

players = jsonlite::fromJSON("~/share/mlrecs/players-mift.json")
print(nrow(players))

ggplot(data=players, aes(x=as.POSIXct(joinedTimestamp/1000, origin="1970-01-01"), y=miftCount)) +
	#geom_point(alpha = 0.3) +
	geom_hex(bins=100) +
	#stat_smooth(color="red") +
	scale_fill_viridis_c() +
	#scale_x_datetime(labels = date_format("%b %y")) +
	labs(x="Join Date", y="Weighted In-Degree\n(Mifts Received)", fill="Count") +
	theme_bw(base_size=14) +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x     = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 20),
		legend.title     = element_text(size = 28),
		legend.position  = c(0.85, 0.79)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./age-mifts.pdf', width = 10)
embed_fonts('./age-mifts.pdf')

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

ggplot(data=players, aes(x=rank, y=miftCount)) +
	#geom_point(alpha = 0.3) +
	geom_hex(bins=100) +
	#stat_smooth(color="red") +
	scale_fill_viridis_c(labels=format_si()) +
	scale_x_continuous(breaks=c(0,1,2,3,4,5,10)) +
	labs(x="Rank", y="Weighted In-Degree\n(Mifts Received)", fill="Count") +
	theme_bw(base_size=14) +
	theme(
		#panel.grid.major = element_line(colour = "white"),
		#panel.grid.minor = element_line(colour = "white"),
		axis.text        = element_text(size = 28),
		#axis.text.x     = element_text(angle = 90, hjust = 1, vjust = 0.5),
		#axis.title      = element_text(size = 20, face="bold")
		axis.title       = element_text(size = 30),
		legend.text      = element_text(size = 20),
		legend.title     = element_text(size = 28),
		legend.position  = c(0.72, 0.79)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./rank-mifts.pdf', width = 10)
embed_fonts('./rank-mifts.pdf')
