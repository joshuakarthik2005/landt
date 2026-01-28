import React from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import './MetricsDashboard.css';

function MetricsDashboard() {
    const { analysisResult } = useAnalysisStore();

    if (!analysisResult) return null;

    const metrics = analysisResult.metrics || {};
    const graph = analysisResult.graph || {};
    const nodes = graph.nodes || [];

    // Fallback: Calculate metrics from graph nodes if standard metrics are missing
    const formulaCount = metrics.formula_count || nodes.filter(n => n.has_formula).length || 0;
    const inputCount = metrics.input_count || nodes.filter(n => n.is_input).length || 0;
    const sheetCount = metrics.sheet_count || (new Set(nodes.map(n => n.sheet))).size || 0;

    // Calculate Avg Complexity if missing
    let avgComplexity = metrics.avg_complexity || 0;
    if (!avgComplexity && formulaCount > 0) {
        const totalComplexity = nodes.reduce((sum, node) => {
            if (!node.has_formula || !node.formula) return sum;
            // Rough match of operators
            return sum + (node.formula.match(/[+\-*/^(),:]/g) || []).length;
        }, 0);
        avgComplexity = totalComplexity / formulaCount;
    }

    console.log('Analysis Result:', analysisResult);
    console.log('Calculated Metrics:', { formulaCount, inputCount, sheetCount, avgComplexity });

    // Calculate High Complexity count for consistency with Anomaly List
    const highComplexityCount = nodes.filter(n => {
        if (!n.has_formula || !n.formula) return false;
        const complexity = (n.formula.match(/[+\-*/^(),:]/g) || []).length;
        return complexity > 5;
    }).length;

    const totalAnomalies = (analysisResult.anomalies?.total_count || 0) + highComplexityCount;

    return (
        <div className="metrics-dashboard">
            <h2>Analysis Metrics</h2>
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-content">
                        <span className="metric-value">{graph.metrics?.node_count || graph.nodes?.length || 0}</span>
                        <span className="metric-label">Total Cells</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-content">
                        <span className="metric-value">{graph.metrics?.edge_count || graph.edges?.length || 0}</span>
                        <span className="metric-label">Dependencies</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-content">
                        <span className="metric-value">{formulaCount}</span>
                        <span className="metric-label">Formulas</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-content">
                        <span className="metric-value">{inputCount}</span>
                        <span className="metric-label">Input Cells</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-content">
                        <span className="metric-value">{totalAnomalies}</span>
                        <span className="metric-label">Anomalies</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-content">
                        <span className="metric-value">{analysisResult.cost_drivers?.total_drivers || 0}</span>
                        <span className="metric-label">Cost Drivers</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-content">
                        <span className="metric-value">{sheetCount}</span>
                        <span className="metric-label">Sheets</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-content">
                        <span className="metric-value">
                            {avgComplexity ? avgComplexity.toFixed(2) : '0.00'}
                        </span>
                        <span className="metric-label">Avg Complexity</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MetricsDashboard;
