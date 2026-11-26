-- 04 The ICU 80+ row of query 03 on its own (its last two numbers were cut off when copied).
-- Status: run in November 2026. Result: n 19,472; assessed 13,899; delirium 5,394; 38.8%.
WITH cam AS (
  SELECT stay_id,
         LOGICAL_OR(value = 'Positive') AS positive,
         LOGICAL_OR(value IN ('Positive', 'Negative')) AS assessed
  FROM `physionet-data.mimiciv_3_1_icu.chartevents`
  WHERE itemid = 228332
  GROUP BY stay_id
)
SELECT COUNT(*) AS n,
       COUNTIF(c.assessed) AS n_assessed,
       COUNTIF(c.positive) AS n_delirium,
       ROUND(100 * SAFE_DIVIDE(COUNTIF(c.positive), COUNTIF(c.assessed)), 1) AS pct
FROM `physionet-data.mimiciv_3_1_icu.icustays` AS s
JOIN `physionet-data.mimiciv_3_1_hosp.admissions` AS a ON a.hadm_id = s.hadm_id
JOIN `physionet-data.mimiciv_3_1_hosp.patients` AS p ON p.subject_id = s.subject_id
LEFT JOIN cam AS c ON c.stay_id = s.stay_id
WHERE p.anchor_age + EXTRACT(YEAR FROM a.admittime) - p.anchor_year >= 80;
