import React from 'react';
import { Target, TrendingUp, Users } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';

const CostDriverList = () => {
    const { analysisResult } = useAnalysisStore();
    const drivers = analysisResult?.cost_drivers?.top_drivers || [];

    if (drivers.length === 0) {
        return (
            <div className="empty-state" style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
                <Target size={48} style={{ opacity: 0.2, marginBottom: '10px' }} />
                <p>No significant cost drivers identified.</p>
            </div>
        );
    }

    return (
        <div className="cost-driver-list" style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
            <h2 style={{
                color: '#e2e8f0',
                marginBottom: '20px',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <Target className="text-blue-500" /> Top Cost Drivers
            </h2>

            <div className="drivers-grid" style={{ display: 'grid', gap: '16px' }}>
                {drivers.map((driver, index) => {
                    // Safely extract values with fallbacks
                    const centralityScore = driver.centrality_score ?? 0;
                    const impactScore = driver.impact_score ?? 0;
                    const dependentCount = driver.dependent_count ?? 0;
                    const description = driver.description || `Affects ${dependentCount} cells`;

                    return (
                        <div key={index} className="driver-card" style={{
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.1)',
                            borderRadius: '12px',
                            padding: '16px',
                            backdropFilter: 'blur(8px)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            cursor: 'pointer'
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                            }}
                        >
                            <div className="driver-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="driver-rank" style={{
                                    background: index < 3 ? '#ef4444' : index < 10 ? '#f59e0b' : '#3b82f6',
                                    color: 'white',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}>
                                    {index + 1}
                                </div>
                                <code style={{
                                    color: '#fbbf24',
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem',
                                    fontFamily: 'monospace'
                                }}>
                                    {driver.cell_address}
                                </code>
                            </div>

                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                {description}
                            </p>

                            <div className="driver-metrics" style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '12px',
                                marginTop: '4px',
                                paddingTop: '12px',
                                borderTop: '1px solid rgba(148, 163, 184, 0.1)'
                            }}>
                                <div className="metric">
                                    <span style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.7rem',
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        marginBottom: '4px'
                                    }}>
                                        <TrendingUp size={12} />
                                        Centrality
                                    </span>
                                    <span style={{
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        color: centralityScore > 0 ? '#60a5fa' : '#475569'
                                    }}>
                                        {centralityScore > 0 ? centralityScore.toFixed(3) : '-'}
                                    </span>
                                </div>
                                <div className="metric">
                                    <span style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.7rem',
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        marginBottom: '4px'
                                    }}>
                                        <Target size={12} />
                                        Impact
                                    </span>
                                    <span style={{
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        color: impactScore > 0 ? '#34d399' : '#475569'
                                    }}>
                                        {impactScore > 0 ? impactScore.toFixed(3) : 'Low'}
                                    </span>
                                </div>
                                <div className="metric">
                                    <span style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.7rem',
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        marginBottom: '4px'
                                    }}>
                                        <Users size={12} />
                                        Affects
                                    </span>
                                    <span style={{
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        color: dependentCount > 0 ? '#a78bfa' : '#475569'
                                    }}>
                                        {dependentCount > 0 ? dependentCount : 'None'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CostDriverList;
