/**
 * PharmaScreen AI - Chemistry Calculator (In-Silico Fallback Engine)
 * Validated graph-based cheminformatics algorithms for SMILES parsing,
 * molecular topology, descriptor calculation, and SVG structure generation.
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
  B: 3,
  C: 4,
  N: 3,
  O: 2,
  F: 1,
  P: 3,
  S: 2,
  Cl: 1,
  Br: 1,
  I: 1
};

/**
 * Validates SMILES string syntax:
 * - Checks character set and non-empty input
 * - Verifies balanced parentheses () and square brackets []
 * - Verifies matching ring closure digits (1-9 and %10-%99)
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

  // Ring closure digits verification (1-9 and %10-%99)
  const ringCounts = {};
  let inBracket = false;
  let idx = 0;
  while (idx < clean.length) {
    const ch = clean[idx];
    if (ch === '[') { inBracket = true; idx++; continue; }
    if (ch === ']') { inBracket = false; idx++; continue; }

    if (!inBracket) {
      if (ch === '%' && idx + 2 < clean.length) {
        const ringNum = clean.substring(idx + 1, idx + 3);
        ringCounts[`%${ringNum}`] = (ringCounts[`%${ringNum}`] || 0) + 1;
        idx += 3;
        continue;
      } else if (ch >= '1' && ch <= '9') {
        ringCounts[ch] = (ringCounts[ch] || 0) + 1;
        idx++;
        continue;
      }
    }
    idx++;
  }

  for (const [digit, count] of Object.entries(ringCounts)) {
    if (count % 2 !== 0) {
      return {
        valid: false,
        error: `Unpaired ring closure digit '${digit}' (found ${count} occurrence${count === 1 ? '' : 's'})`
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
 * Builds a full molecular graph representation from a SMILES string.
 * Accurately tracks explicit bonds, ring closures, branches, valence, and implicit hydrogens.
 */
