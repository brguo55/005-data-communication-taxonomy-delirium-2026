-- 15 Train a logistic regression in BigQuery ML on the 2008-2016 stays.
-- Status: first run on 2026-11-26 with max_iterations = 50. Dummy encoding was accepted, but training stopped at the
--   50-iteration cap with a loss of 0.37225, still falling about 0.01% per iteration, so the cap is now 200. Rerun pending.
-- No class weighting on purpose: weighting distorts the predicted risks, and the test page shows those risks.
-- Dummy encoding drops one category of each text variable, so 19 reports odds ratios against that reference
--   (the default one-hot encoding keeps every category, and its weights cannot be read as odds ratios).
--   If BigQuery rejects category_encoding_method, delete that line and keep the error message.
-- The defaults stop after 20 iterations or once the loss improves by less than 1%, which can leave the risks
--   short of convergence. The second statement lists the loss per iteration: it should level off before the last one.
CREATE OR REPLACE MODEL `physionet-data-513915.delirium.lr_24h`
OPTIONS (
  model_type = 'logistic_reg',
  input_label_cols = ['delirium_48h'],
  data_split_method = 'NO_SPLIT',
  category_encoding_method = 'DUMMY_ENCODING',
  max_iterations = 200,
  min_rel_progress = 0.0001
) AS
SELECT delirium_48h, age, gender, admission_group, first_careunit,
       dementia, ventilated_24h, benzo_24h, sedative_24h, opioid_24h
FROM `physionet-data-513915.delirium.model_data`
WHERE split = 'train';

SELECT iteration, ROUND(loss, 5) AS loss, duration_ms
FROM ML.TRAINING_INFO(MODEL `physionet-data-513915.delirium.lr_24h`)
ORDER BY iteration;
