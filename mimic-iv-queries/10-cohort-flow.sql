-- 10 Cohort flow, then outcome and variables by year group.
-- Status: run in November 2026. Flow: 51,837 first ICU stays of 24 h or more; 8,079 excluded for delirium in the first 24 h;
--   20,958 excluded for no valid assessment in the next 48 h; final cohort 22,800; delirium 3,535 (15.5%).
-- By year (cohort n, delirium %, ventilated %, benzodiazepine %, opioid %):
--   2008-2010 2,525 14.3 28.4 13.1 38.4 | 2011-2013 5,036 14.4 37.5 18.0 49.3 | 2014-2016 5,959 15.6 39.8 13.6 51.6
--   2017-2019 5,495 15.7 31.0 9.0 40.5 | 2020-2022 3,785 17.3 13.2 3.9 17.7 (incomplete records, see 12). Coded dementia 2-4%.
SELECT
  COUNT(*) AS first_icu_stays_over_24h,
  COUNTIF(positive_first_24h) AS excluded_delirium_first_24h,
  COUNTIF(NOT positive_first_24h AND delirium_48h IS NULL) AS excluded_no_assessment,
  COUNTIF(NOT positive_first_24h AND delirium_48h IS NOT NULL) AS final_cohort,
  COUNTIF(NOT positive_first_24h AND delirium_48h = 1) AS delirium_cases,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(NOT positive_first_24h AND delirium_48h = 1),
                          COUNTIF(NOT positive_first_24h AND delirium_48h IS NOT NULL)), 1) AS pct_delirium
FROM `physionet-data-513915.delirium.icu_cohort`;

SELECT anchor_year_group,
       COUNT(*) AS n,
       ROUND(100 * AVG(delirium_48h), 1) AS pct_delirium,
       ROUND(100 * AVG(IF(ventilated_24h, 1, 0)), 1) AS pct_ventilated,
       ROUND(100 * AVG(IF(dementia, 1, 0)), 1) AS pct_dementia,
       ROUND(100 * AVG(IF(benzo_24h, 1, 0)), 1) AS pct_benzo,
       ROUND(100 * AVG(IF(opioid_24h, 1, 0)), 1) AS pct_opioid
FROM `physionet-data-513915.delirium.icu_cohort`
WHERE NOT positive_first_24h AND delirium_48h IS NOT NULL
GROUP BY anchor_year_group
ORDER BY anchor_year_group;
