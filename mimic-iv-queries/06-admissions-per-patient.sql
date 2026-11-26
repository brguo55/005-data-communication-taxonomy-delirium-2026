-- 06 How many hospitalizations each patient has (10 or more grouped).
-- Status: run in November 2026. Result: 1 admission 55.2% of admitted patients; 2: 19.7%; 3: 9.0%; 4-9: 12.9%; 10+: 3.1%.
-- The 3.1% with 10+ admissions account for 21.5% of all hospitalizations, so the cohort keeps one ICU stay per patient.
SELECT LEAST(n_admissions, 10) AS admissions, COUNT(*) AS n_patients
FROM (
  SELECT subject_id, COUNT(*) AS n_admissions
  FROM `physionet-data.mimiciv_3_1_hosp.admissions`
  GROUP BY subject_id
)
GROUP BY admissions
ORDER BY admissions;
