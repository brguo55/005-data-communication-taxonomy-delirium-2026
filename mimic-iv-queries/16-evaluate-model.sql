-- 16 AUROC and log loss on the training and test years.
-- Status: run on 2026-11-27. AUROC 0.739 (train) and 0.764 (test); log loss 0.3722 and 0.3730.
-- Ignore the threshold metrics (0.5 cutoff); with 15% delirium they say little.
SELECT 'train' AS data, roc_auc, log_loss
FROM ML.EVALUATE(MODEL `physionet-data-513915.delirium.lr_24h`,
  (SELECT * EXCEPT (stay_id, split, language_group, race_group, insurance)
   FROM `physionet-data-513915.delirium.model_data` WHERE split = 'train'))
UNION ALL
SELECT 'test', roc_auc, log_loss
FROM ML.EVALUATE(MODEL `physionet-data-513915.delirium.lr_24h`,
  (SELECT * EXCEPT (stay_id, split, language_group, race_group, insurance)
   FROM `physionet-data-513915.delirium.model_data` WHERE split = 'test'));
