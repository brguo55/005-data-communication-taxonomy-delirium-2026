-- 05 How many ICU stays have the CAM-ICU summary item, the component items, or both.
-- Status: run in November 2026. Result: both 70,569; summary only 2,375; components only 2,160 (2.9% of stays with CAM-ICU data).
-- So the summary item (228332) alone is enough. 19,354 ICU stays (20.5%) have no CAM-ICU record at all.
WITH s AS (
  SELECT stay_id,
         LOGICAL_OR(itemid = 228332) AS has_summary,
         LOGICAL_OR(itemid != 228332) AS has_components
  FROM `physionet-data.mimiciv_3_1_icu.chartevents`
  WHERE itemid IN (228300, 228301, 228302, 228303, 228332, 228334, 228335, 228336, 228337, 229324, 229325, 229326)
  GROUP BY stay_id
)
SELECT has_summary, has_components, COUNT(*) AS n_stays
FROM s
GROUP BY has_summary, has_components
ORDER BY n_stays DESC;
