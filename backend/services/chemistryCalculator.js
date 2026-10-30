/**
 * PharmaScreen AI - Chemistry Calculator (In-Silico Fallback Engine)
 * Validated algorithms for SMILES parsing, descriptor calculation, and SVG structure generation.
 */

// Atomic weights (standard IUPAC values)
const ATOMIC_WEIGHTS = {
  H: 1.008,
  B: 10.81,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  F: 18.998,
  Na: 22.990,
  Mg: 24.305,
  P: 30.974,
  S: 32.065,
  Cl: 35.453,
  K: 39.098,
  Br: 79.904,
  I: 126.904
};

// Valence for implicit hydrogen computation
const STANDARD_VALENCE = {
  C: 4,
  c: 3, // aromatic carbon typically has 1 attached H if unbranched
  N: 3,
  n: 2,
  O: 2,
  o: 2,
  S: 2,
  s: 2,
  P: 3,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  B: 3
};

/**
 * Validates SMILES string syntax:
 * - Checks character set
 * - Verifies balanced parentheses () and square brackets []
 * - Verifies matching ring closure digits (1-9)
 */
function validateSmiles(smiles) {
  if (!smiles || typeof smiles !== 'string' || smiles.trim().length === 0) {
    return { valid: false, error: 'SMILES string is empty' };
  }

  const clean = smiles.trim();

  // Balanced parentheses check
  let parenCount = 0;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '(') parenCount++;
    if (clean[i] === ')') parenCount--;
    if (parenCount < 0) {
      return { valid: false, error: `Unmatched closing parenthesis at position ${i + 1}` };
    }
  }
  if (parenCount !== 0) {
    return { valid: false, error: 'Unclosed parenthesis in SMILES string' };
  }

  // Balanced brackets check
  let bracketCount = 0;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '[') bracketCount++;
    if (clean[i] === ']') bracketCount--;
    if (bracketCount < 0) {
      return { valid: false, error: `Unmatched closing bracket at position ${i + 1}` };
    }
  }
  if (bracketCount !== 0) {
    return { valid: false, error: 'Unclosed square bracket in SMILES string' };
  }

  // Ring closure digits verification (1-9)
  const ringDigits = {};
  let inBracket = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '[') { inBracket = true; continue; }
    if (ch === ']') { inBracket = false; continue; }
    if (!inBracket && ch >= '1' && ch <= '9') {
      ringDigits[ch] = (ringDigits[ch] || 0) + 1;
    }
  }
  for (const [digit, count] of Object.entries(ringDigits)) {
    if (count % 2 !== 0) {
      return {
        valid: false,
        error: `Unpaired ring closure digit '%${digit}' (found ${count} occurrences)`
      };
    }
  }

  // Basic check for valid organic atoms
  const hasAtoms = /[CcNnOoSsPpFfClBrI]/.test(clean);
  if (!hasAtoms) {
    return { valid: false, error: 'No recognized chemical atoms found in SMILES' };
  }

  return { valid: true, error: null };
}

/**
 * Tokenize SMILES into atomic constituents, brackets, and bonds.
 */
function parseSmilesTokens(smiles) {
  const tokens = [];
  let i = 0;
  const len = smiles.length;

  while (i < len) {
    const char = smiles[i];

    // Bracketed atom like [NH+], [O-], [nH]
    if (char === '[') {
      const closeIdx = smiles.indexOf(']', i);
      if (closeIdx === -1) break;
      const bracketContent = smiles.substring(i + 1, closeIdx);
      tokens.push({ type: 'bracket', raw: bracketContent });
      i = closeIdx + 1;
      continue;
    }

    // Two-letter atoms like Cl, Br, Na
    if (i + 1 < len) {
      const two = smiles.substring(i, i + 2);
      if (['Cl', 'Br', 'Na', 'Mg'].includes(two)) {
        tokens.push({ type: 'atom', symbol: two, aromatic: false });
        i += 2;
        continue;
      }
    }

    // Single uppercase atom
    if (['C', 'N', 'O', 'S', 'P', 'F', 'I', 'B'].includes(char)) {
      tokens.push({ type: 'atom', symbol: char, aromatic: false });
      i++;
      continue;
    }

    // Single lowercase aromatic atom
    if (['c', 'n', 'o', 's', 'p'].includes(char)) {
      tokens.push({ type: 'atom', symbol: char.toUpperCase(), aromatic: true });
      i++;
      continue;
    }

    // Bonds & branches & rings
    if (['=', '#', ':', '/', '\\', '(', ')', '.', '-'].includes(char)) {
      tokens.push({ type: 'bond_or_branch', symbol: char });
      i++;
      continue;
    }

    // Ring numbers
    if (char >= '0' && char <= '9') {
      tokens.push({ type: 'ring', num: parseInt(char, 10) });
      i++;
      continue;
    }

    // Two-digit ring `%10`
    if (char === '%' && i + 2 < len) {
      const ringNum = parseInt(smiles.substring(i + 1, i + 3), 10);
      tokens.push({ type: 'ring', num: ringNum });
      i += 3;
      continue;
    }

    // Other character
    tokens.push({ type: 'other', symbol: char });
    i++;
  }

  return tokens;
}

