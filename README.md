# 005-data-communication-taxonomy-delirium-2026

Project pages for *A Taxonomy of Issues in Healthcare Data-Driven Communication for Clinical Decision-Making* (Guo, Zhou, Fu & Fu; manuscript in preparation, 2026).

## Pages

| File | Page | What it shows |
| --- | --- | --- |
| `taxonomy.html` | Taxonomy | The eight dimensions, each linked to a clinical decision-making risk and an intervention opportunity |
| `taxonomy-delirium.html` | Delirium case | Three published delirium prediction models read through the taxonomy |
| `taxonomy-decision-lab.html` | Decision lab | A clinician test comparing a score-only delirium risk display with one built from the taxonomy, then a drag-and-drop pathway builder, a base-rate explorer, sample size and calibration drift demos, and a what-if attention slider |
| `taxonomy-publication.html` | Publication | Abstract, methods, figures, and citation |

- Shared by all pages: `taxonomy-shared.css`, `taxonomy-shared.js`
- Decision lab page only: `taxonomy-decision-lab.css`, `taxonomy-decision-lab.js`
- Figures: `taxonomy-figure1-prisma-flow.svg`, `taxonomy-figure2-classification.svg`
- `index.html` only forwards the site root to `taxonomy.html`; `.nojekyll` tells GitHub Pages to publish the files as they are

On the Decision lab page, figures attributed to a study come from the delirium cases in the paper. All other values are illustrative, and the what-if index is a teaching device, not a clinical score.

## Running the clinician test

The test on the Decision lab page shows six illustrative patient cases. Each case uses either a score-only display or a display built from the taxonomy, and participants estimate the chance of delirium, choose a next step, and rate their confidence.

- Send each participant one link, alternating between them: `taxonomy-decision-lab.html?group=1#test` and `taxonomy-decision-lab.html?group=2#test`. The groups see the two displays on opposite cases, so every case is seen both ways.
- Answers stay in the participant's browser. At the end they download a CSV with one row per case and send it to the research team.
- Pilot with a few clinicians first, and check whether your institution's review board needs to approve the study.

## Viewing

The pages are static HTML with no build step. Open `taxonomy.html` in a browser, or serve the folder with any static file server.
