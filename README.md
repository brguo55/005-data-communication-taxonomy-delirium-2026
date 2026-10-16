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
- REDCap data dictionary for the clinician test: `taxonomy-decision-lab-redcap-dictionary.csv`
- `index.html` only forwards the site root to `taxonomy.html`; `.nojekyll` tells GitHub Pages to publish the files as they are

On the Decision lab page, figures attributed to a study come from the delirium cases in the paper. All other values are illustrative, and the what-if index is a teaching device, not a clinical score.

## Running the clinician test

The test on the Decision lab page shows six illustrative patient cases. Each case uses either a score-only display or a display built from the taxonomy, and participants estimate the chance of delirium, choose a next step, and rate their confidence.

- Send each participant one link, alternating between them: `taxonomy-decision-lab.html?group=1#test` and `taxonomy-decision-lab.html?group=2#test`. The groups see the two displays on opposite cases, so every case is seen both ways.
- Answers stay in the participant's browser. At the end they download a CSV with one row per case and send it to the research team, or, once REDCap is connected (see below), send them straight to the project's survey. Codes in the CSV are always English, and a `language` column records whether the participant used the English or Chinese page; add `&lang=zh` to a group link to open the test in Chinese.
- Pilot with a few clinicians first, and check whether your institution's review board needs to approve the study.

## Collecting answers with REDCap

The clinician test can hand each participant's answers to a REDCap survey, so they reach the research team without anyone emailing files. Nothing leaves the participant's browser until they press "Send to the research team" and then Submit in REDCap.

1. Ask your institution's REDCap administrators (at Dell Med, the research office) for a project, and confirm whether the study needs IRB review.
2. In the project, open Designer, then Data Dictionary, and upload `taxonomy-decision-lab-redcap-dictionary.csv`. It creates one instrument, `decision_lab_answers`, with 58 fields.
3. In Project Setup, enable surveys, enable the instrument as a survey, and keep record auto-numbering on.
4. Open Survey Distribution Tools and copy the public survey link.
5. Paste the link into `REDCAP.surveyUrl` near the top of the clinician test part of `taxonomy-decision-lab.js`, then commit and push. The results screen now shows "Send to the research team" above the CSV download.
6. Take the test once with a made-up participant code, submit the survey, and check that the new record has every field filled in. Delete the test record afterwards.

Notes:

- The page fills in the survey through the link, using the dictionary's variable names and numeric codes. The values are answers, codes and times, with no names or patient information, but they do appear in the link. If the REDCap administrators prefer, set `REDCAP.method` to `'post'` so the values are sent as a form instead; check with them that your REDCap version accepts pre-filled values that way.
- Fields the page fills in are hidden on the survey page (`@HIDDEN-SURVEY`), so participants see only an introduction, their participant code, an optional comment, and an agreement to send. Adjust that wording to whatever the IRB approves, including any consent text.
- Never put a REDCap API token in the page. The site is public, so anyone could read it.
- If you change the test (cases, questions or codes), change the data dictionary and `redcapFields()` in `taxonomy-decision-lab.js` together.

## Viewing

The pages are static HTML with no build step. Open `taxonomy.html` in a browser, or serve the folder with any static file server.

Readers can switch between the light and dark themes with the button at the top right of every page. The choice is remembered in their browser; until they make one, the pages follow the system setting.

Every page is also available in Chinese: the 中文 / EN button next to it switches languages instantly, the choice is remembered, and links can open a page in either language with `?lang=zh` or `?lang=en`. In the markup, each text appears twice as sibling `data-l="en"` and `data-l="zh"` spans, and the stylesheet shows the one that matches `<html lang>`. Text written by scripts comes in English and Chinese pairs. The formatted citation, BibTeX, PubMed search terms, and the two figure images stay in English.
