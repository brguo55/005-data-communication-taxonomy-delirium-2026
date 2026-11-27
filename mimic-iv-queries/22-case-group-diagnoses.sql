-- 22 The most common principal diagnoses in each of the eight case groups (test years, 2017-2019), to replace the
--   [admitting problem] placeholders in the case drafts with something typical of the group.
-- Status: not run yet. Statement 1 checks the group sizes against 20 and 21: 104, 127, 93, 73, 206, 55, 50, 68.
-- Statement 2 lists up to five diagnoses per group, counts only, and leaves out any diagnosis with fewer than 5 stays.
--   Keep the counts out of the public repository; the case text needs only the diagnosis names.
-- The principal diagnosis (seq_num = 1) is coded at discharge, so it describes the hospitalization, not only the
--   first ICU day; treat it as a guide to what is typical, not as what was known 24 hours after ICU admission.

-- Statement 1: group sizes.
WITH g AS (
  SELECT stay_id,
    CASE
      WHEN age BETWEEN 65 AND 79 AND admission_group = 'emergency' AND first_careunit = 'Medical Intensive Care Unit (MICU)'
           AND dementia = 0 AND ventilated_24h = 0 AND benzo_24h = 0 THEN 1
      WHEN age BETWEEN 65 AND 79 AND admission_group = 'emergency' AND first_careunit = 'Coronary Care Unit (CCU)'
           AND dementia = 0 AND ventilated_24h = 0 AND benzo_24h = 0 THEN 2
      WHEN age >= 80 AND admission_group = 'observation' AND first_careunit = 'Neuro Intermediate'
           AND dementia = 0 AND ventilated_24h = 0 AND benzo_24h = 0 THEN 3
      WHEN age < 80 AND dementia = 1 THEN 4
      WHEN age BETWEEN 65 AND 79 AND admission_group = 'planned' AND first_careunit = 'Cardiac Vascular Intensive Care Unit (CVICU)'
           AND dementia = 0 AND ventilated_24h = 1 AND benzo_24h = 0 THEN 5
      WHEN age >= 80 AND admission_group = 'emergency' AND first_careunit = 'Medical Intensive Care Unit (MICU)'
           AND dementia = 0 AND ventilated_24h = 0 AND benzo_24h = 0 THEN 6
      WHEN age < 65 AND admission_group = 'emergency' AND first_careunit = 'Medical Intensive Care Unit (MICU)'
           AND dementia = 0 AND ventilated_24h = 1 AND benzo_24h = 0 THEN 7
      WHEN age BETWEEN 65 AND 79 AND admission_group = 'observation' AND first_careunit = 'Cardiac Vascular Intensive Care Unit (CVICU)'
           AND dementia = 0 AND ventilated_24h = 1 AND benzo_24h = 0 THEN 8
    END AS case_no
  FROM `physionet-data-513915.delirium.model_data`
  WHERE split = 'test'
)
SELECT case_no, COUNT(*) AS n_stays
FROM g
WHERE case_no IS NOT NULL
GROUP BY case_no
ORDER BY case_no;

-- Statement 2: up to five principal diagnoses per group.
WITH g AS (
  SELECT stay_id,
    CASE
      WHEN age BETWEEN 65 AND 79 AND admission_group = 'emergency' AND first_careunit = 'Medical Intensive Care Unit (MICU)'
           AND dementia = 0 AND ventilated_24h = 0 AND benzo_24h = 0 THEN 1
      WHEN age BETWEEN 65 AND 79 AND admission_group = 'emergency' AND first_careunit = 'Coronary Care Unit (CCU)'
           AND dementia = 0 AND ventilated_24h = 0 AND benzo_24h = 0 THEN 2
      WHEN age >= 80 AND admission_group = 'observation' AND first_careunit = 'Neuro Intermediate'
           AND dementia = 0 AND ventilated_24h = 0 AND benzo_24h = 0 THEN 3
      WHEN age < 80 AND dementia = 1 THEN 4
      WHEN age BETWEEN 65 AND 79 AND admission_group = 'planned' AND first_careunit = 'Cardiac Vascular Intensive Care Unit (CVICU)'
           AND dementia = 0 AND ventilated_24h = 1 AND benzo_24h = 0 THEN 5
      WHEN age >= 80 AND admission_group = 'emergency' AND first_careunit = 'Medical Intensive Care Unit (MICU)'
           AND dementia = 0 AND ventilated_24h = 0 AND benzo_24h = 0 THEN 6
      WHEN age < 65 AND admission_group = 'emergency' AND first_careunit = 'Medical Intensive Care Unit (MICU)'
           AND dementia = 0 AND ventilated_24h = 1 AND benzo_24h = 0 THEN 7
      WHEN age BETWEEN 65 AND 79 AND admission_group = 'observation' AND first_careunit = 'Cardiac Vascular Intensive Care Unit (CVICU)'
           AND dementia = 0 AND ventilated_24h = 1 AND benzo_24h = 0 THEN 8
    END AS case_no
  FROM `physionet-data-513915.delirium.model_data`
  WHERE split = 'test'
),
dx AS (
  SELECT g.case_no, d.long_title, COUNT(*) AS n_stays
  FROM g
  JOIN `physionet-data.mimiciv_3_1_icu.icustays` AS s ON s.stay_id = g.stay_id
  JOIN `physionet-data.mimiciv_3_1_hosp.diagnoses_icd` AS dg ON dg.hadm_id = s.hadm_id AND dg.seq_num = 1
  JOIN `physionet-data.mimiciv_3_1_hosp.d_icd_diagnoses` AS d ON d.icd_code = dg.icd_code AND d.icd_version = dg.icd_version
  WHERE g.case_no IS NOT NULL
  GROUP BY g.case_no, d.long_title
)
SELECT case_no, diagnosis_rank, long_title, n_stays
FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY case_no ORDER BY n_stays DESC, long_title) AS diagnosis_rank
  FROM dx
)
WHERE diagnosis_rank <= 5 AND n_stays >= 5
ORDER BY case_no, diagnosis_rank;