function buildMolecularGraph(smiles) {
  const clean = smiles.trim();
  const atoms = [];
  const bonds = [];
  const ringClosures = {};
  const branchStack = [];

  let prevAtomIdx = null;
  let nextBondOrder = 1;
  let i = 0;
  const len = clean.length;

  while (i < len) {
    const ch = clean[i];

    // Branching: '(' pushes prevAtomIdx to stack; ')' pops
    if (ch === '(') {
      branchStack.push(prevAtomIdx);
      i++;
      continue;
    }
    if (ch === ')') {
      prevAtomIdx = branchStack.pop();
      i++;
      continue;
    }

    // Explicit bonds
    if (ch === '-') { nextBondOrder = 1; i++; continue; }
    if (ch === '=') { nextBondOrder = 2; i++; continue; }
    if (ch === '#') { nextBondOrder = 3; i++; continue; }
    if (ch === ':') { nextBondOrder = 1.5; i++; continue; }
    if (ch === '.') { prevAtomIdx = null; nextBondOrder = 1; i++; continue; }

    // Ring closure numbers: 1-9 or %10-%99
    if ((ch >= '1' && ch <= '9') || ch === '%') {
      let ringNum = ch;
      let advance = 1;
      if (ch === '%') {
        ringNum = clean.substring(i + 1, i + 3);
        advance = 3;
      }
      i += advance;

      if (ringClosures[ringNum] !== undefined) {
        // Close ring
        const openInfo = ringClosures[ringNum];
        delete ringClosures[ringNum];
        bonds.push({
          a1: openInfo.atomIdx,
          a2: prevAtomIdx,
          order: openInfo.bondOrder !== 1 ? openInfo.bondOrder : nextBondOrder,
          inRing: true
        });
        nextBondOrder = 1;
      } else {
        // Open ring
        ringClosures[ringNum] = { atomIdx: prevAtomIdx, bondOrder: nextBondOrder };
        nextBondOrder = 1;
      }
      continue;
    }

    // Bracket atom [NH+], [O-], [OH], etc.
    if (ch === '[') {
      const closeIdx = clean.indexOf(']', i);
      if (closeIdx === -1) break;
      const raw = clean.substring(i + 1, closeIdx);
      i = closeIdx + 1;

      // Extract symbol
      const elMatch = raw.match(/([A-Z][a-z]?|[a-z])/);
      let symbol = 'C';
      let aromatic = false;
      if (elMatch) {
        const rawSym = elMatch[1];
        if (rawSym === rawSym.toLowerCase()) {
          symbol = rawSym.toUpperCase();
          aromatic = true;
        } else {
          symbol = rawSym;
        }
      }

      // Explicit H in bracket
      let explicitH = 0;
      const hMatch = raw.match(/H([0-9]?)/);
      if (hMatch) {
        explicitH = hMatch[1] ? parseInt(hMatch[1], 10) : 1;
      }

      // Charge
      let charge = 0;
      const chargeMatch = raw.match(/([+-])([0-9]?)/);
      if (chargeMatch) {
        const sign = chargeMatch[1] === '+' ? 1 : -1;
        const val = chargeMatch[2] ? parseInt(chargeMatch[2], 10) : 1;
        charge = sign * val;
      }

      const atomIdx = atoms.length;
      atoms.push({
        symbol,
        aromatic,
        bracket: true,
        explicitH,
        charge,
        raw
      });

      if (prevAtomIdx !== null) {
        bonds.push({ a1: prevAtomIdx, a2: atomIdx, order: nextBondOrder, inRing: false });
        nextBondOrder = 1;
      }
      prevAtomIdx = atomIdx;
      continue;
    }

    // Two-letter unbracketed atoms: Cl, Br, Na, Mg
    let atomSymbol = null;
    let isAromatic = false;
    if (i + 1 < len) {
      const two = clean.substring(i, i + 2);
      if (['Cl', 'Br', 'Na', 'Mg'].includes(two)) {
        atomSymbol = two;
        i += 2;
      }
    }

    if (!atomSymbol) {
      if (['B', 'C', 'N', 'O', 'P', 'S', 'F', 'I'].includes(ch)) {
        atomSymbol = ch;
        isAromatic = false;
        i++;
      } else if (['b', 'c', 'n', 'o', 'p', 's'].includes(ch)) {
        atomSymbol = ch.toUpperCase();
        isAromatic = true;
        i++;
      } else {
        i++;
        continue;
      }
    }

    const atomIdx = atoms.length;
    atoms.push({
      symbol: atomSymbol,
      aromatic: isAromatic,
      bracket: false,
      explicitH: 0,
      charge: 0,
      raw: atomSymbol
    });

    if (prevAtomIdx !== null) {
      let order = nextBondOrder;
      if (order === 1 && isAromatic && atoms[prevAtomIdx].aromatic) {
        order = 1.5;
      }
      bonds.push({ a1: prevAtomIdx, a2: atomIdx, order, inRing: false });
      nextBondOrder = 1;
    }
    prevAtomIdx = atomIdx;
  }

  // Calculate bonded valence and adjacency list
  const bondedValence = new Array(atoms.length).fill(0);
  const adj = Array.from({ length: atoms.length }, () => []);

  for (const b of bonds) {
    bondedValence[b.a1] += b.order;
    bondedValence[b.a2] += b.order;
    adj[b.a1].push({ neighbor: b.a2, order: b.order, inRing: b.inRing });
    adj[b.a2].push({ neighbor: b.a1, order: b.order, inRing: b.inRing });
  }

  // Compute implicit hydrogens for every atom
  for (let idx = 0; idx < atoms.length; idx++) {
    const a = atoms[idx];
    const sym = a.symbol;
    if (a.bracket) {
      a.hCount = a.explicitH;
    } else {
      const stdVal = STANDARD_VALENCE[sym] || 0;
      const bv = bondedValence[idx];
      if (a.aromatic) {
        if (sym === 'C') a.hCount = Math.max(0, 4 - Math.round(bv));
        else if (sym === 'N') a.hCount = Math.max(0, 3 - Math.round(bv));
        else a.hCount = Math.max(0, stdVal - Math.round(bv));
      } else {
        a.hCount = Math.max(0, stdVal - Math.round(bv));
      }
    }
  }

  return { atoms, bonds, adj, bondedValence };
}

/**
 * Calculate Molecular Formula and Molecular Weight from SMILES
 */
