-- 21 Test-year stays with coded dementia, in groups large enough to write a case from (query 20 has none:
--   dementia is too rare once split by ICU type, ventilation and benzodiazepines).
-- Status: run on 2026-11-27. All dementia: 34.9% predicted vs 42.4% observed (n 205); under 80: 31.6% vs 43.8% (n 73),
--   the clearest gap, chosen as case 4 (tool too low, with a warning on the full display); 80+: 36.6% vs 41.7%.
-- Same columns as 20: gap_points = observed minus predicted; compare it with margin_points.
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
