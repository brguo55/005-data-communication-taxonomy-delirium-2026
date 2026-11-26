-- 17 Calibration on the test years: predicted against observed delirium in ten risk groups.
-- Status: not run yet.
WITH p AS (
  SELECT delirium_48h,
         (SELECT prob FROM UNNEST(predicted_delirium_48h_probs) WHERE label = 1) AS risk
  FROM ML.PREDICT(MODEL `physionet-data-513915.delirium.lr_24h`,
    (SELECT * FROM `physionet-data-513915.delirium.model_data` WHERE split = 'test'))
),
d AS (SELECT *, NTILE(10) OVER (ORDER BY risk) AS decile FROM p)
SELECT decile, COUNT(*) AS n,
       ROUND(100 * AVG(risk), 1) AS predicted_pct,
       ROUND(100 * AVG(delirium_48h), 1) AS observed_pct
FROM d
GROUP BY decile
ORDER BY decile;
