# Medical Intelligence — production architecture and rollout

## 1. Shared core, application adapters
Keep one canonical Medical Intelligence contract (versioned prompt modules, task taxonomy, evidence labels, output schemas, evaluation fixtures and safety rules). MedEvidence and Clinical Aid currently mirror the same v3.1 module contract in their own repositories; treat the documented contract as canonical and require parity review whenever either copy changes. A future shared private package can remove drift once both deployment pipelines can consume a versioned package reliably. Do not introduce a cross-repository runtime dependency until package publishing and rollback are tested.

Application adapters should own only provider-specific transport, retrieval connectors, authentication, persistence and UI. They must not fork evidence policy or clinical safety rules.

## 2. Dynamic prompt assembly
Do not attach the full master prompt to every request. Compose a small stable system core plus only the modules needed for the classified task (MCQ, research appraisal, guideline, medication calculation, multimodal interpretation, etc.). The current release gates the v3.1 module bundle behind Medical Intelligence mode; task-level selective assembly is the next optimization. Keep a prompt version and module manifest in logs/metadata without storing API keys or sensitive patient content.

## 3. Separate academic and clinical-safety policies
Use two explicit execution profiles:
- Academic learning: explanation, exam reasoning, mechanism, differential concepts and research synthesis.
- Clinical safety: uncertainty, escalation, local protocol checks, verified guideline provenance, medication guardrails and explicit limits.

The academic profile must never bypass clinical safety rules. A clinical scenario should activate both profiles, with safety constraints taking precedence. Neither mode should generate a patient-specific order without the necessary verified inputs and source context.

## 4. Evidence pipeline contracts
Represent each retrieved source as immutable metadata plus the retrieved passage/abstract and retrieval timestamp. Keep separate states for:
- retrieved source;
- citation identifier valid;
- claim-to-passage semantic support verified;
- full-text appraisal complete;
- official guideline verified;
- retraction/correction status checked.

Never collapse these into a single "verified" boolean. Abstract-only retrieval cannot support full-text risk-of-bias ratings or formal GRADE certainty.

## 5. Deterministic clinical computation
Keep arithmetic in pure, tested functions with explicit units and typed inputs. Separate calculation from clinical validation. Require reference provenance, indication, route, interval, formulation/concentration and maximum dose before any medication regimen is presented. Add independent test vectors, unit conversion tests, boundary tests and maximum-dose tests before enabling a calculator UI.

## 6. Multimodal data contract
Only run image interpretation when an actual image payload is present and accessible. Preserve image provenance, modality/view, upload timestamp and quality limitations. The model must distinguish observations, interpretation, differential and uncertainty. Do not present generated teaching illustrations as authentic patient studies.

## 7. Evaluation and release gates
Build a de-identified, version-controlled evaluation set covering:
- single-best-answer MCQs and distractor analysis;
- core mechanisms and cross-system links;
- evidence synthesis with conflicting abstracts and unsupported citations;
- guideline-version conflict and stale-source scenarios;
- dose arithmetic, unit mismatch and maximum-dose boundaries;
- radiology/pathology/ECG observations versus inference;
- uncertainty, referral and emergency-safety triggers;
- Nepal/South Asian applicability and explicit unknowns.

Score answer correctness, citation-ID precision, semantic citation support, retrieval relevance, guideline provenance, calculation correctness, safety violations, calibration/uncertainty, latency and cost. Add hard release blockers for fabricated citations, unsafe medication arithmetic, invented guideline currency and critical safety omissions. Human medical review is required for high-risk evaluation cases.

## 8. Observability and privacy
Log request ID, app/version, prompt version, module manifest, provider/model, retrieval connector, source IDs, timings, token/cost estimates, validation outcomes and error category. Avoid logging API keys, raw patient identifiers or unnecessary clinical text. Use consented feedback and access-controlled retention.

## 9. Rollout sequence
1. Land the current mode and v3.1 capability contracts behind the existing Medical Intelligence selector.
2. Pass CI and application smoke tests; deploy preview only.
3. Validate the evaluation set and have a qualified medical reviewer audit high-risk outputs.
4. Add trusted full-text, official-guideline and retraction-status connectors before enabling corresponding verification claims.
5. Add a passage-level citation verifier and selective module assembly.
6. Release gradually with feature flags, monitoring and rollback capability.

## Current implementation boundary
The v3.1 prompts and helper contracts are integrated in this application. The current evidence pipeline remains abstract-based. The medication helper performs arithmetic only. Official guideline ingestion, retraction lookup, full-text appraisal, multimodal image transport and persistent learner analytics require separate trusted connectors or application features; this release does not claim those systems are already operational.
