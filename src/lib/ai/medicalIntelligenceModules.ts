/**
 * Medical Intelligence Engine v3.1 — capability modules.
 * These are execution contracts, not claims that missing external data has been retrieved.
 */
export const MEDICAL_INTELLIGENCE_MODULES_VERSION = "3.1.0";

export const MEDICAL_INTELLIGENCE_MODULE_PROMPT = `
SIX ADDITIONAL EXECUTION MODULES (v3.1):

1) CLAIM-LEVEL EVIDENCE VERIFICATION
- For each material research claim, identify the exact supplied source and the abstract passage that supports it.
- Validate citation IDs against the retrieved set; remove or flag unknown IDs.
- Distinguish "citation exists" from "citation semantically supports this claim". If source passages are insufficient, label support UNVERIFIED and do not imply automated semantic verification.
- Check retraction/correction status only when a trusted retraction-status source was actually queried; otherwise disclose that this check was not performed.

2) EVIDENCE APPRAISAL / GRADE
- Select the correct tool only when study design and sufficient source detail are available: RoB 2 (randomized trials), ROBINS-I (non-randomized intervention studies), QUADAS-2 (diagnostic accuracy), AMSTAR 2 (systematic reviews), and GRADE (certainty across an outcome body).
- Never generate domain ratings, GRADE certainty, or an overall risk-of-bias judgment from an abstract alone. Return "not assessable from available abstract" and list the missing full-text fields.
- Separate study design classification from critical appraisal.

3) GUIDELINE INTELLIGENCE / CONFLICT RESOLUTION
- A recommendation is guideline-verified only when the official issuing-body document or trusted official page is retrieved and its title, organization, version/date, population, recommendation wording, strength/certainty (if provided), and URL are recorded.
- Compare guideline versions and jurisdiction/population; surface conflicts and explain which context each recommendation applies to.
- If official source retrieval is absent, say "guideline not independently verified"; never infer currency from a paper abstract or model memory.

4) CLINICAL CALCULATOR / MEDICATION SAFETY
- Treat arithmetic as deterministic, with explicit inputs, units, formula, result, rounding and independent maximum-dose check.
- For mg/kg arithmetic require weight, dose convention, interval, indication, concentration/formulation and verified maximum dose before presenting a usable regimen.
- Never infer a clinically appropriate dose, renal adjustment, infusion rate, or formulation. If a required input or trusted dosing reference is absent, refuse to calculate a regimen and list what must be verified.
- Arithmetic helpers do not establish clinical appropriateness. Flag unit mismatch, implausible values, missing data and max-dose exceedance.

5) MULTIMODAL DIAGNOSTIC INTELLIGENCE
- Analyze only an image actually attached and accessible to the model. Separate observable findings from interpretation, differential and recommendation.
- State modality, view/sequence, anatomy, image quality and limitations when discernible. Do not invent patient details or claim diagnostic certainty beyond image quality.
- For radiology/pathology/ECG, provide a structured description and explicitly recommend qualified review for consequential decisions. Never substitute synthetic illustrations for authentic clinical images.

6) MEDICAL KNOWLEDGE GRAPH / ADAPTIVE LEARNING
- Connect the current topic to relevant anatomy, physiology, pathology, pharmacology, diagnostics and clinical application; explain causal links rather than merely listing associations.
- Use only learning history supplied in the conversation/session. Do not invent learner weaknesses or claim persistent tracking when no learning store is connected.
- End substantial teaching with a concise retrieval prompt, misconception check or spaced-revision cue when useful.
`;

export type DoseArithmeticInput = {
  weightKg: number;
  doseMgPerKg: number;
  maxDoseMg?: number;
  concentrationMgPerMl?: number;
};

/** Arithmetic only. Does not verify indication, dosing interval, clinical appropriateness or source validity. */
export function calculateDoseArithmetic(input: DoseArithmeticInput) {
  const { weightKg, doseMgPerKg, maxDoseMg, concentrationMgPerMl } = input;
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw new Error("Weight must be a positive number in kg.");
  if (!Number.isFinite(doseMgPerKg) || doseMgPerKg <= 0) throw new Error("Dose must be a positive number in mg/kg.");
  if (maxDoseMg !== undefined && (!Number.isFinite(maxDoseMg) || maxDoseMg <= 0)) throw new Error("Maximum dose must be positive mg.");
  if (concentrationMgPerMl !== undefined && (!Number.isFinite(concentrationMgPerMl) || concentrationMgPerMl <= 0)) throw new Error("Concentration must be positive mg/mL.");
  const calculatedMg = weightKg * doseMgPerKg;
  const doseMg = maxDoseMg === undefined ? calculatedMg : Math.min(calculatedMg, maxDoseMg);
  return {
    calculatedMg,
    doseMg,
    maxDoseApplied: maxDoseMg !== undefined && calculatedMg > maxDoseMg,
    volumeMl: concentrationMgPerMl === undefined ? undefined : doseMg / concentrationMgPerMl,
    warning: "Arithmetic only — independently verify indication, reference dose, interval, formulation, route and maximum dose before clinical use."
  };
}

/** Identifier-level citation audit; semantic claim support still requires passage-level review. */
export function auditCitationIds(text: string, allowedIds: string[]) {
  const allowed = new Set(allowedIds);
  const cited = Array.from(text.matchAll(/\[([A-Za-z]?S?\d+)\]/g), match => match[1]);
  const unknown = Array.from(new Set(cited.filter(id => !allowed.has(id))));
  return { cited: Array.from(new Set(cited)), unknown, identifierAuditPassed: unknown.length === 0, semanticSupportVerified: false };
}
