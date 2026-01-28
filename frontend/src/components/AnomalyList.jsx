import React from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import './AnomalyList.css';

function AnomalyList() {
    const { analysisResult } = useAnalysisStore();

    // Extract nodes for complexity calculation since it's not in anomalies list
    const nodes = analysisResult?.graph?.nodes || [];

    // Process anomalies from the flat list returned by backend
    const rawAnomalies = analysisResult?.anomalies?.anomalies || [];
    const total_count = rawAnomalies.length; // Use length of actual list

    // Categorize anomalies
    const circular_refs = rawAnomalies.filter(a => a.type === 'circular_reference').map(a => ({
        cycle: a.metadata?.cycle || [a.cell_address],
        ...a
    }));

    const orphan_nodes = rawAnomalies.filter(a => a.type === 'unused_formula').map(a => ({
        cell_address: a.cell_address,
        sheet: a.sheet,
        has_formula: true,
        ...a
    }));

    const broken_refs = rawAnomalies.filter(a => a.type === 'broken_reference' || a.type === 'missing_dependency');
    const hard_coded = rawAnomalies.filter(a => a.type === 'hard_coded_overwrite');

    // Calculate High Complexity Formulas explicitly from Graph Nodes
    const high_complexity_formulas = nodes.filter(node => {
        if (!node.has_formula || !node.formula) return false;
        const complexity = (node.formula.match(/[+\-*/^(),:]/g) || []).length;
        return complexity > 5; // Threshold for "High"
    }).map(node => ({
        cell_address: node.id,
        formula: node.formula,
        complexity_score: (node.formula.match(/[+\-*/^(),:]/g) || []).length,
        dependency_count: 0 // approximate or look up edges
    }));

    // Recalculate total relevant count for display (including complexity)
    const effectiveTotalCount = total_count + high_complexity_formulas.length;

    const getSeverityClass = (type) => {
        if (type === 'circular_reference' || type === 'broken_reference') return 'severity-high';
        if (type === 'hard_coded_overwrite') return 'severity-medium';
        return 'severity-low';
    };

    // Calculate percentages for visual distribution using effective total
    const circularCount = circular_refs.length;
    const orphanCount = orphan_nodes.length;
    const brokenCount = broken_refs.length;
    const complexityCount = high_complexity_formulas.length;
    const otherCount = total_count - (circularCount + orphanCount + brokenCount);

    const displayTotal = effectiveTotalCount || (analysisResult?.anomalies?.total_count || 0);

    const circularPercent = displayTotal > 0 ? (circularCount / displayTotal) * 100 : 0;
    const orphanPercent = displayTotal > 0 ? (orphanCount / displayTotal) * 100 : 0;
    const complexityPercent = displayTotal > 0 ? (complexityCount / displayTotal) * 100 : 0;
    const brokenPercent = displayTotal > 0 ? (brokenCount / displayTotal) * 100 : 0;

    return (
        <div className="anomaly-list">
            <div className="anomaly-summary">
                <h2>Anomaly Detection Results</h2>

                {/* Visual Distribution Bar */}
                {displayTotal > 0 && (
                    <div className="anomaly-distribution">
                        <div className="distribution-label">Anomaly Distribution</div>
                        <div className="distribution-bar">
                            {circularPercent > 0 && (
                                <div className="distribution-segment severity-high" style={{ width: `${circularPercent}%` }} title={`Circular: ${circularCount}`} />
                            )}
                            {brokenPercent > 0 && (
                                <div className="distribution-segment severity-high" style={{ width: `${brokenPercent}%`, background: '#ef4444' }} title={`Broken Refs: ${brokenCount}`} />
                            )}
                            {complexityPercent > 0 && (
                                <div className="distribution-segment severity-medium" style={{ width: `${complexityPercent}%` }} title={`Complex: ${complexityCount}`} />
                            )}
                            {orphanPercent > 0 && (
                                <div className="distribution-segment severity-low" style={{ width: `${orphanPercent}%` }} title={`Orphan: ${orphanCount}`} />
                            )}
                        </div>
                        <div className="distribution-legend">
                            {circularCount > 0 && <div className="legend-item"><span className="legend-color severity-high"></span><span>Circular</span></div>}
                            {brokenCount > 0 && <div className="legend-item"><span className="legend-color" style={{ background: '#ef4444' }}></span><span>Broken</span></div>}
                            {complexityCount > 0 && <div className="legend-item"><span className="legend-color severity-medium"></span><span>Complex</span></div>}
                            {orphanCount > 0 && <div className="legend-item"><span className="legend-color severity-low"></span><span>Orphan</span></div>}
                        </div>
                    </div>
                )}

                <div className="summary-stats">
                    <div className="stat-card stat-total">
                        <div className="stat-icon"><AlertCircle size={24} /></div>
                        <div className="stat-content">
                            <span className="stat-value">{displayTotal}</span>
                            <span className="stat-label">Total Issues</span>
                        </div>
                    </div>
                    <div className="stat-card stat-high">
                        <div className="stat-icon"><AlertTriangle size={24} /></div>
                        <div className="stat-content">
                            <span className="stat-value">{circularCount + brokenCount}</span>
                            <span className="stat-label">Critical / Errors</span>
                        </div>
                    </div>
                    <div className="stat-card stat-medium">
                        <div className="stat-icon"><AlertCircle size={24} /></div>
                        <div className="stat-content">
                            <span className="stat-value">{complexityCount + hard_coded.length}</span>
                            <span className="stat-label">Warnings</span>
                        </div>
                    </div>
                    <div className="stat-card stat-low">
                        <div className="stat-icon"><Info size={24} /></div>
                        <div className="stat-content">
                            <span className="stat-value">{orphanCount}</span>
                            <span className="stat-label">Info / Cleanup</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Health Score & Top Risk Cells - Side by Side */}
            <div className="insights-grid">
                {/* Workbook Health Score */}
                <div className="health-score-card">
                    <h3 className="insight-title">Workbook Health Score</h3>
                    <div className="health-score-content">
                        <div className="score-gauge">
                            <svg viewBox="0 0 200 120" className="gauge-svg">
                                {/* Background arc */}
                                <path
                                    d="M 20 100 A 80 80 0 0 1 180 100"
                                    fill="none"
                                    stroke="rgba(148, 163, 184, 0.2)"
                                    strokeWidth="20"
                                    strokeLinecap="round"
                                />
                                {/* Colored arc based on score */}
                                <path
                                    d="M 20 100 A 80 80 0 0 1 180 100"
                                    fill="none"
                                    stroke={(() => {
                                        const score = Math.max(0, 100 - (total_count * 10));
                                        if (score >= 80) return '#10b981';
                                        if (score >= 60) return '#f59e0b';
                                        return '#ef4444';
                                    })()}
                                    strokeWidth="20"
                                    strokeLinecap="round"
                                    strokeDasharray={`${Math.max(0, 100 - (total_count * 10)) * 2.51} 251`}
                                    className="score-arc"
                                />
                            </svg>
                            <div className="score-value">
                                <span className="score-number">{Math.max(0, 100 - (total_count * 10))}</span>
                                <span className="score-max">/100</span>
                            </div>
                        </div>
                        <div className="score-details">
                            <div className={`score-status ${(() => {
                                const score = Math.max(0, 100 - (displayTotal * 5));
                                if (score >= 80) return 'status-excellent';
                                if (score >= 60) return 'status-good';
                                if (score >= 40) return 'status-fair';
                                return 'status-poor';
                            })()}`}>
                                {(() => {
                                    const score = Math.max(0, 100 - (displayTotal * 5));
                                    if (score >= 80) return '✓ Excellent';
                                    if (score >= 60) return '⚠ Good';
                                    if (score >= 40) return '⚠ Fair';
                                    return '✗ Needs Attention';
                                })()}
                            </div>
                            <p className="score-description">
                                {(() => {
                                    const score = Math.max(0, 100 - (displayTotal * 5));
                                    if (score >= 80) return 'Your workbook is well-structured with minimal issues.';
                                    if (score >= 60) return 'Some anomalies detected. Review recommended.';
                                    if (score >= 40) return 'Multiple issues found. Action recommended.';
                                    return 'Critical issues detected. Immediate review required.';
                                })()}
                            </p>
                            <div className="score-breakdown">
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Impact:</span>
                                    <span className="breakdown-value">
                                        {(circularCount > 0 || brokenCount > 0) ? 'High' : (complexityCount > 0 || hard_coded.length > 0) ? 'Medium' : 'Low'}
                                    </span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="breakdown-label">Priority:</span>
                                    <span className="breakdown-value">
                                        {(circularCount > 0 || brokenCount > 0) ? 'Urgent' : displayTotal > 0 ? 'Review' : 'None'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Risk Cells Table */}
                <div className="top-risk-card">
                    <h3 className="insight-title">Top Risk Cells</h3>
                    <div className="risk-table-container">
                        {(() => {
                            // Compile all risky cells with severity scores
                            const riskCells = [];

                            // Add circular refs (highest priority)
                            circular_refs?.forEach(ref => {
                                ref.cycle?.forEach(cell => {
                                    riskCells.push({
                                        cell: cell,
                                        type: 'Circular Ref',
                                        severity: 'High',
                                        score: 100,
                                        color: '#ef4444'
                                    });
                                });
                            });

                            // Add broken refs
                            broken_refs?.forEach(ref => {
                                riskCells.push({
                                    cell: ref.cell_address,
                                    type: 'Broken Ref',
                                    severity: 'High',
                                    score: 90,
                                    color: '#ef4444'
                                });
                            });

                            // Add hardcoded
                            hard_coded?.forEach(hc => {
                                riskCells.push({
                                    cell: hc.cell_address,
                                    type: 'Hardcoded',
                                    severity: 'Medium',
                                    score: 60,
                                    color: '#f59e0b'
                                });
                            });

                            // Add complex formulas (medium priority)
                            high_complexity_formulas?.slice(0, 3).forEach(formula => {
                                riskCells.push({
                                    cell: formula.cell_address,
                                    type: 'Complex Formula',
                                    severity: 'Medium',
                                    score: Math.round(formula.complexity_score || 50),
                                    color: '#f59e0b'
                                });
                            });

                            // Add orphan nodes (low priority)
                            orphan_nodes?.slice(0, 2).forEach(node => {
                                riskCells.push({
                                    cell: node.cell_address,
                                    type: 'Orphan Node',
                                    severity: 'Low',
                                    score: 20,
                                    color: '#3b82f6'
                                });
                            });

                            // Sort by score and take top 5
                            const topRisks = riskCells.sort((a, b) => b.score - a.score).slice(0, 5);

                            if (topRisks.length === 0) {
                                return (
                                    <div className="no-risks">
                                        <CheckCircle size={32} className="no-risk-icon" />
                                        <p>No high-risk cells detected</p>
                                        <span className="no-risk-subtext">Your workbook is clean!</span>
                                    </div>
                                );
                            }

                            return (
                                <table className="risk-table">
                                    <thead>
                                        <tr>
                                            <th>Cell</th>
                                            <th>Issue Type</th>
                                            <th>Severity</th>
                                            <th>Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topRisks.map((risk, idx) => (
                                            <tr key={idx} className="risk-row">
                                                <td className="cell-address">{risk.cell}</td>
                                                <td className="issue-type">{risk.type}</td>
                                                <td>
                                                    <span
                                                        className={`severity-pill severity-${risk.severity.toLowerCase()}`}
                                                        style={{ borderColor: risk.color, color: risk.color }}
                                                    >
                                                        {risk.severity}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="risk-bar-container">
                                                        <div
                                                            className="risk-bar"
                                                            style={{
                                                                width: `${risk.score}%`,
                                                                backgroundColor: risk.color
                                                            }}
                                                        />
                                                        <span className="risk-score">{risk.score}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Quick Fix Recommendations & Sheet Impact Analysis */}
            <div className="additional-insights">
                {/* Quick Fix Recommendations */}
                {total_count > 0 && (
                    <div className="recommendations-card">
                        <h3 className="insight-title">
                            <span className="title-icon">💡</span>
                            Quick Fix Recommendations
                        </h3>
                        <div className="recommendations-list">
                            {circular_refs && circular_refs.length > 0 && (
                                <div className="recommendation-item priority-high">
                                    <div className="rec-header">
                                        <AlertTriangle size={20} />
                                        <span className="rec-title">Break Circular References</span>
                                        <span className="rec-badge">High Priority</span>
                                    </div>
                                    <p className="rec-description">
                                        {circular_refs.length} circular reference{circular_refs.length > 1 ? 's' : ''} detected.
                                        These can cause calculation errors and performance issues.
                                    </p>
                                    <div className="rec-action">
                                        <span className="rec-cells">
                                            Affected: {circular_refs.reduce((acc, ref) => acc + (ref.cycle?.length || 0), 0)} cells
                                        </span>
                                    </div>
                                </div>
                            )}

                            {high_complexity_formulas && high_complexity_formulas.length > 0 && (
                                <div className="recommendation-item priority-medium">
                                    <div className="rec-header">
                                        <AlertCircle size={20} />
                                        <span className="rec-title">Simplify Complex Formulas</span>
                                        <span className="rec-badge">Medium Priority</span>
                                    </div>
                                    <p className="rec-description">
                                        {high_complexity_formulas.length} formula{high_complexity_formulas.length > 1 ? 's' : ''} with high complexity.
                                        Consider breaking them into smaller, more maintainable formulas.
                                    </p>
                                    <div className="rec-action">
                                        <span className="rec-cells">
                                            Avg complexity: {(high_complexity_formulas.reduce((acc, f) => acc + (f.complexity_score || 0), 0) / high_complexity_formulas.length).toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {orphan_nodes && orphan_nodes.length > 0 && (
                                <div className="recommendation-item priority-low">
                                    <div className="rec-header">
                                        <Info size={20} />
                                        <span className="rec-title">Review Orphan Nodes</span>
                                        <span className="rec-badge">Low Priority</span>
                                    </div>
                                    <p className="rec-description">
                                        {orphan_nodes.length} cell{orphan_nodes.length > 1 ? 's' : ''} with no dependencies.
                                        These may be unused and can be removed to clean up your workbook.
                                    </p>
                                    <div className="rec-action">
                                        <span className="rec-cells">
                                            Potential cleanup: {orphan_nodes.length} cells
                                        </span>
                                    </div>
                                </div>
                            )}

                            {total_count === 0 && (
                                <div className="no-recommendations">
                                    <CheckCircle size={32} className="no-rec-icon" />
                                    <p>No recommendations needed</p>
                                    <span className="no-rec-subtext">Your workbook is in excellent shape!</span>
                                </div>
                            )}

                            {broken_refs && broken_refs.length > 0 && (
                                <div className="recommendation-item priority-high">
                                    <div className="rec-header">
                                        <AlertTriangle size={20} />
                                        <span className="rec-title">Fix Broken References</span>
                                        <span className="rec-badge">High Priority</span>
                                    </div>
                                    <p className="rec-description">
                                        {broken_refs.length} cell{broken_refs.length > 1 ? 's' : ''} have broken links (#REF!, #NAME!).
                                        These cause calculation errors throughout the model.
                                    </p>
                                    <div className="rec-action">
                                        <span className="rec-cells">
                                            Action: Check external links and deleted ranges
                                        </span>
                                    </div>
                                </div>
                            )}

                            {hard_coded && hard_coded.length > 0 && (
                                <div className="recommendation-item priority-medium">
                                    <div className="rec-header">
                                        <AlertCircle size={20} />
                                        <span className="rec-title">Remove Overwrites</span>
                                        <span className="rec-badge">Medium Priority</span>
                                    </div>
                                    <p className="rec-description">
                                        {hard_coded.length} cell{hard_coded.length > 1 ? 's' : ''} contain hardcoded values in formula rows.
                                        This breaks model consistency.
                                    </p>
                                    <div className="rec-action">
                                        <span className="rec-cells">
                                            Action: Restore formulas
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Fallback for other anomalies not categorized */}
                            {total_count > (circular_refs?.length || 0) + (high_complexity_formulas?.length || 0) + (orphan_nodes?.length || 0) && (
                                <div className="recommendation-item priority-medium">
                                    <div className="rec-header">
                                        <AlertTriangle size={20} />
                                        <span className="rec-title">General Anomalies</span>
                                        <span className="rec-badge">Review</span>
                                    </div>
                                    <p className="rec-description">
                                        {total_count - ((circular_refs?.length || 0) + (high_complexity_formulas?.length || 0) + (orphan_nodes?.length || 0))} other structural issues detected.
                                        Check detailed report.
                                    </p>
                                    <div className="rec-action">
                                        <span className="rec-cells">
                                            Action: Review Anomaly List
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Sheet Impact Analysis */}
                {total_count > 0 && (
                    <div className="sheet-impact-card">
                        <h3 className="insight-title">
                            <span className="title-icon">📊</span>
                            Impact by Sheet
                        </h3>
                        <div className="sheet-impact-content">
                            {(() => {
                                // Compile anomalies by sheet
                                const sheetMap = new Map();

                                // Add circular refs
                                circular_refs?.forEach(ref => {
                                    ref.cycle?.forEach(cell => {
                                        const sheet = cell.split('!')[0] || 'Unknown';
                                        if (!sheetMap.has(sheet)) {
                                            sheetMap.set(sheet, { circular: 0, complex: 0, orphan: 0, total: 0 });
                                        }
                                        sheetMap.get(sheet).circular++;
                                        sheetMap.get(sheet).total++;
                                    });
                                });

                                // Add complex formulas
                                high_complexity_formulas?.forEach(formula => {
                                    const sheet = formula.cell_address?.split('!')[0] || 'Unknown';
                                    if (!sheetMap.has(sheet)) {
                                        sheetMap.set(sheet, { circular: 0, complex: 0, orphan: 0, total: 0 });
                                    }
                                    sheetMap.get(sheet).complex++;
                                    sheetMap.get(sheet).total++;
                                });

                                // Add orphan nodes
                                orphan_nodes?.forEach(node => {
                                    const sheet = node.sheet || node.cell_address?.split('!')[0] || 'Unknown';
                                    if (!sheetMap.has(sheet)) {
                                        sheetMap.set(sheet, { circular: 0, complex: 0, orphan: 0, broken: 0, hardcoded: 0, total: 0 });
                                    }
                                    const data = sheetMap.get(sheet);
                                    if (!data.orphan) data.orphan = 0;
                                    data.orphan++;
                                    data.total++;
                                });

                                // Add broken refs
                                broken_refs?.forEach(ref => {
                                    const sheet = ref.sheet || ref.cell_address?.split('!')[0] || 'Unknown';
                                    if (!sheetMap.has(sheet)) {
                                        sheetMap.set(sheet, { circular: 0, complex: 0, orphan: 0, broken: 0, hardcoded: 0, total: 0 });
                                    }
                                    const data = sheetMap.get(sheet);
                                    if (!data.broken) data.broken = 0;
                                    data.broken++;
                                    data.total++;
                                });

                                // Add hardcoded
                                hard_coded?.forEach(ref => {
                                    const sheet = ref.sheet || ref.cell_address?.split('!')[0] || 'Unknown';
                                    if (!sheetMap.has(sheet)) {
                                        sheetMap.set(sheet, { circular: 0, complex: 0, orphan: 0, broken: 0, hardcoded: 0, total: 0 });
                                    }
                                    const data = sheetMap.get(sheet);
                                    if (!data.hardcoded) data.hardcoded = 0;
                                    data.hardcoded++;
                                    data.total++;
                                });

                                // Convert to array and sort by total
                                const sheetData = Array.from(sheetMap.entries())
                                    .map(([sheet, counts]) => ({ sheet, ...counts }))
                                    .sort((a, b) => b.total - a.total);

                                if (sheetData.length === 0) {
                                    return (
                                        <div className="no-sheet-impact" style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                                            <p>Anomalies detected but sheet location info unavailable.</p>
                                        </div>
                                    );
                                }

                                const maxTotal = Math.max(...sheetData.map(s => s.total), 1);

                                return (
                                    <div className="sheet-bars">
                                        {sheetData.map((data, idx) => (
                                            <div key={idx} className="sheet-bar-item">
                                                <div className="sheet-name">{data.sheet}</div>
                                                <div className="sheet-bar-wrapper">
                                                    <div className="sheet-bar-stack">
                                                        {data.circular > 0 && (
                                                            <div
                                                                className="sheet-bar-segment seg-circular"
                                                                style={{ width: `${(data.circular / maxTotal) * 100}%` }}
                                                                title={`${data.circular} circular`}
                                                            />
                                                        )}
                                                        {data.complex > 0 && (
                                                            <div
                                                                className="sheet-bar-segment seg-complex"
                                                                style={{ width: `${(data.complex / maxTotal) * 100}%` }}
                                                                title={`${data.complex} complex`}
                                                            />
                                                        )}
                                                        {data.orphan > 0 && (
                                                            <div
                                                                className="sheet-bar-segment seg-orphan"
                                                                style={{ width: `${(data.orphan / maxTotal) * 100}%` }}
                                                                title={`${data.orphan} orphan`}
                                                            />
                                                        )}
                                                        {/* Generic filler for uncategorized anomalies */}
                                                        {data.total > (data.circular + data.complex + data.orphan) && (
                                                            <div
                                                                className="sheet-bar-segment seg-other"
                                                                style={{ width: `${((data.total - (data.circular + data.complex + data.orphan)) / maxTotal) * 100}%`, background: '#94a3b8' }}
                                                                title={`${data.total - (data.circular + data.complex + data.orphan)} other`}
                                                            />
                                                        )}
                                                    </div>
                                                    <span className="sheet-total">{data.total}</span>
                                                </div>
                                                <div className="sheet-breakdown">
                                                    {data.circular > 0 && <span className="breakdown-chip chip-circular">{data.circular} circular</span>}
                                                    {data.complex > 0 && <span className="breakdown-chip chip-complex">{data.complex} complex</span>}
                                                    {data.orphan > 0 && <span className="breakdown-chip chip-orphan">{data.orphan} orphan</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {circular_refs && circular_refs.length > 0 && (
                <div className="anomaly-section">
                    <h3 className="section-title">
                        <span className="severity-badge severity-high">High</span>
                        Circular References
                    </h3>
                    <div className="anomaly-cards">
                        {circular_refs.map((ref, idx) => (
                            <div key={idx} className={`anomaly-card ${getSeverityClass('circular_reference')}`}>
                                <div className="anomaly-header">
                                    <span className="anomaly-type">Circular Reference</span>
                                    <span className="anomaly-count">{ref.cycle?.length || 0} cells</span>
                                </div>
                                <div className="anomaly-content">
                                    <p className="anomaly-description">
                                        Circular dependency detected in formula chain
                                    </p>
                                    <div className="cycle-path">
                                        {ref.cycle?.map((cell, i) => (
                                            <React.Fragment key={i}>
                                                <span className="cell-ref">{cell}</span>
                                                {i < ref.cycle.length - 1 && <span className="arrow">→</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {broken_refs && broken_refs.length > 0 && (
                <div className="anomaly-section">
                    <h3 className="section-title">
                        <span className="severity-badge severity-high">High</span>
                        Broken References
                    </h3>
                    <div className="anomaly-cards">
                        {broken_refs.map((ref, idx) => (
                            <div key={idx} className={`anomaly-card ${getSeverityClass('broken_reference')}`}>
                                <div className="anomaly-header">
                                    <span className="anomaly-type">Broken Reference</span>
                                    <span className="cell-ref">{ref.cell_address}</span>
                                </div>
                                <div className="anomaly-content">
                                    <p className="anomaly-description">{ref.description}</p>
                                    <p className="anomaly-suggestion">Tip: {ref.suggestion}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {hard_coded && hard_coded.length > 0 && (
                <div className="anomaly-section">
                    <h3 className="section-title">
                        <span className="severity-badge severity-medium">Medium</span>
                        Hardcoded Overwrites
                    </h3>
                    <div className="anomaly-cards">
                        {hard_coded.map((ref, idx) => (
                            <div key={idx} className={`anomaly-card ${getSeverityClass('hard_coded_overwrite')}`}>
                                <div className="anomaly-header">
                                    <span className="anomaly-type">Overwrite</span>
                                    <span className="cell-ref">{ref.cell_address}</span>
                                </div>
                                <div className="anomaly-content">
                                    <p className="anomaly-description">{ref.description}</p>
                                    <div className="node-details">
                                        <span>Value: {ref.metadata?.value}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {orphan_nodes && orphan_nodes.length > 0 && (
                <div className="anomaly-section">
                    <h3 className="section-title">
                        <span className="severity-badge severity-low">Low</span>
                        Orphan Nodes
                    </h3>
                    <div className="anomaly-cards">
                        {orphan_nodes.slice(0, 20).map((node, idx) => (
                            <div key={idx} className={`anomaly - card ${getSeverityClass('orphan')} `}>
                                <div className="anomaly-header">
                                    <span className="anomaly-type">Orphan Node</span>
                                    <span className="cell-ref">{node.cell_address}</span>
                                </div>
                                <div className="anomaly-content">
                                    <p className="anomaly-description">
                                        Cell has no dependencies or dependents - may be unused
                                    </p>
                                    <div className="node-details">
                                        <span>Sheet: {node.sheet}</span>
                                        <span>Type: {node.has_formula ? 'Formula' : 'Value'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {orphan_nodes.length > 20 && (
                            <div className="more-items">
                                +{orphan_nodes.length - 20} more orphan nodes
                            </div>
                        )}
                    </div>
                </div>
            )}

            {high_complexity_formulas && high_complexity_formulas.length > 0 && (
                <div className="anomaly-section">
                    <h3 className="section-title">
                        <span className="severity-badge severity-medium">Medium</span>
                        High Complexity Formulas
                    </h3>
                    <div className="anomaly-cards">
                        {high_complexity_formulas.map((formula, idx) => (
                            <div key={idx} className={`anomaly - card ${getSeverityClass('complexity')} `}>
                                <div className="anomaly-header">
                                    <span className="anomaly-type">Complex Formula</span>
                                    <span className="cell-ref">{formula.cell_address}</span>
                                </div>
                                <div className="anomaly-content">
                                    <p className="anomaly-description">
                                        Formula has high complexity score - consider simplifying
                                    </p>
                                    <div className="complexity-metrics">
                                        <div className="metric-item">
                                            <span className="metric-label">Complexity</span>
                                            <span className="metric-value">{formula.complexity_score?.toFixed(2)}</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Dependencies</span>
                                            <span className="metric-value">{formula.dependency_count}</span>
                                        </div>
                                    </div>
                                    {formula.formula && (
                                        <div className="formula-preview">
                                            <code>{formula.formula.substring(0, 100)}{formula.formula.length > 100 ? '...' : ''}</code>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {total_count === 0 && (
                <div className="no-anomalies">
                    <div className="success-icon">✓</div>
                    <h3>No Anomalies Detected</h3>
                    <p>Your workbook appears to be well-structured with no major issues.</p>
                </div>
            )}
        </div>
    );
}

export default AnomalyList;
