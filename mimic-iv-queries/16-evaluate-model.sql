-- 16 AUROC and log loss on the training and test years.
-- Status: not run yet. Ignore the threshold metrics (0.5 cutoff); with 15% delirium they say little.
SELECT 'train' AS data, roc_auc, log_loss
FROM ML.EVALUATE(MODEL `physionet-data-513915.delirium.lr_24h`,
  (SELECT * EXCEPT (stay_id, split, language_group, race_group, insurance)
   FROM `physionet-data-513915.delirium.model_data` WHERE split = 'train'))
UNION ALL
SELECT 'test', roc_auc, log_loss
FROM ML.EVALUATE(MODEL `physionet-data-513915.delirium.lr_24h`,
  (SELECT * EXCEPT (stay_id, split, language_group, race_group, insurance)
   FROM `physionet-data-513915.delirium.model_data` WHERE split = 'test'));
