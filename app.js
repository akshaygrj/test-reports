const jsonInput = document.getElementById('jsonInput');
const processBtn = document.getElementById('processBtn');
const results = document.getElementById('results');

let coverageChart = null;
let typesChart = null;

processBtn.addEventListener('click', handlePaste);

function handlePaste() {
  const btnText = processBtn.querySelector('.btn-text');
  const btnLoading = processBtn.querySelector('.btn-loading');
  
  // Show loading state
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  processBtn.disabled = true;
  
  // Add a small delay for better UX
  setTimeout(() => {
    let json;
    try {
      json = JSON.parse(jsonInput.value);
    } catch (err) {
      showNotification('❌ Invalid JSON! Please paste valid coverage-final.json content.', 'error');
      resetButton();
      return;
    }
    
    if (!json || Object.keys(json).length === 0) {
      showNotification('⚠️ No data found in JSON. Please check your content.', 'warning');
      resetButton();
      return;
    }
    
    const analysis = analyzeCoverage(json);
    renderDashboard(analysis);
    results.style.display = 'block';
    
    // Smooth scroll to results
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Show format-specific success message
    const formatType = json.total ? 'summary format' : 'detailed format';
    showNotification(`✅ Coverage analysis complete! (${formatType})`, 'success');
    resetButton();
  }, 800);
}

function resetButton() {
  const btnText = processBtn.querySelector('.btn-text');
  const btnLoading = processBtn.querySelector('.btn-loading');
  
  btnText.style.display = 'inline';
  btnLoading.style.display = 'none';
  processBtn.disabled = false;
}