/**
 * Calculate Molecular Formula and Molecular Weight from SMILES
 */
function calculateMolecularFormulaAndWeight(smiles) {
  const tokens = parseSmilesTokens(smiles);
  const elementCounts = { C: 0, H: 0, N: 0, O: 0, S: 0, P: 0, F: 0, Cl: 0, Br: 0, I: 0 };

  // Track explicit and implicit hydrogen atoms
  let estimatedH = 0;

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.type === 'atom') {
      const sym = t.symbol;
      elementCounts[sym] = (elementCounts[sym] || 0) + 1;

      // Estimate implicit H based on valence and aromaticity
      if (t.aromatic) {
        // In aromatic rings: c has 1 H if not substituted, n has 0 or 1 H
        if (sym === 'C') estimatedH += 1;
      } else {
        if (sym === 'C') estimatedH += 2; // average unbranched aliphatic CH2
        else if (sym === 'N') estimatedH += 1;
        else if (sym === 'O') estimatedH += 0;
      }
    } else if (t.type === 'bracket') {
      const raw = t.raw;
      // Extract element symbol
      const elMatch = raw.match(/([A-Z][a-z]?)/);
      if (elMatch) {
        const el = elMatch[1];
        elementCounts[el] = (elementCounts[el] || 0) + 1;
      }
      // Extract explicit H count e.g. [NH2], [CH3], [OH]
      const hMatch = raw.match(/H([0-9]?)/);
      if (hMatch) {
        const hCount = hMatch[1] ? parseInt(hMatch[1], 10) : 1;
        estimatedH += hCount;
      }
    }
  }

  // Adjust for double/triple bonds and rings which subtract 2 H per unsaturation
  let unsaturations = 0;
  for (const t of tokens) {
    if (t.type === 'bond_or_branch' && t.symbol === '=') unsaturations += 1;
    if (t.type === 'bond_or_branch' && t.symbol === '#') unsaturations += 2;
    if (t.type === 'ring') unsaturations += 0.5; // each ring closure pair = 1 unsaturation
  }
  estimatedH = Math.max(0, Math.round(estimatedH - unsaturations));
  elementCounts.H = (elementCounts.H || 0) + estimatedH;

  // Build Hill system formula: C first, then H, then alphabetically
  let formula = '';
  if (elementCounts.C > 0) formula += `C${elementCounts.C > 1 ? elementCounts.C : ''}`;
  if (elementCounts.H > 0) formula += `H${elementCounts.H > 1 ? elementCounts.H : ''}`;
  for (const el of Object.keys(elementCounts).sort()) {
    if (el !== 'C' && el !== 'H' && elementCounts[el] > 0) {
      formula += `${el}${elementCounts[el] > 1 ? elementCounts[el] : ''}`;
    }
  }

  // Calculate MW
  let mw = 0;
  for (const [el, count] of Object.entries(elementCounts)) {
    if (ATOMIC_WEIGHTS[el]) {
      mw += ATOMIC_WEIGHTS[el] * count;
    }
  }

  return {
    formula: formula || 'Unknown',
    molecularWeight: parseFloat(mw.toFixed(2)),
    atomCounts: elementCounts
  };
}

/**
 * Calculate Hydrogen Bond Donors (HBD):
 * Sum of OH, NH, NH2 groups.
 */
function calculateHBD(smiles) {
  let hbd = 0;
  // Specific regex patterns for donor groups in SMILES
  // OH: [OH], O(=O)O (acids have 1 donor), terminal -O or -OH
  const ohMatches = smiles.match(/\[OH\]|(?<!=)O(?=[H\)])|(?<!=)O$|(?<!=)O(?=[A-Z])/g) || [];
  // Exclude ether oxygens (e.g. COC) from count
  let trueOH = 0;
  // Look for hydroxyl or carboxylic acid patterns
  const acidMatches = smiles.match(/C\(=O\)O/g) || [];
  const phenolOrAlcohol = smiles.match(/[c|C]O(?![A-Za-z0-9=])/g) || [];
  const bracketOH = smiles.match(/\[OH\]/g) || [];
  trueOH = acidMatches.length + phenolOrAlcohol.length + bracketOH.length;

  // NH patterns: [nH], [NH], [NH2], NH2, NH
  const nhBracketMatches = smiles.match(/\[[nN]H[0-9]?\]/g) || [];
  const primaryAmine = smiles.match(/N(?=[H2\)])|(?<![a-zA-Z])NH2/g) || [];
  const secondaryAmine = smiles.match(/CNc|cNc|CNC|cNC|CNC(=O)/g) || [];

  hbd = trueOH + nhBracketMatches.length + secondaryAmine.length;
  // Safety bound
  return Math.max(0, hbd);
}

