-- 21 Test-year stays with coded dementia, in groups large enough to write a case from (query 20 has none:
--   dementia is too rare once split by ICU type, ventilation and benzodiazepines).
-- Status: not run yet. Same columns as 20: gap_points = observed minus predicted; compare it with margin_points.
WITH p AS (
  SELECT *,
         (SELECT prob FROM UNNEST(predicted_delirium_48h_probs) WHERE label = 1) AS risk
  FROM ML.PREDICT(MODEL `physionet-data-513915.delirium.lr_24h`,
    (SELECT * FROM `physionet-data-513915.delirium.model_data` WHERE split = 'test'))
)
SELECT
  IF(age < 80, 'Under 80', '80+') AS age_group,
  admission_group,
  COUNT(*) AS n,
  COUNTIF(delirium_48h = 1) AS n_delirium,
  ROUND(100 * AVG(delirium_48h), 1) AS observed_pct,
  ROUND(100 * AVG(risk), 1) AS predicted_pct,
  ROUND(100 * (AVG(delirium_48h) - AVG(risk)), 1) AS gap_points,
  ROUND(100 * 1.96 * SQRT(AVG(delirium_48h) * (1 - AVG(delirium_48h)) / COUNT(*)), 1) AS margin_points
FROM p
WHERE dementia = 1
GROUP BY ROLLUP (age_group, admission_group)
HAVING COUNT(*) >= 30
ORDER BY age_group, admission_group;
