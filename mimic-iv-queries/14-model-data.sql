-- 14 Modeling table: train on 2008-2016, test on 2017-2019; 2020-2022 left out (incomplete records, see 12).
-- Status: not run yet. Check after running: train 13,520 stays, test 5,495 stays.
-- language_group is kept for subgroup checks only and is not a model input.
CREATE OR REPLACE TABLE `physionet-data-513915.delirium.model_data` AS
SELECT
  stay_id,
  IF(anchor_year_group IN ('2008 - 2010', '2011 - 2013', '2014 - 2016'), 'train', 'test') AS split,
  delirium_48h,
  age, gender, admission_group, first_careunit,
  IF(dementia, 1, 0) AS dementia,
  IF(ventilated_24h, 1, 0) AS ventilated_24h,
  IF(benzo_24h, 1, 0) AS benzo_24h,
  IF(sedative_24h, 1, 0) AS sedative_24h,
  IF(opioid_24h, 1, 0) AS opioid_24h,
  CASE
    WHEN UPPER(language) = 'ENGLISH' THEN 'English'
    WHEN language IS NULL OR language = '?' THEN 'Unknown'
    ELSE 'Other'
  END AS language_group
FROM `physionet-data-513915.delirium.icu_cohort`
WHERE NOT positive_first_24h
  AND delirium_48h IS NOT NULL
  AND anchor_year_group IN ('2008 - 2010', '2011 - 2013', '2014 - 2016', '2017 - 2019');

SELECT split, COUNT(*) AS n, ROUND(100 * AVG(delirium_48h), 1) AS pct_delirium
FROM `physionet-data-513915.delirium.model_data`
GROUP BY split;
