/**
 * PharmaScreen AI - PubChem PUG REST API Service
 * Handles live molecular property lookups and structure image retrieval with timeout and fallback support.
 */

const chemistryCalculator = require('./chemistryCalculator');

const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const REQUEST_TIMEOUT_MS = 6000;

/**
 * Helper to fetch with timeout using native fetch & AbortController
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PharmaScreen-AI-Research-Prototype/1.0',
        ...(options.headers || {})
      }
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch compound properties and details from PubChem by SMILES
 */
async function getCompoundBySmiles(smiles) {
  if (!smiles) {
    throw new Error('SMILES parameter is required');
  }

  const encodedSmiles = encodeURIComponent(smiles.trim());
  const propertyUrl = `${PUBCHEM_BASE_URL}/compound/smiles/${encodedSmiles}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA,RotatableBondCount,IUPACName,Title,MolecularFormula,CanonicalSMILES/JSON`;
  const structureImageUrl = `${PUBCHEM_BASE_URL}/compound/smiles/${encodedSmiles}/PNG?record_type=2d&image_size=large`;

  try {
    const response = await fetchWithTimeout(propertyUrl);

    if (!response.ok) {
      // 404 or other status: PubChem doesn't have this molecule or bad SMILES
      // Fallback to internal chemistry calculator
      return null;
    }

    const data = await response.json();
    if (!data.PropertyTable || !data.PropertyTable.Properties || data.PropertyTable.Properties.length === 0) {
      return null;
    }

    const prop = data.PropertyTable.Properties[0];

    return {
      cid: prop.CID,
      name: prop.Title || prop.IUPACName || 'Screened Compound',
      iupacName: prop.IUPACName || 'N/A',
      smiles: prop.CanonicalSMILES || smiles,
      formula: prop.MolecularFormula || '',
      molecularWeight: parseFloat(prop.MolecularWeight),
      logP: prop.XLogP !== undefined ? parseFloat(prop.XLogP) : null,
      hbd: prop.HBondDonorCount !== undefined ? parseInt(prop.HBondDonorCount, 10) : 0,
      hba: prop.HBondAcceptorCount !== undefined ? parseInt(prop.HBondAcceptorCount, 10) : 0,
      tpsa: prop.TPSA !== undefined ? parseFloat(prop.TPSA) : 0,
      rotatableBonds: prop.RotatableBondCount !== undefined ? parseInt(prop.RotatableBondCount, 10) : 0,
      structureImageUrl,
      source: 'PubChem PUG REST API'
    };
  } catch (error) {
    // Network timeout, offline, or DNS error -> return null so caller falls back gracefully
    console.warn(`[PubChemService] PUG REST lookup skipped/failed (${error.name}: ${error.message}). Invoking in-silico engine.`);
    return null;
  }
}

/**
 * Fetch compound properties by common name or IUPAC name
 */
async function getCompoundByName(name) {
  if (!name) return null;

  const encodedName = encodeURIComponent(name.trim());
  const propertyUrl = `${PUBCHEM_BASE_URL}/compound/name/${encodedName}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA,RotatableBondCount,IUPACName,Title,MolecularFormula,CanonicalSMILES/JSON`;

  try {
    const response = await fetchWithTimeout(propertyUrl);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.PropertyTable || !data.PropertyTable.Properties || data.PropertyTable.Properties.length === 0) {
      return null;
    }

    const prop = data.PropertyTable.Properties[0];
    const canonicalSmiles = prop.CanonicalSMILES || '';
    const structureImageUrl = canonicalSmiles
      ? `${PUBCHEM_BASE_URL}/compound/smiles/${encodeURIComponent(canonicalSmiles)}/PNG?record_type=2d&image_size=large`
      : null;

    return {
      cid: prop.CID,
      name: prop.Title || name,
      iupacName: prop.IUPACName || 'N/A',
      smiles: canonicalSmiles,
      formula: prop.MolecularFormula || '',
      molecularWeight: parseFloat(prop.MolecularWeight),
      logP: prop.XLogP !== undefined ? parseFloat(prop.XLogP) : null,
      hbd: prop.HBondDonorCount !== undefined ? parseInt(prop.HBondDonorCount, 10) : 0,
      hba: prop.HBondAcceptorCount !== undefined ? parseInt(prop.HBondAcceptorCount, 10) : 0,
      tpsa: prop.TPSA !== undefined ? parseFloat(prop.TPSA) : 0,
      rotatableBonds: prop.RotatableBondCount !== undefined ? parseInt(prop.RotatableBondCount, 10) : 0,
      structureImageUrl,
      source: 'PubChem PUG REST API'
    };
  } catch (error) {
    console.warn(`[PubChemService] Name lookup failed for "${name}": ${error.message}`);
    return null;
  }
}

module.exports = {
  getCompoundBySmiles,
  getCompoundByName
};
