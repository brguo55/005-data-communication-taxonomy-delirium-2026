-- 07 ICU stays per hospitalization, and time from admission to the first ICU stay.
-- Status: run in November 2026. Result: no ICU 84.4%; 1 ICU stay 14.2%; 2: 1.2%; 3+: 0.2%.
--   First ICU stay within 24 h of admission 80.3%; 1-3 days 9.2%; >3 days 10.1%; before the admission time 0.5%.
WITH adm AS (
  SELECT a.hadm_id, a.admittime,
         COUNT(i.stay_id) AS n_icu,
         MIN(i.intime) AS first_icu_in
  FROM `physionet-data.mimiciv_3_1_hosp.admissions` AS a
  LEFT JOIN `physionet-data.mimiciv_3_1_icu.icustays` AS i ON i.hadm_id = a.hadm_id
  GROUP BY a.hadm_id, a.admittime
),
labeled AS (
  SELECT '1. ICU stays in the hospitalization' AS section,
         CASE WHEN n_icu = 0 THEN '0' WHEN n_icu = 1 THEN '1' WHEN n_icu = 2 THEN '2' ELSE '3 or more' END AS category
  FROM adm
  UNION ALL
  SELECT '2. Time from admission to first ICU stay',
         CASE
           WHEN DATETIME_DIFF(first_icu_in, admittime, HOUR) < 0 THEN 'a. Before the admission time'
           WHEN DATETIME_DIFF(first_icu_in, admittime, HOUR) < 24 THEN 'b. Within 24 hours'
           WHEN DATETIME_DIFF(first_icu_in, admittime, HOUR) < 72 THEN 'c. 1 to 3 days'
           ELSE 'd. More than 3 days'
         END
  FROM adm
  WHERE n_icu > 0
)
SELECT section, category, COUNT(*) AS n_hospitalizations,
       ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY section), 1) AS pct_of_section
FROM labeled
GROUP BY section, category
ORDER BY section, category;
