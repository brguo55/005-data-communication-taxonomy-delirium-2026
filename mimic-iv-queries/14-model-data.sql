-- 14 Modeling table: train on 2008-2016, test on 2017-2019; 2020-2022 left out (incomplete records, see 12).
-- Status: run on 2026-11-26. Result: train 13,520 stays (14.9% delirium), test 5,495 stays (15.7%), as expected.
-- language_group, race_group and insurance are kept for subgroup checks only and are not model inputs.
-- ICU types with fewer than 100 training stays are merged into 'Other'. In the first fit (2026-11-27) two of them, each
--   a single stay, drove their coefficients to odds ratios in the hundreds and thousands (separation), and two others
--   appear only in the test years.
CREATE OR REPLACE TABLE `physionet-data-513915.delirium.model_data` AS
SELECT
  stay_id,
  IF(anchor_year_group IN ('2008 - 2010', '2011 - 2013', '2014 - 2016'), 'train', 'test') AS split,
  delirium_48h,
  age, gender, admission_group,
  CASE
    WHEN first_careunit IN (
      'Cardiac Vascular Intensive Care Unit (CVICU)', 'Coronary Care Unit (CCU)',
      'Medical Intensive Care Unit (MICU)', 'Medical/Surgical Intensive Care Unit (MICU/SICU)',
      'Neuro Intermediate', 'Neuro Stepdown', 'Neuro Surgical Intensive Care Unit (Neuro SICU)',
      'Surgical Intensive Care Unit (SICU)', 'Trauma SICU (TSICU)') THEN first_careunit
    ELSE 'Other'
  END AS first_careunit,
  IF(dementia, 1, 0) AS dementia,
  IF(ventilated_24h, 1, 0) AS ventilated_24h,
  IF(benzo_24h, 1, 0) AS benzo_24h,
  IF(sedative_24h, 1, 0) AS sedative_24h,
  IF(opioid_24h, 1, 0) AS opioid_24h,
  CASE
    WHEN UPPER(language) = 'ENGLISH' THEN 'English'
    WHEN language IS NULL OR language = '?' THEN 'Unknown'
    ELSE 'Other'
  END AS language_group,
  CASE
    WHEN STARTS_WITH(race, 'WHITE') THEN 'White'
    WHEN STARTS_WITH(race, 'BLACK') THEN 'Black'
    WHEN STARTS_WITH(race, 'HISPANIC') OR race = 'SOUTH AMERICAN' THEN 'Hispanic or Latino'
    WHEN STARTS_WITH(race, 'ASIAN') THEN 'Asian'
    WHEN race IS NULL OR race IN ('UNKNOWN', 'UNABLE TO OBTAIN', 'PATIENT DECLINED TO ANSWER') THEN 'Unknown'
    ELSE 'Other'
  END AS race_group,
  COALESCE(insurance, 'Unknown') AS insurance
FROM `physionet-data-513915.delirium.icu_cohort`
WHERE NOT positive_first_24h
  AND delirium_48h IS NOT NULL
  AND anchor_year_group IN ('2008 - 2010', '2011 - 2013', '2014 - 2016', '2017 - 2019');

SELECT split, COUNT(*) AS n, ROUND(100 * AVG(delirium_48h), 1) AS pct_delirium
FROM `physionet-data-513915.delirium.model_data`
GROUP BY split;
