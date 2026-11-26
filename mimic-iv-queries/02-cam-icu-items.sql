-- 02 Which ICU chart items record delirium, and which values they take (counts only).
-- Status: run in November 2026. Result: the CAM-ICU summary is itemid 228332 "Delirium assessment":
--   Negative 361,125; Positive 119,052; UTA (unable to assess) 130,455.
--   Component items come in three itemid generations: 228300-228303, 228334-228337, 229324-229326.
--   229325 also records "Language Barrier" (6,232) and "Preexisting Advanced Dementia" (2,449).
SELECT di.itemid, di.label, ce.value, COUNT(*) AS n_rows
FROM `physionet-data.mimiciv_3_1_icu.chartevents` AS ce
JOIN `physionet-data.mimiciv_3_1_icu.d_items` AS di ON di.itemid = ce.itemid
WHERE LOWER(di.label) LIKE '%cam-icu%' OR LOWER(di.label) LIKE '%delirium%'
GROUP BY di.itemid, di.label, ce.value
HAVING n_rows >= 10
ORDER BY di.itemid, n_rows DESC;
