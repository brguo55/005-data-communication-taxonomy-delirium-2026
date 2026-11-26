-- 18 Test-year performance by subgroup: observed and mean predicted delirium, and AUROC (Mann-Whitney, ties averaged).
-- Status: not run yet. The "All" AUROC should be close to the test AUROC in 16.
-- A subgroup whose predicted_pct sits well below observed_pct is underestimated: a candidate for the warned case.
-- Subgroups with few delirium cases (under about 30) give unstable AUROCs; report them with their counts.
WITH t AS (
  SELECT *,
         CASE WHEN age < 65 THEN 'Age 18-64' WHEN age < 80 THEN 'Age 65-79' ELSE 'Age 80+' END AS age_group
  FROM `physionet-data-513915.delirium.model_data`
  WHERE split = 'test'
),
p AS (
  SELECT age_group, dementia, language_group, race_group, insurance, admission_group, gender, delirium_48h,
         (SELECT prob FROM UNNEST(predicted_delirium_48h_probs) WHERE label = 1) AS risk
  FROM ML.PREDICT(MODEL `physionet-data-513915.delirium.lr_24h`, (SELECT * FROM t))
),
long AS (
  SELECT 'All' AS subgroup, delirium_48h, risk FROM p
  UNION ALL SELECT age_group, delirium_48h, risk FROM p
  UNION ALL SELECT IF(dementia = 1, 'Dementia', 'No dementia'), delirium_48h, risk FROM p
  UNION ALL SELECT CONCAT('Language: ', language_group), delirium_48h, risk FROM p
  UNION ALL SELECT CONCAT('Race: ', race_group), delirium_48h, risk FROM p
  UNION ALL SELECT CONCAT('Insurance: ', insurance), delirium_48h, risk FROM p
  UNION ALL SELECT CONCAT('Admission: ', admission_group), delirium_48h, risk FROM p
  UNION ALL SELECT CONCAT('Sex: ', gender), delirium_48h, risk FROM p
),
ranked AS (
  SELECT subgroup, delirium_48h, risk,
         RANK() OVER (PARTITION BY subgroup ORDER BY risk)
           + (COUNT(*) OVER (PARTITION BY subgroup, risk) - 1) / 2 AS avg_rank
  FROM long
)
SELECT subgroup,
       COUNT(*) AS n,
       COUNTIF(delirium_48h = 1) AS n_delirium,
       ROUND(100 * AVG(delirium_48h), 1) AS observed_pct,
       ROUND(100 * AVG(risk), 1) AS predicted_pct,
       ROUND(SAFE_DIVIDE(
         SUM(IF(delirium_48h = 1, avg_rank, 0)) - COUNTIF(delirium_48h = 1) * (COUNTIF(delirium_48h = 1) + 1) / 2,
         COUNTIF(delirium_48h = 1) * COUNTIF(delirium_48h = 0)), 3) AS auroc
FROM ranked
GROUP BY subgroup
ORDER BY subgroup;
