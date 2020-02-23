library(ggplot2)
library(scales)
library(extrafont)
loadfonts()

filename = './area-visitors.pdf'

data = read.csv('~/share/mlrecs/area-visitors.csv')
#print(quantile(data$totalVisitors, 0.995))
cdf = ecdf(data$totalVisitors)
print(cdf(250))
print(cdf(500))
print(cdf(1000))
print(nrow(data))
summary(data$totalVisitors)

#tikz('./area-visitors.tex', width = 10)
ggplot(data, aes(x = totalVisitors)) +
	stat_ecdf(pad = FALSE) +
	geom_vline(aes(xintercept = 250, color="red")) +
	geom_text(aes(x=230, label="95.02% are < 250", y=0.5), colour="red", angle=90, size=6, family='CM Roman') +
	geom_vline(aes(xintercept = 500, color="red")) +
	geom_text(aes(x=480, label="98.09% are < 500", y=0.5), colour="red", angle=90, size=6, family='CM Roman') +
	geom_vline(aes(xintercept = 1000, color="red")) +
	geom_text(aes(x=980, label="99.17% are < 1000", y=0.5), colour="red", angle=90, size=6, family='CM Roman') +
	theme_bw(base_size=14) +
	xlab("Total area visitors") +
	ylab("CDF") +
	xlim(0, 1000) +
	theme(
		axis.text       = element_text(size = 28, family='CM Roman'),
		axis.title      = element_text(size = 30, family='CM Roman'),
		legend.position = "none"
	)

ggsave(filename, width = 10)
embed_fonts(filename)
