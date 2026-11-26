-- 13 On which ICU day the first positive CAM-ICU appears (first ICU stay per patient).
-- Status: not run yet. Use it to decide between predicting 12 or 24 hours after ICU admission.
-- It shows when delirium was first detected, which depends on when assessments were done.
WITH first_stay AS (
  SELECT stay_id, intime
  FROM (
    SELECT s.stay_id, s.intime,
           ROW_NUMBER() OVER (PARTITION BY s.subject_id ORDER BY s.intime) AS k
    FROM `physionet-data.mimiciv_3_1_icu.icustays` AS s
  )
  WHERE k = 1
),
first_pos AS (
  SELECT f.stay_id, ANY_VALUE(f.intime) AS intime, MIN(ce.charttime) AS first_positive
  FROM first_stay AS f
  JOIN `physionet-data.mimiciv_3_1_icu.chartevents` AS ce ON ce.stay_id = f.stay_id
  WHERE ce.itemid = 228332 AND ce.value = 'Positive'
  GROUP BY f.stay_id
)
SELECT
  CASE
    WHEN DATETIME_DIFF(first_positive, intime, HOUR) < 24 THEN 'a. Day 1 (0-24 h)'
    WHEN DATETIME_DIFF(first_positive, intime, HOUR) < 48 THEN 'b. Day 2 (24-48 h)'
    WHEN DATETIME_DIFF(first_positive, intime, HOUR) < 72 THEN 'c. Day 3 (48-72 h)'
    WHEN DATETIME_DIFF(first_positive, intime, HOUR) < 168 THEN 'd. Days 4-7'
    ELSE 'e. After day 7'
  END AS first_positive_on,
  COUNT(*) AS n_stays,
  ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM first_pos
GROUP BY first_positive_on
ORDER BY first_positive_on;
