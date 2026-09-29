# Sources

Every figure in `stats.json` points at one entry below via `source_id`. Figures were
read from the pages listed on 2026-09-29. Where a number came from a secondary
report of someone else's data, both publishers are named.

Entries marked **estimate** are not published figures. They explain why no source
was used.

## seso_circana_2023
- **Title:** Bike Retailers Ride Inventory Glut As Demand Softens
- **Publisher:** Shop Eat Surf Outdoor, reporting Circana (formerly NPD) data
- **Year:** 2023 (published 2023-06-05)
- **URL:** https://shop-eat-surf-outdoor.com/news/bike-retailers-ride-inventory-glut-as-demand-softens/131306/
- **Used for:** `us_bike_market_total` ($7.0B, 12 months to April 2023), `us_bike_market_prior` ($7.8B)

## pfb_ebike_2024
- **Title:** Electric Bicycle Market Insights From Industry Experts
- **Publisher:** PeopleForBikes, citing Circana Retail Tracking Service, Workstand, and the Physical Activity Council
- **Year:** 2024
- **URL:** https://www.peopleforbikes.org/news/electric-bicycle-market-insights-2024
- **Used for:** `ebike_dollar_share`, `ebike_unit_share`, `ebike_growth_share`, `ebike_ibd_asp`, `ebike_unit_growth_2024`, `ebike_rider_share`, `ebike_rider_share_2021`

## pfb_kids_2024
- **Title:** Tracking Seasonality and International Sales Trends of Kids' Bikes
- **Publisher:** PeopleForBikes, citing Circana
- **Year:** 2024 (data year 2023)
- **URL:** https://www.peopleforbikes.org/news/kids-bikes-sales-trends
- **Used for:** `kids_bike_unit_share` (57%). Read from the page's search excerpt.

## oia_2025
- **Title:** 2025 Outdoor Participation Trends Report
- **Publisher:** Outdoor Industry Association / Outdoor Foundation
- **Year:** 2025 (data year 2024)
- **URL:** https://outdoorindustry.org/ (report PDF: material-civet.files.svdcdn.com/.../2025-OIA_Participation_Trends_Full_Report...)
- **Used for:** `us_cyclists` (54M rode road/mountain/gravel/BMX), `road_cyclists` (42.5M)

## tpl_2025
- **Title:** Economic Benefits of Mountain Biking (Green Paper)
- **Publisher:** Trust for Public Land, citing Outdoor Foundation and Outdoor Industry Association
- **Year:** 2025
- **URL:** https://www.tpl.org/wp-content/uploads/2025/04/040225_Green-Paper_Mountain-Biking_FINAL3.pdf
- **Used for:** `mtb_participants` (8.7M as of 2021), `mtb_core_share` (41.5%), `mtb_trip_spend` ($416 per visit, average across studies in its literature review)

## brain_nbda_2013
- **Title:** Fred Clements: A formula for high-profit bike stores
- **Publisher:** Bicycle Retailer and Industry News, reporting National Bicycle Dealers Association (NBDA) cost-of-doing-business data
- **Year:** 2013
- **URL:** https://www.bicycleretailer.com/opinion-analysis/2013/06/14/blog-formula-high-profit-bike-stores
- **Used for:** `store_pretax_profit`, `store_profit_dollars`, `store_profit_top`, `bike_margin`, `pa_margin`, `service_share_avg`, `service_share_top`, `expense_share`, `payroll_share`, `rent_share`
- **Caveat:** the newest NBDA ratios we could read for free. NBDA's 2025/2026 studies are paywalled.

## rei_tulsa_2026
- **Title:** Tulsa Bike Repair, Tune-ups & Maintenance (service price list)
- **Publisher:** REI Co-op
- **Year:** 2026 (price list read 2026-09-29; REI notes pricing varies by location)
- **URL:** https://www.rei.com/stores/tulsa/bike-shop
- **Used for:** all `rei_*` prices (non-member prices)

## helens_2026
- **Title:** Bike Repair & Service
- **Publisher:** Helen's Cycles (Los Angeles area bike shop)
- **Year:** 2026 (read 2026-09-29)
- **URL:** https://www.helenscycles.com/articles/bike-repair-and-service-pg62.htm
- **Used for:** `helens_pad_install`, `helens_fork_overhaul`, `helens_frame_up`

## stbg_2026
- **Title:** Service Menu and Prices
- **Publisher:** Steve the Bike Guy
- **Year:** 2026 (read 2026-09-29, from the page's search excerpt)
- **URL:** https://stevethebikeguy.com/service-menu-and-prices/
- **Used for:** `stbg_fork_lower`, `stbg_fork_aircan_combo`

## bls_oews_2023
- **Title:** Occupational Employment and Wages, May 2023: 49-3091 Bicycle Repairers
- **Publisher:** US Bureau of Labor Statistics
- **Year:** 2023
- **URL:** https://www.bls.gov/oes/2023/may/oes493091.htm
- **Used for:** `bls_mechanic_wage`, `bls_mechanic_median`, `bls_mechanic_jobs`

## injury_mtb_2024
- **Title:** Rising rates of traumatic fractures among mountain bikers: A national review of emergency department visits
- **Publisher:** Injury (Elsevier), vol. 55 issue 12; Koehne et al.; NEISS data
- **Year:** 2024
- **URL:** https://doi.org/10.1016/j.injury.2024.111907
- **Used for:** `mtb_fractures_ed`, `mtb_fracture_jump`, `mtb_upper_limb_share`

## nch_mtb_2011
- **Title:** New National Study Finds Mountain Bike-Related Injuries Down 56 Percent
- **Publisher:** Nationwide Children's Hospital (study in American Journal of Sports Medicine)
- **Year:** 2011
- **URL:** https://www.nationwidechildrens.org/newsroom/news-releases/2011/02/new-national-study-finds-mountain-bike-related-injuries-down-56-percent
- **Used for:** `mtb_injury_decline` (1994-2007). Read from the page's search excerpt.

## cdc_mmwr_2021
- **Title:** Emergency Department Visits for Bicycle-Related Traumatic Brain Injuries Among Children and Adults — United States, 2009–2018
- **Publisher:** CDC, Morbidity and Mortality Weekly Report 70(19)
- **Year:** 2021
- **URL:** https://www.cdc.gov/mmwr/volumes/70/wr/mm7019a1.htm
- **Used for:** `bike_tbi_ed` (596,972 ED visits over the 10-year study period). Read from the page's search excerpt.

## estimate_repair_mix
- **Estimate.** No public dataset of bike shop repair-ticket mix was found. Flats are
  assumed to be the most common walk-in job. Used for `repair_mix_flats` and the
  job weights in `jobs.json`.

## estimate_open_days
- **Estimate.** No survey of shop opening days was found. 310 days assumes 6 days a
  week minus holidays. Used for `open_days`.

## estimate_parts_point
- **Estimate.** The game's "parts point" is an abstract unit. Its $10 retail value is
  set near the price of one inner tube and is not measured. Used for `parts_point_value`.
