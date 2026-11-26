-- 11 Why 20,958 stays had no valid assessment in the 48-hour window.
-- Status: run in November 2026. Result: left the ICU within a day 11,989 (57.2%); stayed but no assessment recorded 7,116 (34.0%);
--   only "unable to assess" 1,853 (8.8%).
WITH base AS (
  SELECT c.stay_id, s.outtime, DATETIME_ADD(s.intime, INTERVAL 24 HOUR) AS t0
  FROM `physionet-data-513915.delirium.icu_cohort` AS c
  JOIN `physionet-data.mimiciv_3_1_icu.icustays` AS s ON s.stay_id = c.stay_id
  WHERE NOT c.positive_first_24h AND c.delirium_48h IS NULL
),
w AS (
  SELECT b.stay_id, COUNTIF(ce.value = 'UTA') AS n_uta
  FROM base AS b
  LEFT JOIN `physionet-data.mimiciv_3_1_icu.chartevents` AS ce
    ON ce.stay_id = b.stay_id AND ce.itemid = 228332
   AND ce.charttime >= b.t0 AND ce.charttime < DATETIME_ADD(b.t0, INTERVAL 48 HOUR)
  GROUP BY b.stay_id
)
SELECT
  CASE
    WHEN w.n_uta > 0 THEN 'a. Only unable to assess'
    WHEN DATETIME_DIFF(b.outtime, b.t0, HOUR) < 24 THEN 'b. Left the ICU within a day, no assessment'
    ELSE 'c. Stayed, but no assessment recorded'
  END AS reason,
  COUNT(*) AS n_stays
FROM base AS b
JOIN w ON w.stay_id = b.stay_id
GROUP BY reason
ORDER BY reason;
