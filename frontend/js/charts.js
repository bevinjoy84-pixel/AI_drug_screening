/**
 * PharmaScreen AI - Lightweight Scientific Canvas Charting
 * Pure HTML5 Canvas chart renderers with zero external library dependencies.
 * Automatically adapts styling to White Theme and Dark Mode.
 */

const PharmaCharts = {
  isDarkTheme() {
    return document.body.classList.contains('theme-dark');
  },

  /**
   * Render a glowing Donut Chart
   */
  drawDonutChart(canvas, segments, title = '') {
    if (!canvas) return;
    const parent = canvas.parentElement;
    const width = canvas.width = (parent && parent.clientWidth > 0) ? parent.clientWidth : 300;
    const height = canvas.height = (parent && parent.clientHeight > 0) ? parent.clientHeight : 220;
    if (width <= 0 || height <= 0) return;
    const ctx = canvas.getContext('2d');
    const isDark = this.isDarkTheme();

    ctx.clearRect(0, 0, width, height);

    const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
    const centerX = width * 0.40;
    const centerY = height * 0.5;
    const outerRadius = Math.min(centerX, centerY) * 0.78;
    const innerRadius = outerRadius * 0.58;

    if (total === 0) {
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', centerX, centerY);
      return;
    }

    let startAngle = -Math.PI / 2;

    for (const seg of segments) {
      if (seg.value === 0) continue;
      const sliceAngle = (seg.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = seg.color;
      ctx.shadowColor = seg.color;
      ctx.shadowBlur = isDark ? 8 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      startAngle = endAngle;
    }

    // Inner center circle (donut hole)
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#0b1120' : '#ffffff';
    ctx.fill();

    // Center total label
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), centerX, centerY - 8);

    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '700 9px Inter, sans-serif';
    ctx.fillText('COMPOUNDS', centerX, centerY + 12);

    // Legend on the right side
    const legendX = width * 0.68;
    let legendY = centerY - (segments.length * 24) / 2 + 10;

    for (const seg of segments) {
      // Color box
      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(legendX, legendY, 11, 11, 3) : ctx.fillRect(legendX, legendY, 11, 11);
      ctx.fill();

      // Label text
      ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
      ctx.font = '600 11.5px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${seg.label} (${seg.value})`, legendX + 16, legendY + 5.5);

      legendY += 26;
    }
  },

  /**
   * Render a sleek glowing Bar Chart
   */
  drawBarChart(canvas, categories, values, options = {}) {
    if (!canvas) return;
    const parent = canvas.parentElement;
    const width = canvas.width = (parent && parent.clientWidth > 0) ? parent.clientWidth : 320;
    const height = canvas.height = (parent && parent.clientHeight > 0) ? parent.clientHeight : 220;
    if (width <= 0 || height <= 0) return;
    const ctx = canvas.getContext('2d');
    const isDark = this.isDarkTheme();

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 20, bottom: 45, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...values, 5);

    // Draw horizontal grid lines
    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(203, 213, 225, 0.7)';
    ctx.lineWidth = 1;
    ctx.fillStyle = isDark ? '#64748b' : '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const yVal = Math.round((maxVal / gridSteps) * i);
      const y = padding.top + chartH - (i / gridSteps) * chartH;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(yVal.toString(), padding.left - 8, y);
    }

    // Draw Bars
    const barCount = categories.length;
    const barWidth = Math.min(38, (chartW / barCount) * 0.65);
    const step = chartW / barCount;

    for (let i = 0; i < barCount; i++) {
      const val = values[i] || 0;
      const barH = (val / maxVal) * chartH;
      const x = padding.left + i * step + (step - barWidth) / 2;
      const y = padding.top + chartH - barH;

      // Gradient fill for bar in vibrant blue
      const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
      grad.addColorStop(0, '#2563eb');
      grad.addColorStop(1, '#1d4ed8');

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(37, 99, 235, 0.4)';
      ctx.shadowBlur = 6;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      } else {
        ctx.fillRect(x, y, barWidth, barH);
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Value label on top of bar
      if (val > 0) {
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(val.toString(), x + barWidth / 2, y - 6);
      }

      // Category label at bottom
      ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(categories[i], x + barWidth / 2, padding.top + chartH + 10);
    }
  },

  /**
   * Render a Lipinski Sweet-Spot Radar Chart
   * Normalizes MW (500), LogP (5), HBD (5), HBA (10), TPSA (140), RotB (10)
   */
  drawRadarChart(canvas, properties) {
    if (!canvas || !properties) return;
    const parent = canvas.parentElement;
    const width = canvas.width = (parent && parent.clientWidth > 0) ? parent.clientWidth : 320;
    const height = canvas.height = (parent && parent.clientHeight > 0) ? parent.clientHeight : 280;
    if (width <= 0 || height <= 0) return;
    const ctx = canvas.getContext('2d');
    const isDark = this.isDarkTheme();

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.72;

    const axes = [
      { name: 'MW', label: `MW (${properties.molecularWeight || 0})`, limit: 500, val: properties.molecularWeight || 0 },
      { name: 'LogP', label: `LogP (${properties.logP !== undefined ? properties.logP : 0})`, limit: 5.0, val: Math.max(0, properties.logP || 0) },
      { name: 'HBD', label: `HBD (${properties.hbd || 0})`, limit: 5, val: properties.hbd || 0 },
      { name: 'HBA', label: `HBA (${properties.hba || 0})`, limit: 10, val: properties.hba || 0 },
      { name: 'TPSA', label: `TPSA (${properties.tpsa || 0})`, limit: 140, val: properties.tpsa || 0 },
      { name: 'RotB', label: `RotB (${properties.rotatableBonds || 0})`, limit: 10, val: properties.rotatableBonds || 0 }
    ];

    const totalAxes = axes.length;

    // Draw concentric web rings
    const rings = 4;
    for (let r = 1; r <= rings; r++) {
      const ringRadius = (radius / rings) * r;
      ctx.beginPath();
      for (let i = 0; i < totalAxes; i++) {
        const angle = (i / totalAxes) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + Math.cos(angle) * ringRadius;
        const y = centerY + Math.sin(angle) * ringRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = isDark
        ? (r === rings ? 'rgba(56, 189, 248, 0.4)' : 'rgba(51, 65, 85, 0.35)')
        : (r === rings ? 'rgba(2, 132, 199, 0.45)' : 'rgba(203, 213, 225, 0.8)');
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw spokes and axis labels
    ctx.font = '600 10.5px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < totalAxes; i++) {
      const angle = (i / totalAxes) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Spoke line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(203, 213, 225, 0.8)';
      ctx.stroke();

      // Label with slight offset
      const labelDist = radius + 22;
      const lx = centerX + Math.cos(angle) * labelDist;
      const ly = centerY + Math.sin(angle) * labelDist;
      ctx.fillText(axes[i].name, lx, ly);
    }

    // Draw Lipinski threshold sweet-spot boundary (normalized limit)
    const sweetSpotRadius = radius * 0.72;
    ctx.beginPath();
    for (let i = 0; i < totalAxes; i++) {
      const angle = (i / totalAxes) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + Math.cos(angle) * sweetSpotRadius;
      const y = centerY + Math.sin(angle) * sweetSpotRadius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.65)' : 'rgba(5, 150, 105, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Candidate polygon
    ctx.beginPath();
    const candidatePoints = [];

    for (let i = 0; i < totalAxes; i++) {
      const axis = axes[i];
      const ratio = Math.min(1.8, Math.max(0.08, axis.val / axis.limit));
      const dist = sweetSpotRadius * ratio;

      const angle = (i / totalAxes) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;
      candidatePoints.push({ x, y, violated: axis.val > axis.limit });

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    ctx.fillStyle = 'rgba(37, 99, 235, 0.20)';
    ctx.fill();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = isDark ? '#00f0ff' : 'rgba(2, 132, 199, 0.4)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw node vertices
    for (const pt of candidatePoints) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = pt.violated ? '#dc2626' : (isDark ? '#00f0ff' : '#0284c7');
      ctx.strokeStyle = isDark ? '#070b14' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }
  }
};

window.PharmaCharts = PharmaCharts;
