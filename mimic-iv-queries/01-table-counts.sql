-- 01 Check that the full MIMIC-IV v3.1 release is visible.
-- Status: run in November 2026. Result: patients 364,627; admissions 546,028; ICU stays 94,458 (matches PhysioNet).
-- Note: the unversioned datasets (mimiciv_hosp, mimiciv_icu) return Access Denied. Use mimiciv_3_1_*.
SELECT 'patients' AS table_name, COUNT(*) AS n FROM `physionet-data.mimiciv_3_1_hosp.patients`
UNION ALL SELECT 'admissions', COUNT(*) FROM `physionet-data.mimiciv_3_1_hosp.admissions`
UNION ALL SELECT 'icustays', COUNT(*) FROM `physionet-data.mimiciv_3_1_icu.icustays`;
