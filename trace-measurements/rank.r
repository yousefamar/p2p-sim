library(ggplot2)
library(extrafont)
#library(tidyr)
#library(dplyr, warn.conflicts = FALSE)
library(jsonlite)
library(scales)
library(hexbin)

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

players = jsonlite::fromJSON("~/share/mlrecs/players.json")
print(nrow(players))

ggplot(data=players, aes(x=as.POSIXct(joinedTimestamp/1000, origin="1970-01-01"), y=rank)) +
	#geom_point(alpha = 0.3) +
	geom_hex(bins=100) +
	stat_smooth(color="red") +
	scale_fill_viridis_c() +
	scale_y_continuous(breaks=c(0,1,2,3,4,5,10)) +
	#scale_x_datetime(labels = date_format("%b %y")) +
	labs(x="Join Date", y="Rank", fill="Count") +
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
		legend.position  = c(0.8, 0.8)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./age-rank.pdf', width = 10)
embed_fonts('./age-rank.pdf')

ggplot(data=players, aes(as.POSIXct(joinedTimestamp/1000, origin="1970-01-01"))) +
	geom_histogram() +
	labs(x="Join Date", y="Player Count") +
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
		legend.position  = c(0.8, 0.8)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./age-histogram.pdf', width = 10)
embed_fonts('./age-histogram.pdf')

ggplot(data=players, aes(x=as.factor(rank))) +
	geom_bar() +
	labs(x="Rank", y="Player Count") +
	#scale_y_log10() +
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
		legend.position  = c(0.8, 0.8)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./rank-histogram.pdf', width = 10)
embed_fonts('./rank-histogram.pdf')
