import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

const ComplexityChart = ({ graph }) => {
    const nodes = graph?.nodes || [];

    // Analyze complexity distribution
    const data = React.useMemo(() => {
        const buckets = { Simple: 0, Medium: 0, Complex: 0 };

        nodes.forEach(node => {
            if (!node.has_formula) return;

            const complexity = (node.formula.match(/[+\-*/^(),:]/g) || []).length;

            if (complexity <= 2) buckets.Simple++;
            else if (complexity <= 5) buckets.Medium++;
            else buckets.Complex++;
        });

        return [
            { name: 'Simple (1-2 ops)', count: buckets.Simple, fill: '#4ade80' },
            { name: 'Medium (3-5 ops)', count: buckets.Medium, fill: '#60a5fa' },
            { name: 'Complex (>5 ops)', count: buckets.Complex, fill: '#ef4444' }
        ];
    }, [nodes]);

    if (nodes.length === 0) return null;

    return (
        <div className="complexity-chart-container" style={{
            padding: '2rem',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '16px',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            backdropFilter: 'blur(10px)',
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start'
        }}>
            <h3 style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '2rem',
                color: '#e2e8f0',
                fontSize: '1.5rem',
                alignSelf: 'flex-start'
            }}>
                <Activity size={28} className="text-blue-400" />
                Detailed Complexity Distribution
            </h3>

            <div style={{ height: '100%', width: '100%', minHeight: '500px', flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" stroke="#94a3b8" fontSize={14} tick={{ fill: '#cbd5e1' }} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={100} tick={{ fill: '#cbd5e1' }} />
                        <Tooltip
                            contentStyle={{
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            cursor={{ fill: 'rgba(56, 189, 248, 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={40}>
                            {/* define individual fills if needed in data */}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <p style={{
                color: '#94a3b8',
                fontSize: '0.9rem',
                fontSize: '0.9rem',
                marginTop: '1rem',
                textAlign: 'left'
            }}>
                This visual diagram shows the complexity distribution across your workbook formulas.
                <br />Most financial models should aim for a left-skewed distribution (mostly Simple/Medium).
            </p>
        </div>
    );
};

export default ComplexityChart;
