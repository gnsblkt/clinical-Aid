# Medical Intelligence Engine v3.1 — six capability modules

This release composes six additional execution contracts into Medical Intelligence mode:

1. Claim-level evidence verification: identifier audit is deterministic; semantic claim-to-passage support remains explicitly unverified unless a passage-level verifier is run.
2. Evidence appraisal and GRADE: RoB 2, ROBINS-I, QUADAS-2, AMSTAR 2 and GRADE are selected by design and only applied when the required full-text details exist.
3. Guideline intelligence: recommendations are called verified only after retrieving and recording an official issuing-body source and its version/date and population.
4. Clinical calculator and medication safety: a deterministic arithmetic helper validates units and optional maximum-dose caps. It does not validate indication, dose appropriateness, interval, route or formulation.
5. Multimodal diagnostic intelligence: image interpretation is limited to images actually attached and accessible; observable findings are separated from inference and uncertainty.
6. Medical knowledge graph and adaptive learning: causal cross-subject connections and session-grounded revision cues; persistent learner tracking requires a connected learning store.

## Current integration boundary

The six modules are injected into the Medical Intelligence system instructions in MedEvidence and Clinical Aid. The MedEvidence citation identifier audit uses the shared deterministic helper. Dose arithmetic is exported as a reusable helper but is not a prescribing workflow. The current abstract retrieval pipelines do not provide full-text appraisal, official guideline ingestion, retraction-status lookup, or semantic claim-to-source verification. Those capabilities must remain visibly unavailable until their respective trusted data sources and services are integrated.

Existing modes, provider settings and evidence retrieval behavior are preserved. No production deployment or clinical validation is implied by this integration.
