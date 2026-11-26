-- 15 Train a logistic regression in BigQuery ML on the 2008-2016 stays.
-- Status: not run yet. If the BigQuery sandbox refuses CREATE MODEL, keep the error message.
-- No class weighting on purpose: weighting distorts the predicted risks, and the test page shows those risks.
CREATE OR REPLACE MODEL `physionet-data-513915.delirium.lr_24h`
OPTIONS (
  model_type = 'logistic_reg',
  input_label_cols = ['delirium_48h'],
  data_split_method = 'NO_SPLIT'
) AS
SELECT delirium_48h, age, gender, admission_group, first_careunit,
       dementia, ventilated_24h, benzo_24h, sedative_24h, opioid_24h
FROM `physionet-data-513915.delirium.model_data`
WHERE split = 'train';
