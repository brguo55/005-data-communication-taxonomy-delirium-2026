-- 17 Calibration on the test years: predicted against observed delirium in ten risk groups.
-- Status: run on 2026-11-27. Predicted vs observed (%) by decile: 3.8/3.3, 5.4/4.7, 6.8/6.9, 8.3/8.2, 9.8/7.5,
--   11.4/13.8, 13.5/14.9, 17.0/14.9, 23.0/31.3, 40.5/51.4. Mean predicted 14.0% vs observed 15.7%: well calibrated
--   up to decile 8, underestimating the two highest-risk deciles.
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
