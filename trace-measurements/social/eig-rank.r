library(ggplot2)
library(extrafont)
#library(tidyr)
#library(dplyr, warn.conflicts = FALSE)
library(scales)
library(hexbin)

exit <- function() {
	.Internal(.invokeRestart(list(NULL, NULL), NULL))
}

players = read.csv('~/share/mlrecs/players-measurements.csv')
print(nrow(players))

ggplot(data=players, aes(x=eigencentrality, y=rank)) +
	#geom_point(alpha = 0.3) +
	geom_hex(bins=100) +
	stat_smooth(color="red") +
	scale_fill_viridis_c() +
	scale_y_continuous(breaks=c(0,1,2,3,4,5,10)) +
	#scale_x_datetime(labels = date_format("%b %y")) +
	labs(x="Eigenvector Centrality", y="Rank", fill="Count") +
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
		legend.position  = c(0.12, 0.79)
		#panel.background = element_rect(fill="grey90", colour="grey90")
	)

ggsave('./eig-rank.pdf', width = 10)
embed_fonts('./eig-rank.pdf')
