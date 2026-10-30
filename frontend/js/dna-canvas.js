/**
 * PharmaScreen AI - Animated Background: 3D DNA Double Helix & Floating Chemical Molecules
 * HTML5 Canvas rendering of:
 * 1. Floating chemical molecular structures (Benzene rings, Purines, Aspirin, Pyridines, Alkyl chains)
 *    with authentic valence bonds (single and double bonds) and 3D-shaded atom nodes in electric blue.
 * 2. Interactive 3D rotating DNA double helix with continuous flowing backbones and hydrogen rungs.
 * NOTE: The old round ambient bubble/particle dots have been completely removed per design request.
 */

(function () {
  const canvas = document.getElementById('dnaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // =========================================================================
  // 1. MOLECULAR ARCHETYPES (Chemical Structures)
  // =========================================================================
  const MOLECULE_TEMPLATES = [
    // Template 0: Benzene / Phenol Ring (Hexagon with alternating double bonds + OH branch)
    {
      atoms: [
        { x: 30 * Math.cos(0), y: 30 * Math.sin(0), type: 'C' },
        { x: 30 * Math.cos(Math.PI / 3), y: 30 * Math.sin(Math.PI / 3), type: 'C' },
        { x: 30 * Math.cos((2 * Math.PI) / 3), y: 30 * Math.sin((2 * Math.PI) / 3), type: 'C' },
        { x: 30 * Math.cos(Math.PI), y: 30 * Math.sin(Math.PI), type: 'C' },
        { x: 30 * Math.cos((4 * Math.PI) / 3), y: 30 * Math.sin((4 * Math.PI) / 3), type: 'C' },
        { x: 30 * Math.cos((5 * Math.PI) / 3), y: 30 * Math.sin((5 * Math.PI) / 3), type: 'C' },
        { x: 54, y: 0, type: 'O' } // Functional hydroxyl oxygen
      ],
      bonds: [
        { a1: 0, a2: 1, order: 2 },
        { a1: 1, a2: 2, order: 1 },
        { a1: 2, a2: 3, order: 2 },
        { a1: 3, a2: 4, order: 1 },
        { a1: 4, a2: 5, order: 2 },
        { a1: 5, a2: 0, order: 1 },
        { a1: 0, a2: 6, order: 1 }
      ]
    },

    // Template 1: Fused Purine / Caffeine Bicyclic Ring Core
    {
      atoms: [
        { x: -18, y: -30, type: 'C' },
        { x: 18, y: -30, type: 'N' },
        { x: 36, y: 0, type: 'C' },
        { x: 18, y: 30, type: 'C' },
        { x: -18, y: 30, type: 'N' },
        { x: -36, y: 0, type: 'C' },
        { x: 56, y: 18, type: 'N' },
        { x: 68, y: -8, type: 'C' },
        { x: 56, y: -26, type: 'N' },
        { x: -28, y: -50, type: 'O' }, // Carbonyl =O
        { x: -28, y: 50, type: 'O' }   // Carbonyl =O
      ],
      bonds: [
        { a1: 0, a2: 1, order: 1 },
        { a1: 1, a2: 2, order: 2 },
        { a1: 2, a2: 3, order: 1 },
        { a1: 3, a2: 4, order: 2 },
        { a1: 4, a2: 5, order: 1 },
        { a1: 5, a2: 0, order: 2 },
        { a1: 2, a2: 8, order: 1 },
        { a1: 8, a2: 7, order: 2 },
        { a1: 7, a2: 6, order: 1 },
        { a1: 6, a2: 3, order: 1 },
        { a1: 0, a2: 9, order: 2 },
        { a1: 4, a2: 10, order: 2 }
      ]
    },

    // Template 2: Aspirin / Acetylsalicylic Acid
    {
      atoms: [
        { x: -30, y: -15, type: 'C' },
        { x: 0, y: -30, type: 'C' },
        { x: 30, y: -15, type: 'C' },
        { x: 30, y: 15, type: 'C' },
        { x: 0, y: 30, type: 'C' },
        { x: -30, y: 15, type: 'C' },
        { x: 0, y: -55, type: 'C' },  // Carboxyl carbon
        { x: -22, y: -68, type: 'O' }, // =O
        { x: 22, y: -68, type: 'O' },  // -OH
        { x: 52, y: -26, type: 'O' },  // Ester oxygen
        { x: 74, y: -12, type: 'C' },  // Acetyl carbon
        { x: 78, y: 14, type: 'O' },   // =O
        { x: 96, y: -28, type: 'C' }   // -CH3 methyl
      ],
      bonds: [
        { a1: 0, a2: 1, order: 2 },
        { a1: 1, a2: 2, order: 1 },
        { a1: 2, a2: 3, order: 2 },
        { a1: 3, a2: 4, order: 1 },
        { a1: 4, a2: 5, order: 2 },
        { a1: 5, a2: 0, order: 1 },
        { a1: 1, a2: 6, order: 1 },
        { a1: 6, a2: 7, order: 2 },
        { a1: 6, a2: 8, order: 1 },
        { a1: 2, a2: 9, order: 1 },
        { a1: 9, a2: 10, order: 1 },
        { a1: 10, a2: 11, order: 2 },
        { a1: 10, a2: 12, order: 1 }
      ]
    },

    // Template 3: Branched Alkyl/Peptide Chemical Backbone
    {
      atoms: [
        { x: -60, y: 12, type: 'N' },
        { x: -30, y: -12, type: 'C' },
        { x: 0, y: 12, type: 'C' },
        { x: 0, y: 36, type: 'O' }, // =O
        { x: 30, y: -12, type: 'N' },
        { x: 60, y: 12, type: 'C' },
        { x: 90, y: -12, type: 'C' },
        { x: 90, y: -36, type: 'O' }, // =O
        { x: 112, y: 4, type: 'O' },  // -OH
        { x: -30, y: -36, type: 'C' }, // Branch 1 (Methyl)
        { x: 60, y: 36, type: 'C' }   // Branch 2 (Methyl)
      ],
      bonds: [
        { a1: 0, a2: 1, order: 1 },
        { a1: 1, a2: 2, order: 1 },
        { a1: 2, a2: 3, order: 2 },
        { a1: 2, a2: 4, order: 1 },
        { a1: 4, a2: 5, order: 1 },
        { a1: 5, a2: 6, order: 1 },
        { a1: 6, a2: 7, order: 2 },
        { a1: 6, a2: 8, order: 1 },
        { a1: 1, a2: 9, order: 1 },
        { a1: 5, a2: 10, order: 1 }
      ]
    },

    // Template 4: Pyridine / Heteroaromatic with Amide (Nicotinamide Fragment)
    {
      atoms: [
        { x: 0, y: -30, type: 'C' },
        { x: 26, y: -15, type: 'C' },
        { x: 26, y: 15, type: 'C' },
        { x: 0, y: 30, type: 'N' },
        { x: -26, y: 15, type: 'C' },
        { x: -26, y: -15, type: 'C' },
        { x: 52, y: -28, type: 'C' },  // Amide carbon
        { x: 56, y: -52, type: 'O' },  // =O
        { x: 74, y: -16, type: 'N' }   // -NH2
      ],
      bonds: [
        { a1: 0, a2: 1, order: 2 },
        { a1: 1, a2: 2, order: 1 },
        { a1: 2, a2: 3, order: 2 },
        { a1: 3, a2: 4, order: 1 },
        { a1: 4, a2: 5, order: 2 },
        { a1: 5, a2: 0, order: 1 },
        { a1: 1, a2: 6, order: 1 },
        { a1: 6, a2: 7, order: 2 },
        { a1: 6, a2: 8, order: 1 }
      ]
    },

    // Template 5: 5-Membered Heterocycle (Furan / Oxazole) with Two Branches
    {
      atoms: [
        { x: 0, y: -26, type: 'O' },
        { x: 25, y: -8, type: 'C' },
        { x: 15, y: 25, type: 'C' },
        { x: -15, y: 25, type: 'C' },
        { x: -25, y: -8, type: 'C' },
        { x: 48, y: -16, type: 'C' }, // Branch 1
        { x: -48, y: -16, type: 'C' } // Branch 2
      ],
      bonds: [
        { a1: 0, a2: 1, order: 1 },
        { a1: 1, a2: 2, order: 2 },
        { a1: 2, a2: 3, order: 1 },
        { a1: 3, a2: 4, order: 2 },
        { a1: 4, a2: 0, order: 1 },
        { a1: 1, a2: 5, order: 1 },
        { a1: 4, a2: 6, order: 1 }
      ]
    }
  ];

  // =========================================================================
  // 2. INITIALIZE FLOATING MOLECULES
  // =========================================================================
  const floatingMolecules = [];
  const moleculeCount = 14;

  for (let i = 0; i < moleculeCount; i++) {
    const templateIndex = i % MOLECULE_TEMPLATES.length;
    const template = MOLECULE_TEMPLATES[templateIndex];

    floatingMolecules.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.005,
      scale: Math.random() * 0.45 + 0.55, // 0.55 to 1.0 scale
      alpha: Math.random() * 0.25 + 0.35, // 0.35 to 0.60 opacity
      template: template
    });
  }

  // =========================================================================
  // 3. DNA DOUBLE HELIX PARAMETERS
  // =========================================================================
  const basePairsCount = 50;
  const helixRadius = 150;
  const helixSpeed = 0.014;
  const verticalSpacing = 26;
  let rotationAngle = 0;

  // =========================================================================
  // 4. ANIMATION RENDER LOOP
  // =========================================================================
  function render() {
    ctx.clearRect(0, 0, width, height);

    // -----------------------------------------------------------------------
    // A. DRAW FLOATING MOLECULES (No bubble dots)
    // -----------------------------------------------------------------------
    for (let i = 0; i < floatingMolecules.length; i++) {
      const mol = floatingMolecules[i];

      // Update position & rotation
      mol.x += mol.vx;
      mol.y += mol.vy;
      mol.rotation += mol.vRot;

      // Screen boundary wrap with smooth margin
      const margin = 90;
      if (mol.x < -margin) mol.x = width + margin;
      if (mol.x > width + margin) mol.x = -margin;
      if (mol.y < -margin) mol.y = height + margin;
      if (mol.y > height + margin) mol.y = -margin;

      // Transform atom coordinates
      const cosR = Math.cos(mol.rotation);
      const sinR = Math.sin(mol.rotation);
      const transformedAtoms = [];

      for (let j = 0; j < mol.template.atoms.length; j++) {
        const rawAtom = mol.template.atoms[j];
        const scaledX = rawAtom.x * mol.scale;
        const scaledY = rawAtom.y * mol.scale;
        const rotX = scaledX * cosR - scaledY * sinR;
        const rotY = scaledX * sinR + scaledY * cosR;

        transformedAtoms.push({
          x: mol.x + rotX,
          y: mol.y + rotY,
          type: rawAtom.type
        });
      }

      ctx.save();
      ctx.globalAlpha = mol.alpha;

      // 1. Draw Chemical Bonds (Single & Double valence bonds)
      for (let b = 0; b < mol.template.bonds.length; b++) {
        const bond = mol.template.bonds[b];
        const p1 = transformedAtoms[bond.a1];
        const p2 = transformedAtoms[bond.a2];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;

        const nx = -dy / len;
        const ny = dx / len;

        ctx.strokeStyle = '#2563eb';
        ctx.lineCap = 'round';

        if (bond.order === 2) {
          // Double Bond: 2 parallel blue lines
          const offset = 2.4 * mol.scale;
          ctx.lineWidth = 1.4 * mol.scale;

          ctx.beginPath();
          ctx.moveTo(p1.x + nx * offset, p1.y + ny * offset);
          ctx.lineTo(p2.x + nx * offset, p2.y + ny * offset);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p1.x - nx * offset, p1.y - ny * offset);
          ctx.lineTo(p2.x - nx * offset, p2.y - ny * offset);
          ctx.stroke();
        } else {
          // Single Bond: clean solid blue valence line
          ctx.lineWidth = 1.8 * mol.scale;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // 2. Draw Atom Nodes (Ball-and-stick spherical joints)
      for (let a = 0; a < transformedAtoms.length; a++) {
        const atom = transformedAtoms[a];
        let radius = 4.2 * mol.scale;
        let coreColor = '#2563eb';
        let highlightColor = '#93c5fd';

        if (atom.type === 'O') {
          radius = 5.0 * mol.scale;
          coreColor = '#1d4ed8';
          highlightColor = '#bfdbfe';
        } else if (atom.type === 'N') {
          radius = 4.6 * mol.scale;
          coreColor = '#3b82f6';
          highlightColor = '#dbeafe';
        }

        ctx.beginPath();
        ctx.arc(atom.x, atom.y, radius, 0, Math.PI * 2);

        const atomGrad = ctx.createRadialGradient(
          atom.x - radius * 0.35,
          atom.y - radius * 0.35,
          radius * 0.15,
          atom.x,
          atom.y,
          radius
        );
        atomGrad.addColorStop(0, highlightColor);
        atomGrad.addColorStop(0.5, coreColor);
        atomGrad.addColorStop(1, '#1e3a8a');

        ctx.fillStyle = atomGrad;
        ctx.fill();

        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 0.8 * mol.scale;
        ctx.stroke();
      }

      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // B. DRAW 3D ROTATING DNA DOUBLE HELIX (Right-anchored)
    // -----------------------------------------------------------------------
    const centerX = width > 1100 ? width * 0.84 : width * 0.5;
    const centerY = height * 0.5;
    const totalHelixHeight = basePairsCount * verticalSpacing;
    const startY = centerY - totalHelixHeight / 2;

    rotationAngle += helixSpeed;

    const strand1Points = [];
    const strand2Points = [];

    for (let i = 0; i < basePairsCount; i++) {
      const y = startY + i * verticalSpacing;
      const theta = rotationAngle + (i * 0.26);

      // Strand 1 (Front/Back 3D projection)
      const x1 = centerX + Math.cos(theta) * helixRadius;
      const z1 = Math.sin(theta); // -1 (back) to +1 (front)

      // Strand 2 (Opposite strand, 180 degrees offset)
      const x2 = centerX + Math.cos(theta + Math.PI) * helixRadius;
      const z2 = Math.sin(theta + Math.PI);

      strand1Points.push({ x: x1, y, z: z1 });
      strand2Points.push({ x: x2, y, z: z2 });
    }

    // 1. Draw Connecting Hydrogen Bond Rungs between Strand 1 and Strand 2
    for (let i = 0; i < basePairsCount; i++) {
      const p1 = strand1Points[i];
      const p2 = strand2Points[i];

      const avgZ = (p1.z + p2.z) / 2;
      const bridgeAlpha = Math.max(0.25, (avgZ + 1.2) / 2.2 * 0.85);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#2563eb';
      ctx.globalAlpha = bridgeAlpha;
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 4]); // Dashed hydrogen bonding
      ctx.stroke();
      ctx.setLineDash([]);

      // Midpoint base-pair nucleotide interaction marker
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.beginPath();
      ctx.arc(midX, midY, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = '#1d4ed8';
      ctx.globalAlpha = bridgeAlpha * 0.9;
      ctx.fill();
    }

    // 2. Draw Continuous Backbone Ribbon for Strand 1 (Vibrant Electric Blue)
    ctx.beginPath();
    for (let i = 0; i < strand1Points.length; i++) {
      const pt = strand1Points[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else {
        const prev = strand1Points[i - 1];
        const cX = (prev.x + pt.x) / 2;
        const cY = (prev.y + pt.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cX, cY);
      }
    }
    ctx.strokeStyle = '#2563eb';
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // 3. Draw Continuous Backbone Ribbon for Strand 2 (Deep Royal Blue)
    ctx.beginPath();
    for (let i = 0; i < strand2Points.length; i++) {
      const pt = strand2Points[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else {
        const prev = strand2Points[i - 1];
        const cX = (prev.x + pt.x) / 2;
        const cY = (prev.y + pt.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cX, cY);
      }
    }
    ctx.strokeStyle = '#1d4ed8';
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // 4. Draw 3D Shaded Blue Nucleotide Nodes
    const allNodes = [];
    for (let i = 0; i < basePairsCount; i++) {
      allNodes.push({ ...strand1Points[i], strand: 1 });
      allNodes.push({ ...strand2Points[i], strand: 2 });
    }
    allNodes.sort((a, b) => a.z - b.z); // Render from back to front

    for (const node of allNodes) {
      const scale = (node.z + 2) / 3;
      const radius = 6.2 * scale + 1.2;
      const alpha = Math.max(0.4, (node.z + 1.2) / 2.2 * 0.95);

      ctx.save();
      ctx.globalAlpha = alpha;

      const grad = ctx.createRadialGradient(
        node.x - radius * 0.35,
        node.y - radius * 0.35,
        radius * 0.15,
        node.x,
        node.y,
        radius
      );

      if (node.strand === 1) {
        grad.addColorStop(0, '#93c5fd');
        grad.addColorStop(0.45, '#2563eb');
        grad.addColorStop(1, '#1e40af');
        ctx.shadowColor = '#2563eb';
      } else {
        grad.addColorStop(0, '#60a5fa');
        grad.addColorStop(0.45, '#1d4ed8');
        grad.addColorStop(1, '#172554');
        ctx.shadowColor = '#1d4ed8';
      }

      ctx.shadowBlur = node.z > 0 ? 14 : 4;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = node.strand === 1 ? '#1d4ed8' : '#1e3a8a';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    requestAnimationFrame(render);
  }

  render();
})();
