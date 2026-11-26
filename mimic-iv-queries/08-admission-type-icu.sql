-- 08 Share of hospitalizations that reach the ICU, by admission type.
-- Status: run in November 2026. Result, grouped: emergency or urgent 23.6% reach the ICU (70.5% of ICU hospitalizations);
--   observation 5.7% (15.7%); planned surgery or elective 21.0% (13.8%).
WITH icu_hadm AS (
  SELECT DISTINCT hadm_id FROM `physionet-data.mimiciv_3_1_icu.icustays`
)
SELECT a.admission_type,
       COUNT(*) AS n_hospitalizations,
       COUNTIF(i.hadm_id IS NOT NULL) AS n_with_icu,
       ROUND(100 * COUNTIF(i.hadm_id IS NOT NULL) / COUNT(*), 1) AS pct_with_icu
FROM `physionet-data.mimiciv_3_1_hosp.admissions` AS a
LEFT JOIN icu_hadm AS i ON i.hadm_id = a.hadm_id
GROUP BY a.admission_type
ORDER BY n_hospitalizations DESC;