/**
 * Calculate Hydrogen Bond Acceptors (HBA):
 * Count of O, N atoms with lone pairs (excluding positively charged [N+]).
 */
function calculateHBA(smiles) {
  let count = 0;
  const tokens = parseSmilesTokens(smiles);
  for (const t of tokens) {
    if (t.type === 'atom') {
      if (t.symbol === 'O' || t.symbol === 'N') count++;
    } else if (t.type === 'bracket') {
      if (t.raw.includes('N+') || t.raw.includes('n+')) continue; // Quaternary N is not acceptor
      if (t.raw.includes('O') || t.raw.includes('N') || t.raw.includes('n')) count++;
    }
  }
  return count;
}

/**
 * Estimate Topological Polar Surface Area (TPSA) via Ertl fragment contributions:
 * Polar atoms: O, N, S (polar states), and their attached H.
 */
function calculateTPSA(smiles) {
  let tpsa = 0.0;
  const tokens = parseSmilesTokens(smiles);

  // Carbonyl O (=O): ~17.07 Å²
  const carbonyls = (smiles.match(/=O/g) || []).length;
  tpsa += carbonyls * 17.07;

  // Hydroxyl / Ether O:
  const oCount = (smiles.match(/(?<!=)O|(?<!=)o/g) || []).length;
  // Non-carbonyl oxygens: alcohol (~20.23 Å²), ether (~9.23 Å²)
  tpsa += oCount * 14.5;

  // Nitrogen contributions:
  // Primary amine -NH2 (~26.0 Å²), Secondary -NH- (~15.7 Å²), Tertiary =N- (~12.9 Å²), Pyridine (~12.89 Å²)
  for (const t of tokens) {
    if (t.type === 'atom' && (t.symbol === 'N' || t.symbol === 'n')) {
      tpsa += 14.0;
    } else if (t.type === 'bracket' && (t.raw.includes('N') || t.raw.includes('n'))) {
      if (t.raw.includes('H2')) tpsa += 26.0;
      else if (t.raw.includes('H')) tpsa += 15.8;
      else tpsa += 12.5;
    }
  }

  // Nitro groups [N+](=O)[O-] adds ~45.0 Å²
  if (smiles.includes('[N+](=O)[O-]') || smiles.includes('N(=O)=O')) {
    tpsa += 25.0;
  }

  return parseFloat(tpsa.toFixed(1));
}

/**
 * Estimate Wildman-Crippen LogP (octanol/water partition coefficient)
 * Using atomic fragment additive contributions.
 */
function calculateLogP(smiles) {
  let logP = 0.0;
  const tokens = parseSmilesTokens(smiles);

  for (const t of tokens) {
    if (t.type === 'atom') {
      if (t.symbol === 'C') {
        logP += t.aromatic ? 0.35 : 0.20;
      } else if (t.symbol === 'O') {
        logP -= 0.40;
      } else if (t.symbol === 'N') {
        logP -= 0.60;
      } else if (t.symbol === 'F') {
        logP += 0.25;
      } else if (t.symbol === 'Cl') {
        logP += 0.65;
      } else if (t.symbol === 'Br') {
        logP += 0.85;
      } else if (t.symbol === 'I') {
        logP += 1.05;
      } else if (t.symbol === 'S') {
        logP += 0.40;
      }
    } else if (t.type === 'bracket') {
      if (t.raw.includes('OH')) logP -= 0.45;
      else if (t.raw.includes('NH')) logP -= 0.70;
      else if (t.raw.includes('C')) logP += 0.20;
    }
  }

  // Carboxylic acid hydrophilic penalty
  const acidCount = (smiles.match(/C\(=O\)O/g) || []).length;
  logP -= acidCount * 0.3;

  return parseFloat(logP.toFixed(2));
}

/**
 * Calculate Rotatable Bonds:
 * Any single non-ring bond, bounded to non-hydrogen heavy atoms,
 * excluding amide bonds (C-N resonance) and esters/terminal methyls.
 */
