import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, FunctionSquare, Search, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import './FormulaExplorer.css';

const FormulaExplorer = ({ graph, onTabChange }) => {
    const [activeTab, setActiveTab] = useState('formulas');
    const [searchTerm, setSearchTerm] = useState('');

    const nodes = graph?.nodes || [];

    // Filter and categorizing nodes
    const { inputs, formulas } = useMemo(() => {
        return nodes.reduce(
            (acc, node) => {
                if (node.is_input === true) {
                    acc.inputs.push(node);
                } else if (node.formula || node.has_formula) {
                    acc.formulas.push(node);
                }
                return acc;
            },
            { inputs: [], formulas: [] }
        );
    }, [nodes]);

    const filteredList = useMemo(() => {
        const list = activeTab === 'inputs' ? inputs : formulas;
        if (!searchTerm) return list;

        return list.filter((node) => {
            const searchLower = searchTerm.toLowerCase();
            return (
                node.id?.toLowerCase().includes(searchLower) ||
                node.formula?.toLowerCase().includes(searchLower) ||
                node.value?.toString().toLowerCase().includes(searchLower)
            );
        });
    }, [activeTab, inputs, formulas, searchTerm]);

    const getComplexity = (formula) => {
        if (!formula) return 0;
        return (formula.match(/[+\-*/^(),:]/g) || []).length;
    };

    // Notify parent when tab changes
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (onTabChange) {
            onTabChange(tab);
        }
    };

    return (
        <div className="formula-explorer-container">
            <div className="fe-header">
                <h3><Activity size={20} /> Workbook Structure</h3>
                <div className="fe-tabs">
                    <button
                        className={`fe-tab ${activeTab === 'inputs' ? 'active' : ''}`}
                        onClick={() => handleTabChange('inputs')}
                    >
                        <FileSpreadsheet size={16} /> Inputs ({inputs.length})
                    </button>
                    <button
                        className={`fe-tab ${activeTab === 'formulas' ? 'active' : ''}`}
                        onClick={() => handleTabChange('formulas')}
                    >
                        <FunctionSquare size={16} /> Formulas ({formulas.length})
                    </button>
                </div>
            </div>

            <div className="fe-search">
                <Search size={16} className="search-icon" />
                <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="fe-list-container">
                {filteredList.length === 0 ? (
                    <div className="fe-empty">No {activeTab} found matching filter.</div>
                ) : (
                    <div className="fe-list">
                        {filteredList.map((node, index) => (
                            <motion.div
                                key={node.id}
                                className="fe-item"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                            >
                                <div className="fe-item-header">
                                    <span className="fe-cell-id">{node.id}</span>
                                    <span className="fe-sheet-badge">{node.sheet}</span>
                                </div>
                                {activeTab === 'formulas' && (
                                    <div className="fe-formula-row">
                                        <span className="fe-equals">=</span>
                                        <code className="fe-formula-text">{node.formula || "N/A"}</code>
                                    </div>
                                )}
                                {activeTab === 'formulas' && (
                                    <div className="fe-complexity-indicator">
                                        Complexity: {getComplexity(node.formula)}
                                    </div>
                                )}
                                {activeTab === 'inputs' && (
                                    <div className="fe-input-details">
                                        Value: <span style={{ color: '#fff', fontWeight: 600 }}>{node.value && String(node.value).trim() ? String(node.value) : "Empty"}</span>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormulaExplorer;
