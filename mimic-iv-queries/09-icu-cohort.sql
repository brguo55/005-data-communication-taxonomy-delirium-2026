-- 09 Build the ICU cohort table in your own project (change physionet-data-513915 if you use another project).
-- Design: each adult patient's first ICU stay lasting at least 24 h; prediction time t0 = ICU admission + 24 h;
--   outcome = a positive CAM-ICU summary (itemid 228332) from t0 to t0 + 48 h; variables use data before t0.
-- Status: run in November 2026 (table delirium.icu_cohort). Sandbox tables expire after 60 days, so rerun this when it is gone.
-- Limitation: dementia comes from diagnosis codes of the same hospitalization, assigned at discharge.
CREATE SCHEMA IF NOT EXISTS `physionet-data-513915.delirium`
OPTIONS (location = 'US');

CREATE OR REPLACE TABLE `physionet-data-513915.delirium.icu_cohort` AS
WITH stays AS (
  SELECT s.subject_id, s.hadm_id, s.stay_id, s.first_careunit, s.intime, s.outtime,
         DATETIME_ADD(s.intime, INTERVAL 24 HOUR) AS t0,
         a.admission_type, a.race, a.language, a.insurance,
         p.gender, p.anchor_year_group,
         p.anchor_age + EXTRACT(YEAR FROM s.intime) - p.anchor_year AS age,
         ROW_NUMBER() OVER (PARTITION BY s.subject_id ORDER BY s.intime) AS stay_order
  FROM `physionet-data.mimiciv_3_1_icu.icustays` AS s
  JOIN `physionet-data.mimiciv_3_1_hosp.admissions` AS a ON a.hadm_id = s.hadm_id
  JOIN `physionet-data.mimiciv_3_1_hosp.patients` AS p ON p.subject_id = s.subject_id
),
cohort AS (
  SELECT * FROM stays
  WHERE stay_order = 1 AND age >= 18 AND outtime > t0
),
cam AS (
  SELECT st.stay_id,
         LOGICAL_OR(ce.charttime < st.t0 AND ce.value = 'Positive') AS positive_first_24h,
         LOGICAL_OR(ce.charttime >= st.t0 AND ce.charttime < DATETIME_ADD(st.t0, INTERVAL 48 HOUR) AND ce.value = 'Positive') AS positive_next_48h,
         LOGICAL_OR(ce.charttime >= st.t0 AND ce.charttime < DATETIME_ADD(st.t0, INTERVAL 48 HOUR) AND ce.value = 'Negative') AS negative_next_48h
  FROM cohort AS st
  JOIN `physionet-data.mimiciv_3_1_icu.chartevents` AS ce ON ce.stay_id = st.stay_id
  WHERE ce.itemid = 228332
  GROUP BY st.stay_id
),
drugs AS (
  SELECT st.stay_id,
         LOGICAL_OR(REGEXP_CONTAINS(LOWER(di.label), r'midazolam|lorazepam|diazepam')) AS benzo_24h,
         LOGICAL_OR(REGEXP_CONTAINS(LOWER(di.label), r'propofol|dexmedetomidine')) AS sedative_24h,
         LOGICAL_OR(REGEXP_CONTAINS(LOWER(di.label), r'fentanyl|morphine|hydromorphone')) AS opioid_24h
  FROM cohort AS st
  JOIN `physionet-data.mimiciv_3_1_icu.inputevents` AS ie ON ie.stay_id = st.stay_id
  JOIN `physionet-data.mimiciv_3_1_icu.d_items` AS di ON di.itemid = ie.itemid
  WHERE ie.starttime < st.t0
  GROUP BY st.stay_id
),
vent AS (
  SELECT DISTINCT st.stay_id
  FROM cohort AS st
  JOIN `physionet-data.mimiciv_3_1_icu.procedureevents` AS pe ON pe.stay_id = st.stay_id
  JOIN `physionet-data.mimiciv_3_1_icu.d_items` AS di ON di.itemid = pe.itemid
  WHERE LOWER(di.label) = 'invasive ventilation' AND pe.starttime < st.t0
),
dementia AS (
  SELECT DISTINCT hadm_id
  FROM `physionet-data.mimiciv_3_1_hosp.diagnoses_icd`
  WHERE (icd_version = 10 AND (STARTS_WITH(icd_code, 'F01') OR STARTS_WITH(icd_code, 'F02')
                               OR STARTS_WITH(icd_code, 'F03') OR STARTS_WITH(icd_code, 'G30')))
     OR (icd_version = 9 AND (STARTS_WITH(icd_code, '290') OR STARTS_WITH(icd_code, '2941') OR icd_code = '3310')
                         AND icd_code NOT IN ('2903', '29011', '29041'))
)
SELECT st.subject_id, st.hadm_id, st.stay_id, st.anchor_year_group,
       st.age, st.gender, st.race, st.language, st.insurance, st.first_careunit,
       CASE
         WHEN st.admission_type IN ('EW EMER.', 'URGENT', 'DIRECT EMER.') THEN 'emergency'
         WHEN st.admission_type IN ('SURGICAL SAME DAY ADMISSION', 'ELECTIVE') THEN 'planned'
         ELSE 'observation'
       END AS admission_group,
       d.hadm_id IS NOT NULL AS dementia,
       v.stay_id IS NOT NULL AS ventilated_24h,
       COALESCE(dr.benzo_24h, FALSE) AS benzo_24h,
       COALESCE(dr.sedative_24h, FALSE) AS sedative_24h,
       COALESCE(dr.opioid_24h, FALSE) AS opioid_24h,
       COALESCE(c.positive_first_24h, FALSE) AS positive_first_24h,
       CASE
         WHEN COALESCE(c.positive_next_48h, FALSE) THEN 1
         WHEN COALESCE(c.negative_next_48h, FALSE) THEN 0
       END AS delirium_48h
FROM cohort AS st
LEFT JOIN cam AS c ON c.stay_id = st.stay_id
LEFT JOIN drugs AS dr ON dr.stay_id = st.stay_id
LEFT JOIN vent AS v ON v.stay_id = st.stay_id
LEFT JOIN dementia AS d ON d.hadm_id = st.hadm_id;
