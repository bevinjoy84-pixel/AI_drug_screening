/**
 * PharmaScreen AI - Gemini AI Service
 * Provides AI-assisted explanations of molecular properties, screening results, and medicinal chemistry context.
 * Securely communicates through backend only. Falls back gracefully to heuristic chemistry engine when API key is unset.
 */

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];

/**
 * Call Google Gemini API securely from backend
 */
async function callGeminiApi(prompt, apiKey) {
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1200
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[GeminiService] Model ${model} returned HTTP ${response.status}: ${errorText.substring(0, 150)}`);
        continue; // Try next fallback model
      }

      const data = await response.json();
      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]
      ) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      console.warn(`[GeminiService] Network error with ${model}:`, err.message);
    }
  }

  throw new Error('Gemini API call failed across available endpoints');
}

/**
 * Generate comprehensive medicinal chemistry explanation for a screened compound
 */
async function generateCompoundExplanation({
  name,
  smiles,
  formula,
  molecularWeight,
  logP,
  hbd,
  hba,
  tpsa,
  rotatableBonds,
  classification,
  violations,
  ruleBreakdown,
  source
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  const violationList = [];
  if (violations.mw) violationList.push(`Molecular Weight (${molecularWeight} Da > 500 Da)`);
  if (violations.logP) violationList.push(`LogP (${logP} > 5.0)`);
  if (violations.hbd) violationList.push(`H-Bond Donors (${hbd} > 5)`);
  if (violations.hba) violationList.push(`H-Bond Acceptors (${hba} > 10)`);
  if (violations.veberRotB) violationList.push(`Veber Rotatable Bonds (${rotatableBonds} > 10)`);
  if (violations.veberTPSA) violationList.push(`Veber TPSA (${tpsa} Å² > 140 Å²)`);

  const prompt = `
You are a senior medicinal chemist and computational cheminformatics expert explaining a drug candidate screening report.
Analyze the following molecule objectively:

Compound Name: ${name || 'Screened Molecule'}
SMILES: ${smiles}
Chemical Formula: ${formula || 'N/A'}
Molecular Weight: ${molecularWeight} Da (Threshold: ≤ 500 Da)
LogP (Lipophilicity): ${logP !== null ? logP : 'Calculated'} (Threshold: ≤ 5.0)
Hydrogen Bond Donors (HBD): ${hbd} (Threshold: ≤ 5)
Hydrogen Bond Acceptors (HBA): ${hba} (Threshold: ≤ 10)
TPSA (Polar Surface Area): ${tpsa} Å² (Veber Threshold: ≤ 140 Å²)
Rotatable Bonds: ${rotatableBonds} (Veber Threshold: ≤ 10)
Preliminary Classification: ${classification}
Detected Violations: ${violationList.length > 0 ? violationList.join(', ') : 'None (Strictly Compliant)'}
Data Source: ${source || 'Computational Screener'}

Provide a well-structured, educational explanation divided into these four clear sections:
1. Chemical Profile & Structural Overview: Functional groups and medicinal significance.
2. Drug-Likeness & Lipinski Compliance: Analysis of permeability, desolvation penalty, and conformational flexibility.
3. Pharmacokinetic (ADMET) Implications: Estimated oral bioavailability, gut-blood barrier permeation, and potential metabolic liabilities.
4. Medicinal Chemistry Optimization Recommendations: Actionable chemical modifications to improve drug-likeness if liabilities exist.

Ensure the tone is scientific and objective. Keep explanations concise and impactful.
`;

  if (apiKey && apiKey.trim().length > 5) {
    try {
      const aiResponse = await callGeminiApi(prompt, apiKey.trim());
      return {
        aiGenerated: true,
        provider: 'Google Gemini AI',
        model: 'gemini-flash',
        content: aiResponse,
        disclaimer: 'AI-GENERATED RESEARCH PROTOTYPE EXPLANATION: Generated via Google Gemini API. This explanation synthesizes in-silico chemical descriptors and does not constitute clinical trial data, biological validation, or medical advice.'
      };
    } catch (err) {
      console.warn('[GeminiService] Gemini API unreachable or key error. Falling back to medicinal chemistry heuristic engine.');
    }
  }

  // Fallback: Rich, domain-grounded medicinal chemistry heuristic generator
  const fallbackContent = generateHeuristicExplanation({
    name,
    smiles,
    formula,
    molecularWeight,
    logP,
    hbd,
    hba,
    tpsa,
    rotatableBonds,
    classification,
    violationList
  });

  return {
    aiGenerated: false,
    provider: 'Medicinal Chemistry Heuristic Engine (In-Silico Fallback)',
    model: 'Rule-Based Cheminformatics Expert System',
    content: fallbackContent,
    disclaimer: 'HEURISTIC RESEARCH EXPLANATION: Generated by the built-in Cheminformatics Expert System based on classical medicinal chemistry rules (Lipinski, Veber). Provide a GEMINI_API_KEY in .env to unlock deep Gemini generative AI insights.'
  };
}

/**
 * Built-in Rule-Based Medicinal Chemistry Explainer
 */
function generateHeuristicExplanation({
  name,
  smiles,
  formula,
  molecularWeight,
  logP,
  hbd,
  hba,
  tpsa,
  rotatableBonds,
  classification,
  violationList
}) {
  const compoundTitle = name || 'The screened compound';

  // Section 1: Chemical Profile
  const sec1 = `### 1. Chemical Profile & Structural Overview
**${compoundTitle}** (Formula: \`${formula || 'Derived'}\`) presents a calculated molecular mass of **${molecularWeight} Da**.
The molecule contains **${rotatableBonds} rotatable single bond${rotatableBonds === 1 ? '' : 's'}**, establishing its structural flexibility, alongside **${hbd} hydrogen bond donor(s)** and **${hba} hydrogen bond acceptor(s)**. Its topological polar surface area is **${tpsa} Å²**, reflecting the overall solvent-accessible polar electronic cloud.`;

  // Section 2: Drug-Likeness & Lipinski Compliance
  let sec2 = `### 2. Drug-Likeness & Lipinski Rule of Five Assessment\n`;
  if (violationList.length === 0) {
    sec2 += `The molecule satisfies **all criteria of Lipinski's Rule of Five** without a single violation:
- **Molecular Mass:** At ${molecularWeight} Da, it stays safely beneath the 500 Da diffusion ceiling.
- **Lipophilicity (LogP):** The partition coefficient of ${logP !== null ? logP : 'optimal'} falls within the favorable range (0 to 5.0), ensuring adequate aqueous solubility in intestinal fluid and sufficient lipophilicity to partition across the lipid bilayer.
- **Hydrogen Bonding Capacity:** With ${hbd} donor(s) (≤ 5) and ${hba} acceptor(s) (≤ 10), the desolvation penalty required to cross the hydrophobic core of the cellular membrane is thermodynamically favorable.`;
  } else {
    sec2 += `The compound exhibits **${violationList.length} criteria violation(s)** under the Rule of Five:
${violationList.map(v => `- **${v}**`).join('\n')}
Under classical medicinal chemistry guidelines, molecules with multiple violations frequently encounter severe oral absorption barriers, prolonged insolubility, or rapid elimination.`;
  }

  // Section 3: ADMET Implications
  let sec3 = `### 3. Pharmacokinetic (ADMET) Considerations\n`;
  const numLogP = logP !== null ? logP : 2.0;
  if (tpsa <= 90 && rotatableBonds <= 7 && numLogP >= 1.0 && numLogP <= 3.5) {
    sec3 += `- **Permeability:** High probability of excellent passive transcellular intestinal absorption. The low polar surface area (${tpsa} Å² ≤ 90 Å²) may also permit passage across the blood-brain barrier (BBB).
- **Metabolism & Clearance:** Balanced lipophilicity suggests moderate hepatic CYP450 metabolism without extreme non-specific tissue accumulation.`;
  } else if (tpsa > 140 || molecularWeight > 500) {
    sec3 += `- **Permeability:** Passive absorption is severely limited. Oral bioavailability is projected to be low (< 20%) unless mediated by active nutrient transporters (such as PEPT1 or OCT).
- **Distribution:** Low CNS penetration is anticipated due to high polar surface area and size exclusion. Formulation as an injectable (IV/SC) or lipid nanoparticle vehicle may be necessary.`;
  } else {
    sec3 += `- **Permeability:** Moderate passive absorption expected. The compound resides in the typical pharmaceutical space for peripheral oral drug targets.`;
  }

  // Section 4: Optimization
  let sec4 = `### 4. Medicinal Chemistry Lead Optimization Strategy\n`;
  if (violationList.length === 0) {
    sec4 += `Given the compliant baseline profile, optimization efforts can focus on:
- **Target Potency:** Fine-tuning selectivity for the target binding pocket without increasing molecular weight beyond 500 Da.
- **Metabolic Soft Spots:** Identifying labile ester, amine, or unsubstituted aromatic positions prone to rapid CYP-mediated hydroxylation.`;
  } else {
    sec4 += `To address the identified liabilities:
- **Weight Trimming:** Consider truncating non-essential peripheral appendages or replacing bulky aromatics with compact bioisosteres (e.g., bicyclo[1.1.1]pentanes or cubanes).
- **Polarity Modulation:** Mask excess hydrogen bond donors via methylation, fluorination, or intramolecular hydrogen bonding to lower the desolvation barrier.`;
  }

  return `${sec1}\n\n${sec2}\n\n${sec3}\n\n${sec4}`;
}

module.exports = {
  generateCompoundExplanation
};
