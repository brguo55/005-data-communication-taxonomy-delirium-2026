-- 20 Candidate case profiles for the clinician test: groups of similar test-year stays (2017-2019), each with its
--   observed delirium rate (the reference for a case) and the model's mean predicted risk (what the tool would show).
-- Status: not run yet.
-- Why groups, not single patients: the MIMIC-IV data use agreement does not allow patient-level records on a public
--   website or in an online AI tool. Each test case is written as a composite of a group of at least 30 similar stays,
--   so no case describes a real person, and only these group-level numbers leave BigQuery.
-- How to read it: gap_points = observed minus predicted. Where the gap is smaller than margin_points (about a 95%
--   margin for the observed rate), the model is about right for that group; a gap clearly larger means it is wrong,
--   too low when positive and too high when negative.
WITH p AS (
  SELECT *,
         (SELECT prob FROM UNNEST(predicted_delirium_48h_probs) WHERE label = 1) AS risk
  FROM ML.PREDICT(MODEL `physionet-data-513915.delirium.lr_24h`,
    (SELECT * FROM `physionet-data-513915.delirium.model_data` WHERE split = 'test'))
)
SELECT
  CASE WHEN age < 65 THEN '18-64' WHEN age < 80 THEN '65-79' ELSE '80+' END AS age_group,
  admission_group, first_careunit, dementia, ventilated_24h, benzo_24h,
  COUNT(*) AS n,
  COUNTIF(delirium_48h = 1) AS n_delirium,
  ROUND(100 * AVG(delirium_48h), 1) AS observed_pct,
  ROUND(100 * AVG(risk), 1) AS predicted_pct,
  ROUND(100 * (AVG(delirium_48h) - AVG(risk)), 1) AS gap_points,
  ROUND(100 * 1.96 * SQRT(AVG(delirium_48h) * (1 - AVG(delirium_48h)) / COUNT(*)), 1) AS margin_points
FROM p
GROUP BY age_group, admission_group, first_careunit, dementia, ventilated_24h, benzo_24h
HAVING COUNT(*) >= 30
ORDER BY predicted_pct;
