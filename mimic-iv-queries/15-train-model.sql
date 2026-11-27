-- 15 Train a logistic regression in BigQuery ML on the 2008-2016 stays.
-- Status: run on 2026-11-26 and 2026-11-27. Statement 1 stopped at BigQuery's 50-iteration cap with a loss of 0.37225.
--   Statement 2 (warm start) then ran 2 iterations and stopped early: loss 0.37224, changing by less than 0.00001.
--   The fit is converged: 52 iterations in all.
-- BigQuery allows at most 50 iterations per run ("max_iterations must be less than 50 in one training run"), so
--   statement 2 continues from the saved model. Run statement 2 again while the model's "Actual iterations" is 50;
--   a smaller number means early stopping ended the run.
-- No class weighting on purpose: weighting distorts the predicted risks, and the test page shows those risks.
-- Dummy encoding drops one category of each text variable, so 19 reports odds ratios against that reference
--   (the default one-hot encoding keeps every category, and its weights cannot be read as odds ratios).
-- The defaults stop after 20 iterations or once the loss improves by less than 1%, which can leave the risks
--   short of convergence, hence max_iterations and min_rel_progress below.

-- Statement 1: first run.
CREATE OR REPLACE MODEL `physionet-data-513915.delirium.lr_24h`
OPTIONS (
  model_type = 'logistic_reg',
  input_label_cols = ['delirium_48h'],
  data_split_method = 'NO_SPLIT',
  category_encoding_method = 'DUMMY_ENCODING',
  max_iterations = 50,
  min_rel_progress = 0.0001
) AS
SELECT delirium_48h, age, gender, admission_group, first_careunit,
       dementia, ventilated_24h, benzo_24h, sedative_24h, opioid_24h
FROM `physionet-data-513915.delirium.model_data`
WHERE split = 'train';

-- Statement 2: continue training from the saved model (warm start), with the same data and options.
CREATE OR REPLACE MODEL `physionet-data-513915.delirium.lr_24h`
OPTIONS (
  model_type = 'logistic_reg',
  input_label_cols = ['delirium_48h'],
  data_split_method = 'NO_SPLIT',
  category_encoding_method = 'DUMMY_ENCODING',
  max_iterations = 50,
  min_rel_progress = 0.0001,
  warm_start = TRUE
) AS
SELECT delirium_48h, age, gender, admission_group, first_careunit,
       dementia, ventilated_24h, benzo_24h, sedative_24h, opioid_24h
FROM `physionet-data-513915.delirium.model_data`
WHERE split = 'train';

-- Statement 3: the last iterations, newest first. training_run 0 is statement 1, 1 is the first warm start, and so on.
SELECT training_run, iteration, ROUND(loss, 5) AS loss
FROM ML.TRAINING_INFO(MODEL `physionet-data-513915.delirium.lr_24h`)
ORDER BY training_run DESC, iteration DESC
LIMIT 10;
