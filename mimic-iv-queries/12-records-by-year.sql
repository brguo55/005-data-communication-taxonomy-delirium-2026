-- 12 Share of first ICU stays with any medication (inputevents) or procedure (procedureevents) record, by year group.
-- Status: run in November 2026. Result: about 97% in 2008-2019, but only 42% in 2020-2022.
-- So 2020-2022 is left out of the main analysis: a missing record would be read as "no treatment".
WITH ie AS (SELECT DISTINCT stay_id FROM `physionet-data.mimiciv_3_1_icu.inputevents`),
pe AS (SELECT DISTINCT stay_id FROM `physionet-data.mimiciv_3_1_icu.procedureevents`)
SELECT c.anchor_year_group, COUNT(*) AS n_stays,
       ROUND(100 * COUNTIF(ie.stay_id IS NOT NULL) / COUNT(*), 1) AS pct_any_inputevents,
       ROUND(100 * COUNTIF(pe.stay_id IS NOT NULL) / COUNT(*), 1) AS pct_any_procedureevents
FROM `physionet-data-513915.delirium.icu_cohort` AS c
LEFT JOIN ie ON ie.stay_id = c.stay_id
LEFT JOIN pe ON pe.stay_id = c.stay_id
GROUP BY c.anchor_year_group
ORDER BY c.anchor_year_group;
