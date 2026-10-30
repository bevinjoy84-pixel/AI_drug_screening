/**
 * PharmaScreen AI - Drug Screening & Lipinski Rule of Five Evaluation Engine
 */

// Classical Lipinski thresholds
const LIPINSKI_THRESHOLDS = {
  MW_MAX: 500.0,
  LOGP_MAX: 5.0,
  HBD_MAX: 5,
  HBA_MAX: 10
};

// Veber oral bioavailability criteria
const VEBER_THRESHOLDS = {
  ROTB_MAX: 10,
  TPSA_MAX: 140.0
};

/**
 * Evaluate Lipinski's Rule of Five and Veber criteria for a compound
 */
function evaluateDrugLikeness(properties) {
  const mw = parseFloat(properties.molecularWeight) || 0;
  const rawLogP = properties.logP !== null && properties.logP !== undefined ? parseFloat(properties.logP) : null;
  const logP = (rawLogP !== null && !isNaN(rawLogP)) ? rawLogP : null;
  const hbd = parseInt(properties.hbd, 10) || 0;
  const hba = parseInt(properties.hba, 10) || 0;
  const rotatableBonds = parseInt(properties.rotatableBonds, 10) || 0;
  const tpsa = parseFloat(properties.tpsa) || 0;

  // Lipinski Violations
  const mwViolation = mw > LIPINSKI_THRESHOLDS.MW_MAX;
  const logPViolation = logP !== null ? logP > LIPINSKI_THRESHOLDS.LOGP_MAX : false;
  const hbdViolation = hbd > LIPINSKI_THRESHOLDS.HBD_MAX;
  const hbaViolation = hba > LIPINSKI_THRESHOLDS.HBA_MAX;

  let totalViolations = 0;
  if (mwViolation) totalViolations++;
  if (logPViolation) totalViolations++;
  if (hbdViolation) totalViolations++;
  if (hbaViolation) totalViolations++;

  // Veber Criteria
  const veberRotBViolation = rotatableBonds > VEBER_THRESHOLDS.ROTB_MAX;
  const veberTPSAViolation = tpsa > VEBER_THRESHOLDS.TPSA_MAX;
  let veberViolations = 0;
  if (veberRotBViolation) veberViolations++;
  if (veberTPSAViolation) veberViolations++;

  // Classification determination
  let classification = 'Promising Candidate';
  let badgeColor = 'success';
  let summary = '';

  if (totalViolations === 0) {
    classification = 'Promising Candidate';
    badgeColor = 'success';
    summary = 'Zero Lipinski violations detected. The compound satisfies all four Rule-of-Five physicochemical boundaries, suggesting favorable passive gastrointestinal absorption.';
  } else if (totalViolations === 1) {
    classification = 'Needs Review';
    badgeColor = 'warning';
    summary = 'One Lipinski violation identified. While not disqualifying (approx. 16% of FDA-approved oral drugs carry 1 violation), formulation optimization or carrier transport may be needed.';
  } else {
    classification = 'Unfavorable';
    badgeColor = 'danger';
    summary = `Two or more Lipinski violations detected (${totalViolations} violations). High probability of poor oral bioavailability, excessive molecular weight, or extreme lipophilicity. Alternative routes (e.g., parenteral) or lead modification recommended.`;
  }

  // Detailed Rule Explanations
  const ruleBreakdown = [
    {
      rule: 'Molecular Weight (MW)',
      threshold: `≤ ${LIPINSKI_THRESHOLDS.MW_MAX} Da`,
      value: `${mw.toFixed(2)} Da`,
      violated: mwViolation,
      status: mwViolation ? 'Violated' : 'Compliant',
      rationale: mwViolation
        ? `Exceeds 500 Da by ${(mw - LIPINSKI_THRESHOLDS.MW_MAX).toFixed(1)} Da. Larger molecular volume significantly retards passive transcellular diffusion across the gut epithelium.`
        : 'Molecular size is optimal for crossing enterocyte cell membranes without sterical hindrance.'
    },
    {
      rule: 'Partition Coefficient (LogP)',
      threshold: `≤ ${LIPINSKI_THRESHOLDS.LOGP_MAX}`,
      value: logP !== null ? logP.toFixed(2) : 'N/A',
      violated: logPViolation,
      status: logP !== null ? (logPViolation ? 'Violated' : 'Compliant') : 'Unspecified',
      rationale: logP !== null
        ? (logPViolation
          ? `LogP of ${logP.toFixed(2)} exceeds 5.0. Excessive lipophilicity leads to poor aqueous solubility, non-specific protein binding, and rapid hepatic clearance.`
          : 'Lipophilicity is balanced, allowing both adequate aqueous solubility in gastric fluid and lipid bilayer partition.')
        : 'Lipophilicity could not be computed from available structural data.'
    },
    {
      rule: 'Hydrogen Bond Donors (HBD)',
      threshold: `≤ ${LIPINSKI_THRESHOLDS.HBD_MAX}`,
      value: `${hbd}`,
      violated: hbdViolation,
      status: hbdViolation ? 'Violated' : 'Compliant',
      rationale: hbdViolation
        ? `Found ${hbd} donors (limit is 5). High donor count incurs an unfavorable desolvation energy penalty when exiting the aqueous phase into lipid membranes.`
        : 'Hydrogen bond donor count is well within the acceptable threshold for favorable desolvation kinetics.'
    },
    {
      rule: 'Hydrogen Bond Acceptors (HBA)',
      threshold: `≤ ${LIPINSKI_THRESHOLDS.HBA_MAX}`,
      value: `${hba}`,
      violated: hbaViolation,
      status: hbaViolation ? 'Violated' : 'Compliant',
      rationale: hbaViolation
        ? `Found ${hba} acceptors (limit is 10). Excessive polarity and hydrogen bonding opportunities hinder membrane translocation.`
        : 'Acceptor count provides sufficient target interaction without excessive hydration shells.'
    }
  ];

  // Veber Criteria Breakdown
  const veberBreakdown = [
    {
      rule: 'Rotatable Bond Count',
      threshold: `≤ ${VEBER_THRESHOLDS.ROTB_MAX}`,
      value: `${rotatableBonds}`,
      violated: veberRotBViolation,
      status: veberRotBViolation ? 'Violated' : 'Compliant',
      rationale: veberRotBViolation
        ? `High flexibility (${rotatableBonds} rotatable bonds) increases conformational entropy loss upon target binding and reduces oral bioavailability.`
        : 'Optimal conformational rigidity to maintain target affinity with minimal entropy loss.'
    },
    {
      rule: 'Topological Polar Surface Area (TPSA)',
      threshold: `≤ ${VEBER_THRESHOLDS.TPSA_MAX} Å²`,
      value: `${tpsa.toFixed(1)} Å²`,
      violated: veberTPSAViolation,
      status: veberTPSAViolation ? 'Violated' : 'Compliant',
      rationale: veberTPSAViolation
        ? `Polar surface area of ${tpsa.toFixed(1)} Å² exceeds 140 Å². High polar area severely restricts passive gastrointestinal and blood-brain barrier transport.`
        : 'Polar surface area allows adequate permeability through biological membranes.'
    }
  ];

  return {
    classification,
    badgeColor,
    totalViolations,
    veberViolations,
    summary,
    violations: {
      mw: mwViolation,
      logP: logPViolation,
      hbd: hbdViolation,
      hba: hbaViolation,
      totalViolations,
      veberRotB: veberRotBViolation,
      veberTPSA: veberTPSAViolation
    },
    ruleBreakdown,
    veberBreakdown,
    scientificDisclaimer: 'EDUCATIONAL RESEARCH PROTOTYPE: Lipinski\'s Rule of Five is a statistical heuristic for oral bioavailability potential. It does not validate biological efficacy, target specificity, metabolic stability, or absence of toxicity.'
  };
}

module.exports = {
  LIPINSKI_THRESHOLDS,
  VEBER_THRESHOLDS,
  evaluateDrugLikeness
};