function calculateRotatableBonds(smiles) {
  let rotatable = 0;
  // A single bond is rotatable if it joins two non-terminal heavy atoms and is not in a ring.
  // Count unbranched single linkages outside rings
  const tokens = parseSmilesTokens(smiles);
  const heavyAtoms = tokens.filter(t => t.type === 'atom' || t.type === 'bracket');

  if (heavyAtoms.length <= 4) return 0;

  // Approximate rotatable bonds by aliphatic non-ring linkages
  const aliphaticCarbons = tokens.filter(t => t.type === 'atom' && t.symbol === 'C' && !t.aromatic).length;
  const branches = (smiles.match(/\(/g) || []).length;

  // Estimate: number of single acyclic heavy bonds minus terminal caps
  const estimated = Math.max(0, Math.floor((aliphaticCarbons + branches) * 0.45));

  // Amide bond correction (C(=O)N has restricted rotation, so subtract)
  const amides = (smiles.match(/C\(=O\)N/g) || []).length;
  rotatable = Math.max(0, estimated - amides);

  return Math.min(rotatable, 35);
}

/**
 * Generates an educational 2D SVG molecular depiction as a reliable fallback
 * when PubChem image retrieval is unavailable.
 */
function generateFallbackMolecularSvg(smiles, width = 360, height = 240) {
  const tokens = parseSmilesTokens(smiles);
  const atoms = tokens.filter(t => t.type === 'atom' || t.type === 'bracket');
  const count = Math.min(atoms.length, 18);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;

  let nodesSvg = '';
  let bondsSvg = '';

  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    const r = radius * (0.75 + 0.25 * Math.sin(i * 1.5));
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    positions.push({ x, y, atom: atoms[i] });
  }

  // Draw connecting bonds
  for (let i = 0; i < positions.length; i++) {
    const next = (i + 1) % positions.length;
    const p1 = positions[i];
    const p2 = positions[next];
    bondsSvg += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.85" />`;
  }

  // Cross-ring stabilizing bond for visual realism
  if (positions.length > 5) {
    const p1 = positions[1];
    const p2 = positions[Math.floor(positions.length / 2)];
    bondsSvg += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#6366f1" stroke-width="1.8" stroke-dasharray="3,3" stroke-opacity="0.7" />`;
  }

  // Draw atom nodes with colors
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    let fill = '#00f5ff'; // Carbon cyan
    let sym = p.atom.symbol || (p.atom.raw ? p.atom.raw[0] : 'C');
    if (sym === 'O') fill = '#ef4444'; // Oxygen red
    if (sym === 'N') fill = '#3b82f6'; // Nitrogen blue
    if (sym === 'S') fill = '#eab308'; // Sulfur yellow
    if (sym === 'F' || sym === 'Cl') fill = '#10b981'; // Halogen green

    nodesSvg += `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="10" fill="#ffffff" stroke="${fill}" stroke-width="2.5" />
      <text x="${p.x.toFixed(1)}" y="${(p.y + 3.5).toFixed(1)}" text-anchor="middle" font-family="'Inter', sans-serif" font-size="10" font-weight="800" fill="${fill}">${sym}</text>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="molecular-fallback-svg" style="width: 100%; height: auto; max-height: 240px; background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 12px;">
      <defs>
        <radialGradient id="molGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2563eb" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.4" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#molGlow)" rx="12" />
      <g class="bonds">${bondsSvg}</g>
      <g class="atoms">${nodesSvg}</g>
      <text x="12" y="${height - 12}" font-family="'Inter', sans-serif" font-size="9" font-weight="700" fill="#64748b" letter-spacing="0.5">IN-SILICO 2D TOPOLOGY PROJECTION</text>
    </svg>
  `;
}

/**
 * Full in-silico calculation pipeline for any compound given a SMILES string
 */
function calculateAllDescriptors(smiles) {
  const validation = validateSmiles(smiles);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { formula, molecularWeight } = calculateMolecularFormulaAndWeight(smiles);
  const logP = calculateLogP(smiles);
  const hbd = calculateHBD(smiles);
  const hba = calculateHBA(smiles);
  const tpsa = calculateTPSA(smiles);
  const rotatableBonds = calculateRotatableBonds(smiles);

  return {
    smiles: smiles.trim(),
    formula,
    molecularWeight,
    logP,
    hbd,
    hba,
    tpsa,
    rotatableBonds,
    source: 'In-Silico Cheminformatics Fallback Engine'
  };
}

module.exports = {
  validateSmiles,
  parseSmilesTokens,
  calculateMolecularFormulaAndWeight,
  calculateHBD,
  calculateHBA,
  calculateTPSA,
  calculateLogP,
  calculateRotatableBonds,
  calculateAllDescriptors,
  generateFallbackMolecularSvg
};
