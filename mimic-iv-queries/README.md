# MIMIC-IV queries

BigQuery SQL used to move the Decision lab's clinician test from illustrative numbers to MIMIC-IV v3.1 results. The files hold queries only, plus `delirium-model-notes.tex`, a LaTeX note (for Overleaf) on the logistic regression that queries 14-19 fit, with tables to fill in as they run. No MIMIC-IV data, patient-level results, or credentials belong in this repository, which is public.

- Run the files in number order in the BigQuery console. Each file starts with a comment that says what it does, whether it has been run, and the aggregate result.
- MIMIC-IV access needs a credentialed PhysioNet account, the signed MIMIC-IV data use agreement, and BigQuery access requested from the MIMIC-IV project page. Query the versioned datasets `physionet-data.mimiciv_3_1_hosp` and `physionet-data.mimiciv_3_1_icu`.
- Files 09 onward write tables to the `delirium` dataset in the project `physionet-data-513915`. Replace that project ID to run them elsewhere. In the BigQuery sandbox these tables expire after 60 days.
- Do not run these queries through an AI assistant or paste patient-level rows into one, including the assistant built into BigQuery. PhysioNet restricts sending the data to online services.

| Files | Stage |
| --- | --- |
| 01-08 | Check the release, how delirium is recorded, and how hospital and ICU stays relate |
| 09-13 | Build and check the ICU cohort |
| 14-19 | Train and evaluate a logistic regression (train 2008-2016, test 2017-2019) |
| 20-22 | Find groups of similar test-year stays to write the clinician test's composite cases from, and their most common diagnoses |
