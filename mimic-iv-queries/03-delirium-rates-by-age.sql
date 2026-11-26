-- 03 How often delirium is recorded: CAM-ICU in the ICU, and diagnosis codes across hospital stays, by age group.
-- Status: run in November 2026. Result (pct):
--   ICU stay, CAM-ICU positive among assessed: 18-64 28.7%; 65-79 32.8%; 80+ 38.8% (see 04); overall 32.1%.
--   Hospital stay with ICU, delirium code: 18-64 3.3%; 65-79 5.7%; 80+ 9.0%.
--   Hospital stay without ICU, delirium code: 18-64 0.3%; 65-79 1.5%; 80+ 4.2%.
-- Codes include delirium superimposed on dementia and exclude alcohol withdrawal and substance-induced delirium.
WITH adults AS (
  SELECT a.hadm_id,
         CASE
           WHEN p.anchor_age + EXTRACT(YEAR FROM a.admittime) - p.anchor_year < 65 THEN '18-64'
           WHEN p.anchor_age + EXTRACT(YEAR FROM a.admittime) - p.anchor_year < 80 THEN '65-79'
           ELSE '80+'
         END AS age_group
  FROM `physionet-data.mimiciv_3_1_hosp.admissions` AS a
  JOIN `physionet-data.mimiciv_3_1_hosp.patients` AS p ON p.subject_id = a.subject_id
  WHERE p.anchor_age + EXTRACT(YEAR FROM a.admittime) - p.anchor_year >= 18
),
cam AS (
  SELECT ce.stay_id,
         LOGICAL_OR(LOWER(ce.value) = 'positive') AS positive,
         LOGICAL_OR(LOWER(ce.value) IN ('positive', 'negative')) AS assessed
  FROM `physionet-data.mimiciv_3_1_icu.chartevents` AS ce
  JOIN `physionet-data.mimiciv_3_1_icu.d_items` AS di ON di.itemid = ce.itemid
  WHERE LOWER(di.label) = 'delirium assessment'
  GROUP BY ce.stay_id
),
icu AS (
  SELECT 'ICU stay, CAM-ICU' AS setting, ad.age_group,
         COUNT(*) AS n,
         COUNTIF(c.assessed) AS n_assessed,
         COUNTIF(c.positive) AS n_delirium
  FROM `physionet-data.mimiciv_3_1_icu.icustays` AS s
  JOIN adults AS ad ON ad.hadm_id = s.hadm_id
  LEFT JOIN cam AS c ON c.stay_id = s.stay_id
  GROUP BY ad.age_group
),
dx AS (
  SELECT DISTINCT hadm_id
  FROM `physionet-data.mimiciv_3_1_hosp.diagnoses_icd`
  WHERE (icd_version = 10 AND STARTS_WITH(icd_code, 'F05'))
     OR (icd_version = 9 AND icd_code IN ('2930', '2931', '2903', '29011', '29041'))
),
icu_hadm AS (
  SELECT DISTINCT hadm_id FROM `physionet-data.mimiciv_3_1_icu.icustays`
),
hosp AS (
  SELECT IF(i.hadm_id IS NULL, 'Hospital stay without ICU, codes', 'Hospital stay with ICU, codes') AS setting,
         ad.age_group,
         COUNT(*) AS n,
         CAST(NULL AS INT64) AS n_assessed,
         COUNTIF(d.hadm_id IS NOT NULL) AS n_delirium
  FROM adults AS ad
  LEFT JOIN icu_hadm AS i ON i.hadm_id = ad.hadm_id
  LEFT JOIN dx AS d ON d.hadm_id = ad.hadm_id
  GROUP BY setting, ad.age_group
)
SELECT setting, age_group, n, n_assessed, n_delirium,
       ROUND(100 * SAFE_DIVIDE(n_delirium, COALESCE(n_assessed, n)), 1) AS pct
FROM (SELECT * FROM icu UNION ALL SELECT * FROM hosp)
ORDER BY setting, age_group;