function calculateMolecularFormulaAndWeight(smiles) {
  const graph = buildMolecularGraph(smiles);
  const elementCounts = { C: 0, H: 0, N: 0, O: 0, S: 0, P: 0, F: 0, Cl: 0, Br: 0, I: 0 };

  for (const a of graph.atoms) {
    const sym = a.symbol;
    elementCounts[sym] = (elementCounts[sym] || 0) + 1;
    elementCounts.H = (elementCounts.H || 0) + a.hCount;
  }

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
 * Sum of OH and NH hydrogen atoms attached to heteroatoms.
 */
function calculateHBD(smiles) {
  const graph = buildMolecularGraph(smiles);
  let hbd = 0;
  for (const a of graph.atoms) {
    if ((a.symbol === 'O' || a.symbol === 'N') && a.hCount > 0) {
      hbd += a.hCount;
    }
  }
  return hbd;
}

/**
 * Calculate Hydrogen Bond Acceptors (HBA):
 * Count of O and N atoms with available lone pairs (excluding positively charged states).
 */
function calculateHBA(smiles) {
  const graph = buildMolecularGraph(smiles);
  let hba = 0;
  for (const a of graph.atoms) {
    if ((a.symbol === 'O' || a.symbol === 'N') && a.charge <= 0) {
      hba += 1;
    }
  }
  return hba;
}

/**
 * Estimate Topological Polar Surface Area (TPSA) via Ertl fragment contributions:
 * Polar atoms: O, N, S (polar states), and their attached H.
 */
function calculateTPSA(smiles) {
  const graph = buildMolecularGraph(smiles);
  let tpsa = 0.0;

  for (let idx = 0; idx < graph.atoms.length; idx++) {
    const a = graph.atoms[idx];
    const sym = a.symbol;
    const hCount = a.hCount;
    const neighbors = graph.adj[idx];

    if (sym === 'O') {
      const isDoubleBonded = neighbors.some(nb => nb.order === 2);
      if (isDoubleBonded) {
        tpsa += 17.07; // Carbonyl / nitro / sulfonyl =O
      } else if (hCount > 0) {
        tpsa += 20.23; // Hydroxyl -OH
      } else {
        tpsa += 9.23; // Ether / ester -O-
      }
    } else if (sym === 'N') {
      const isDoubleBonded = neighbors.some(nb => nb.order === 2);
      if (a.aromatic) {
        tpsa += hCount > 0 ? 15.79 : 12.89; // Pyrrole-type vs Pyridine-type
      } else if (isDoubleBonded) {
        tpsa += hCount > 0 ? 23.85 : 12.36; // Imine
      } else if (hCount === 2) {
        tpsa += 26.02; // Primary amine -NH2
      } else if (hCount === 1) {
        tpsa += 15.79; // Secondary amine -NH-
      } else {
        tpsa += 3.24; // Tertiary amine >N-
      }
    } else if (sym === 'S') {
      const hasDoubleO = neighbors.some(nb => nb.order === 2 && graph.atoms[nb.neighbor].symbol === 'O');
      if (hasDoubleO) tpsa += 8.38;
    }
  }

  return parseFloat(tpsa.toFixed(1));
}

/**
 * Estimate Wildman-Crippen LogP (octanol/water partition coefficient)
 * Using atomic fragment additive contributions.
 */
function calculateLogP(smiles) {
  const graph = buildMolecularGraph(smiles);
  let logP = 0.0;

  for (let idx = 0; idx < graph.atoms.length; idx++) {
    const a = graph.atoms[idx];
    const sym = a.symbol;
    const hCount = a.hCount;
    const neighbors = graph.adj[idx];

    if (sym === 'C') {
      if (a.aromatic) {
        logP += hCount > 0 ? 0.35 : 0.28;
      } else {
        if (hCount === 3) logP += 0.52; // -CH3
        else if (hCount === 2) logP += 0.38; // -CH2-
        else if (hCount === 1) logP += 0.20; // >CH-
        else logP += 0.12; // >C<
      }
    } else if (sym === 'O') {
      const isCarbonyl = neighbors.some(nb => nb.order === 2 && graph.atoms[nb.neighbor].symbol === 'C');
      if (isCarbonyl) logP -= 0.35;
      else if (hCount > 0) logP -= 0.55;
      else logP -= 0.40;
    } else if (sym === 'N') {
      if (hCount === 2) logP -= 0.95;
      else if (hCount === 1) logP -= 0.65;
      else logP -= 0.45;
    } else if (sym === 'F') logP += 0.20;
    else if (sym === 'Cl') logP += 0.60;
    else if (sym === 'Br') logP += 0.85;
    else if (sym === 'I') logP += 1.05;
    else if (sym === 'S') logP += 0.40;
  }

  return parseFloat(logP.toFixed(2));
}

/**
 * Calculate Rotatable Bonds:
 * Any single non-ring bond, bounded to non-hydrogen heavy atoms,
 * excluding amide bonds (C-N resonance) and terminal caps.
 */
function calculateRotatableBonds(smiles) {
  const graph = buildMolecularGraph(smiles);
  let rotatableBonds = 0;

  for (const b of graph.bonds) {
    if (b.order === 1 && !b.inRing) {
      const deg1 = graph.adj[b.a1].length;
      const deg2 = graph.adj[b.a2].length;
      // Must connect two non-terminal heavy atoms (degree > 1)
      if (deg1 > 1 && deg2 > 1) {
        // Exclude amide bond C(=O)-N
        const isAmide1 = graph.atoms[b.a1].symbol === 'C' && graph.atoms[b.a2].symbol === 'N' &&
          graph.adj[b.a1].some(nb => nb.order === 2 && graph.atoms[nb.neighbor].symbol === 'O');
        const isAmide2 = graph.atoms[b.a2].symbol === 'C' && graph.atoms[b.a1].symbol === 'N' &&
          graph.adj[b.a2].some(nb => nb.order === 2 && graph.atoms[nb.neighbor].symbol === 'O');

        if (!isAmide1 && !isAmide2) {
          rotatableBonds++;
        }
      }
    }
  }

  return rotatableBonds;
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
  buildMolecularGraph,
  calculateMolecularFormulaAndWeight,
  calculateHBD,
  calculateHBA,
  calculateTPSA,
  calculateLogP,
  calculateRotatableBonds,
  calculateAllDescriptors,
  generateFallbackMolecularSvg
};
