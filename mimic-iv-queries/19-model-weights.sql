-- 19 Model coefficients as log odds and odds ratios (age is per year).
-- Text variables use dummy encoding (see 15): the category missing from the output is the reference,
--   and each listed category's odds ratio is against it.
-- Status: run on 2026-11-27. The first fit showed separation in the rarest ICU types, so 14 now merges types with fewer than
--   100 training stays into 'Other'. Refit odds ratios: ventilation 3.22, dementia 2.54, benzodiazepine 1.94, age 1.02 per
--   year, planned admission 0.55 (vs emergency), MICU 3.04 (vs CVICU), Other unit 9.15 (imprecise: few stays).
SELECT processed_input, CAST(NULL AS STRING) AS category,
       ROUND(weight, 3) AS log_odds, ROUND(EXP(weight), 2) AS odds_ratio
FROM ML.WEIGHTS(MODEL `physionet-data-513915.delirium.lr_24h`)
WHERE ARRAY_LENGTH(category_weights) = 0
UNION ALL
SELECT w.processed_input, cw.category, ROUND(cw.weight, 3), ROUND(EXP(cw.weight), 2)
FROM ML.WEIGHTS(MODEL `physionet-data-513915.delirium.lr_24h`) AS w, UNNEST(w.category_weights) AS cw
ORDER BY processed_input, category;