function showNotification(message, type) {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

function analyzeCoverage(json) {
  // Check if this is the new format with "total" key
  if (json.total) {
    // New format: direct summary data
    return {
      files: [], // No individual file data in this format
      summary: {
        statements: { 
          total: json.total.statements.total, 
          covered: json.total.statements.covered 
        },
        branches: { 
          total: json.total.branches.total, 
          covered: json.total.branches.covered 
        },
        functions: { 
          total: json.total.functions.total, 
          covered: json.total.functions.covered 
        },
        lines: { 
          total: json.total.lines.total, 
          covered: json.total.lines.covered 
        }
      }
    };
  }

  // Original format: detailed file-by-file data
  const files = [];
  let totalStatements = 0, coveredStatements = 0;
  let totalBranches = 0, coveredBranches = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  let totalLines = 0, coveredLines = 0;

  Object.entries(json).forEach(([filePath, fileData]) => {
    const fileName = filePath.split('/').pop() || filePath;
    
    // Calculate statement coverage
    const statements = fileData.s || {};
    const statementTotal = Object.keys(statements).length;
    const statementCovered = Object.values(statements).filter(count => count > 0).length;
    
    // Calculate branch coverage
    const branches = fileData.b || {};
    let branchTotal = 0, branchCovered = 0;
    Object.values(branches).forEach(branchArray => {
      if (Array.isArray(branchArray)) {
        branchTotal += branchArray.length;
        branchCovered += branchArray.filter(count => count > 0).length;
      }
    });
    
    // Calculate function coverage
    const functions = fileData.f || {};
    const functionTotal = Object.keys(functions).length;
    const functionCovered = Object.values(functions).filter(count => count > 0).length;
    
    // Line coverage (if available)
    let lineTotal = 0, lineCovered = 0;
    if (fileData.lines) {
      lineTotal = fileData.lines.total || 0;
      lineCovered = fileData.lines.covered || 0;
    }

    const fileAnalysis = {
      name: fileName,
      path: filePath,
      statements: { total: statementTotal, covered: statementCovered },
      branches: { total: branchTotal, covered: branchCovered },
      functions: { total: functionTotal, covered: functionCovered },
      lines: { total: lineTotal, covered: lineCovered }
    };

    files.push(fileAnalysis);
    
    totalStatements += statementTotal;
    coveredStatements += statementCovered;
    totalBranches += branchTotal;
    coveredBranches += branchCovered;
    totalFunctions += functionTotal;
    coveredFunctions += functionCovered;
    totalLines += lineTotal;
    coveredLines += lineCovered;
  });

  return {
    files,
    summary: {
      statements: { total: totalStatements, covered: coveredStatements },
      branches: { total: totalBranches, covered: coveredBranches },
      functions: { total: totalFunctions, covered: coveredFunctions },
      lines: { total: totalLines, covered: coveredLines }
    }
  };
}

function renderDashboard(analysis) {
  renderSummaryCards(analysis.summary);
  renderCharts(analysis);
  renderCoverageScore(analysis.summary);
}

function renderSummaryCards(summary) {
  const container = document.getElementById('summaryCards');
  
  const cards = [
    { label: 'Statements', data: summary.statements },
    { label: 'Branches', data: summary.branches },
    { label: 'Functions', data: summary.functions },
    { label: 'Lines', data: summary.lines }
  ];

  container.innerHTML = cards.map(card => {
    const percentage = card.data.total ? ((card.data.covered / card.data.total) * 100).toFixed(1) : '0.0';
    return `
      <div class="summary-card">
        <h3>${card.label}</h3>
        <div class="value">${card.data.covered}/${card.data.total}</div>
        <div class="percentage">${percentage}%</div>
      </div>
    `;
  }).join('');
}

function renderCharts(analysis) {
  // Coverage Distribution Chart (Doughnut)
  const ctx1 = document.getElementById('coverageChart').getContext('2d');
  if (coverageChart) coverageChart.destroy();
  
  const stmtPct = analysis.summary.statements.total ? 
    ((analysis.summary.statements.covered / analysis.summary.statements.total) * 100).toFixed(1) : 0;
  
  coverageChart = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: ['Covered', 'Uncovered'],
      datasets: [{
        data: [analysis.summary.statements.covered, analysis.summary.statements.total - analysis.summary.statements.covered],
        backgroundColor: ['#28a745', '#dc3545'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: `${stmtPct}% Statement Coverage` }
      }
    }
  });

  // Coverage Types Comparison (Bar Chart)
  const ctx2 = document.getElementById('typesChart').getContext('2d');
  if (typesChart) typesChart.destroy();
  
  const calculatePercentage = (covered, total) => total ? ((covered / total) * 100).toFixed(1) : 0;
  
  typesChart = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: ['Statements', 'Branches', 'Functions', 'Lines'],
      datasets: [{
        label: 'Coverage %',
        data: [
          calculatePercentage(analysis.summary.statements.covered, analysis.summary.statements.total),
          calculatePercentage(analysis.summary.branches.covered, analysis.summary.branches.total),
          calculatePercentage(analysis.summary.functions.covered, analysis.summary.functions.total),
          calculatePercentage(analysis.summary.lines.covered, analysis.summary.lines.total)
        ],
        backgroundColor: ['#3498db', '#e74c3c', '#f39c12', '#2ecc71'],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 100 }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderCoverageScore(summary) {
  // Calculate overall coverage percentage
  const stmtPct = summary.statements.total ? 
    (summary.statements.covered / summary.statements.total) * 100 : 0;
  const branchPct = summary.branches.total ? 
    (summary.branches.covered / summary.branches.total) * 100 : 0;
  const funcPct = summary.functions.total ? 
    (summary.functions.covered / summary.functions.total) * 100 : 0;
  const linePct = summary.lines.total ? 
    (summary.lines.covered / summary.lines.total) * 100 : 0;
  
  // Calculate weighted average (statements have higher weight)
  const weights = { stmt: 0.4, branch: 0.3, func: 0.2, line: 0.1 };
  const overallPct = (stmtPct * weights.stmt + branchPct * weights.branch + 
                     funcPct * weights.func + linePct * weights.line);
  
  // Calculate star rating (out of 5)
  const starRating = Math.round((overallPct / 100) * 5);
  
  // Get rating text and color
  const { text, color } = getCoverageRating(overallPct);
  
  // Render score display
  const scoreStars = document.getElementById('scoreStars');
  const scoreText = document.getElementById('scoreText');
  const scorePercentage = document.getElementById('scorePercentage');
  const scoreBreakdown = document.getElementById('scoreBreakdown');
  
  if (scoreStars) {
    const filledStars = '★'.repeat(starRating);
    const emptyStars = '☆'.repeat(5 - starRating);
    scoreStars.innerHTML = filledStars + emptyStars;
  }
  
  if (scoreText) {
    scoreText.textContent = text;
    scoreText.style.color = color;
  }
  
  if (scorePercentage) {
    scorePercentage.textContent = `${overallPct.toFixed(1)}%`;
  }
  
  // Render breakdown
  if (scoreBreakdown) {
    const breakdownData = [
      { label: 'Statements', value: `${summary.statements.covered}/${summary.statements.total}`, percentage: stmtPct },
      { label: 'Branches', value: `${summary.branches.covered}/${summary.branches.total}`, percentage: branchPct },
      { label: 'Functions', value: `${summary.functions.covered}/${summary.functions.total}`, percentage: funcPct },
      { label: 'Lines', value: `${summary.lines.covered}/${summary.lines.total}`, percentage: linePct }
    ];
    
    scoreBreakdown.innerHTML = breakdownData.map(item => {
      const fillColor = getCoverageColor(item.percentage);
      return `
        <div class="breakdown-item">
          <div class="breakdown-label">${item.label}</div>
          <div class="breakdown-value">${item.value}</div>
          <div class="breakdown-percentage">${item.percentage.toFixed(1)}%</div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${item.percentage}%; background: ${fillColor};"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function getCoverageRating(percentage) {
  if (percentage >= 90) {
    return { text: 'Excellent Coverage', color: '#28a745' };
  } else if (percentage >= 80) {
    return { text: 'Good Coverage', color: '#20c997' };
  } else if (percentage >= 70) {
    return { text: 'Fair Coverage', color: '#ffc107' };
  } else if (percentage >= 60) {
    return { text: 'Poor Coverage', color: '#fd7e14' };
  } else {
    return { text: 'Critical - Needs Attention', color: '#dc3545' };
  }
}

function getCoverageColor(percentage) {
  if (percentage >= 80) return '#28a745';
  if (percentage >= 60) return '#ffc107';
  return '#dc3545';
}


