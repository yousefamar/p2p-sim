library(tidyr)
library(dplyr, warn.conflicts = FALSE)
df <- tibble(
						 item_id = c("a", "b", "a"),
						 item_name = c("a", "b", "b"),
						 value1 = 1:3,
						 value2 = 4:6
)
df = complete(df, item_id, item_name)
print(df)
#> # A tibble: 4 x 5
#>   group item_id item_name value1 value2
#>   <dbl>   <dbl> <chr>      <int>  <int>
#> 1     1       1 a              1      4
#> 2     1       2 b              3      6
#> 3     2       1 a             NA     NA
#> 4     2       2 b              2      5

# You can also choose to fill in missing values
df = complete(df, item_id, item_name, fill = list(value1 = 0, value2 = 0))
print(df)
#> # A tibble: 4 x 5
#>   group item_id item_name value1 value2
#>   <dbl>   <dbl> <chr>      <dbl>  <int>
#> 1     1       1 a              1      4
#> 2     1       2 b              3      6
#> 3     2       1 a              0     NA
#> 4     2       2 b              2      5
