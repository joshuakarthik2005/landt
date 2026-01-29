import React, { useState } from 'react';
import { useAnalysisStore } from './store/analysisStore';
import FileUpload from './components/FileUpload';
import GraphViewer from './components/GraphViewer';
import AnomalyList from './components/AnomalyList';
import MetricsDashboard from './components/MetricsDashboard';
import FormulaExplorer from './components/FormulaExplorer';
import FormulaOptimization from './components/FormulaOptimization';
import ComplexityChart from './components/ComplexityChart';
import CostDriverList from './components/CostDriverList';
import { Activity, GitGraph, FileSpreadsheet, Layers, Maximize, AlertCircle, Target } from 'lucide-react';
import './App.css';
import './components/LandingFeatures.css';

function App() {
    const { analysisResult, loading, error, reset: resetAnalysis } = useAnalysisStore();
    const [activeTab, setActiveTab] = useState('graph');
    const [selectedNode, setSelectedNode] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [nodeFilter, setNodeFilter] = useState('all'); // 'all', 'input', 'formula', 'output'
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const [sidebarTab, setSidebarTab] = useState('formulas'); // Track sidebar tab state

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="logo-container">
                    <div className="logo-icon"><Activity size={24} /></div>
                    <div className="logo-text">
                        <h1>Formula Intelligence</h1>
                        <span className="subtitle">Enterprise Excel Analysis Suite</span>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="action-btn"
                        onClick={() => {
                            if (!analysisResult) return;
                            const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'formula-intelligence-report.json';
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                    >
                        Export Report
                    </button>
                    <button
                        className="action-btn primary"
                        onClick={resetAnalysis}
                    >
                        New Analysis
                    </button>
                </div>
            </header>

            <main className="app-content">
                {!analysisResult && !loading && (
                    <div className="upload-section">
                        <div className="hero-text">
                            <h2>Visualize & Optimize Your Financial Models</h2>
                            <p>Drag and drop your Excel file to instantly map dependencies, detect circular references, and analyze formula complexity.</p>
                        </div>
                        
                        {/* Feature Cards */}
                        <div className="features-grid">
                            <div className="feature-card">
                                <GitGraph className="feature-icon" size={32} />
                                <h3>Dependency Mapping</h3>
                                <p>Visualize how formulas connect across sheets with interactive graphs</p>
                            </div>
                            <div className="feature-card">
                                <Target className="feature-icon" size={32} />
                                <h3>Cost Driver Analysis</h3>
                                <p>Identify key cells that impact your bottom line using graph algorithms</p>
                            </div>
                            <div className="feature-card">
                                <AlertCircle className="feature-icon" size={32} />
                                <h3>Anomaly Detection</h3>
                                <p>Find broken references, circular dependencies, and hard-coded values</p>
                            </div>
                            <div className="feature-card">
                                <Layers className="feature-icon" size={32} />
                                <h3>Formula Optimization</h3>
                                <p>Discover unused formulas and optimize complex calculations</p>
                            </div>
                        </div>

                        {/* Upload and Demo Section Side by Side */}
                        <div className="upload-demo-container">
                            <div className="upload-column">
                                <h3>Upload Your Excel File</h3>
                                <FileUpload />
                            </div>
                            
                            <div className="demo-column">
                                <h3>See It In Action</h3>
                                <p>Watch how Formula Intelligence transforms your Excel analysis</p>
                                <div className="video-container">
                                    <video 
                                        controls 
                                        preload="metadata"
                                        poster=""
                                        className="demo-video"
                                    >
                                        <source src="/lt.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            </div>
                        </div>

                        {/* Sample Data Section */}
                        <div className="sample-section">
                            <div className="divider">
                                <span>or</span>
                            </div>
                            <button className="sample-btn" onClick={() => {
                                // Create a mock sample file trigger
                                const sampleInfo = document.createElement('div');
                                sampleInfo.className = 'sample-info';
                                sampleInfo.innerHTML = `
                                    <p><strong>💡 Try our sample Excel file!</strong></p>
                                    <p>Download the pre-built sample workbook with formulas, cross-sheet references, and intentional errors to explore all features.</p>
                                `;
                                document.querySelector('.sample-section').appendChild(sampleInfo);
                            }}>
                                <FileSpreadsheet size={20} />
                                Try Sample Excel File
                            </button>
                        </div>

                        {/* Stats Section */}
                        <div className="stats-section">
                            <div className="stat-item">
                                <div className="stat-number">100k+</div>
                                <div className="stat-label">Formulas Analyzed</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">10x</div>
                                <div className="stat-label">Faster than Manual</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">50+</div>
                                <div className="stat-label">Sheets Supported</div>
                            </div>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="loading-overlay">
                        <div className="loader"></div>
                        <p>Analyzing model structure...</p>
                        <span className="loading-detail">Parsing formulas & building dependency graph</span>
                    </div>
                )}

                {error && (
                    <div className="error-overlay">
                        <AlertCircle size={48} className="text-red-500 mb-4" />
                        <h3>Analysis Failed</h3>
                        <p>{error}</p>
                        <button className="retry-btn" onClick={resetAnalysis}>Try Again</button>
                    </div>
                )}

                {analysisResult && (
                    <div className="dashboard-grid">
                        {/* Top Metrics Bar */}
                        <div className="metrics-area">
                            <MetricsDashboard />
                        </div>

                        {/* Main Analysis Area - Grid Layout */}
                        <div className="analysis-layout">
                            {/* Left Panel: Navigation & Lists */}
                            <div className={`side-panel ${leftPanelOpen ? 'open' : 'closed'}`}>
                                <button
                                    className="panel-toggle left"
                                    onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                                    title={leftPanelOpen ? 'Close sidebar' : 'Open sidebar'}
                                >
                                    {leftPanelOpen ? '«' : '»'}
                                </button>

                                {/* Top Section: Navigation Tabs */}
                                <div className="sidebar-top-section">
                                    <div className="nav-tabs">
                                        <button
                                            className={`nav-tab ${activeTab === 'graph' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('graph')}
                                        >
                                            <GitGraph size={16} /> Map
                                        </button>
                                        <button
                                            className={`nav-tab ${activeTab === 'anomalies' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('anomalies')}
                                        >
                                            <AlertCircle size={16} /> Anomalies
                                            {analysisResult.anomalies?.total_count > 0 &&
                                                <span className="badge">{analysisResult.anomalies.total_count}</span>
                                            }
                                        </button>
                                        <button
                                            className={`nav-tab ${activeTab === 'drivers' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('drivers')}
                                        >
                                            <Target size={16} /> Drivers
                                        </button>
                                        <button
                                            className={`nav-tab ${activeTab === 'explorer' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('explorer')}
                                        >
                                            <FileSpreadsheet size={16} /> Formulas
                                        </button>
                                        <button
                                            className={`nav-tab ${activeTab === 'complexity' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('complexity')}
                                        >
                                            <Activity size={16} /> Complexity
                                        </button>
                                    </div>
                                </div>

                                {/* Bottom Section: Workbook Structure */}
                                <div className="sidebar-bottom-section">
                                    <FormulaExplorer
                                        graph={analysisResult.graph}
                                        onTabChange={setSidebarTab}
                                    />
                                </div>
                            </div>

                            {/* Center Panel: Visualization */}
                            <div className="main-panel">
                                {activeTab === 'graph' && (
                                    <div className="graph-container-wrapper">
                                        <div className="panel-header">
                                            <h3><GitGraph size={20} /> Interactive Dependency Map</h3>
                                            <div className="graph-toolbar">
                                                <button title="Fit to Screen"><Maximize size={16} /></button>
                                                <button title="Layer View"><Layers size={16} /></button>
                                            </div>
                                        </div>
                                        <GraphViewer onNodeClick={setSelectedNode} />
                                    </div>
                                )}

                                {activeTab === 'anomalies' && <AnomalyList />}

                                {activeTab === 'drivers' && <CostDriverList />}

                                {activeTab === 'explorer' && (
                                    <div className="full-explorer-view">
                                        {sidebarTab === 'formulas' ? (
                                            <FormulaOptimization graph={analysisResult.graph} />
                                        ) : (
                                            <div className="explorer-placeholder">
                                                <h3>Select a formula from the sidebar to view details</h3>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'complexity' && (
                                    <div className="complexity-view">
                                        <ComplexityChart graph={analysisResult.graph} />
                                    </div>
                                )}
                            </div>

                            {/* Right Panel: Node Browser (only on graph view) */}
                            {activeTab === 'graph' && (
                                <div className={`details-panel ${rightPanelOpen ? 'open' : 'closed'}`}>
                                    <button
                                        className="panel-toggle right"
                                        onClick={() => setRightPanelOpen(!rightPanelOpen)}
                                        title={rightPanelOpen ? 'Close browser' : 'Open browser'}
                                    >
                                        {rightPanelOpen ? '»' : '«'}
                                    </button>
                                    <div className="panel-header">
                                        <div className="header-title-row">
                                            <h3>Cell Explorer</h3>
                                            <span className="header-subtitle">Details & Dependencies</span>
                                        </div>
                                        <div className="node-search">
                                            <input
                                                type="text"
                                                placeholder="Search nodes..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="search-input"
                                            />
                                        </div>
                                        <div className="node-filters">
                                            <button
                                                className={`filter-btn ${nodeFilter === 'all' ? 'active' : ''}`}
                                                onClick={() => setNodeFilter('all')}
                                            >
                                                All ({analysisResult.graph.nodes.length})
                                            </button>
                                            <button
                                                className={`filter-btn ${nodeFilter === 'input' ? 'active' : ''}`}
                                                onClick={() => setNodeFilter('input')}
                                            >
                                                Inputs ({analysisResult.graph.nodes.filter(n => n.is_input).length})
                                            </button>
                                            <button
                                                className={`filter-btn ${nodeFilter === 'formula' ? 'active' : ''}`}
                                                onClick={() => setNodeFilter('formula')}
                                            >
                                                Formulas ({analysisResult.graph.nodes.filter(n => n.has_formula).length})
                                            </button>
                                        </div>
                                    </div>

                                    <div className="nodes-list">
                                        {analysisResult.graph.nodes
                                            .filter(node => {
                                                // Filter by type
                                                if (nodeFilter === 'input' && !node.is_input) return false;
                                                if (nodeFilter === 'formula' && !node.has_formula) return false;

                                                // Filter by search query
                                                if (searchQuery) {
                                                    const query = searchQuery.toLowerCase();
                                                    return (
                                                        node.id.toLowerCase().includes(query) ||
                                                        (node.formula && node.formula.toLowerCase().includes(query)) ||
                                                        (node.value && String(node.value).toLowerCase().includes(query))
                                                    );
                                                }
                                                return true;
                                            })
                                            .map(node => (
                                                <div
                                                    key={node.id}
                                                    className={`node-card ${selectedNode?.id === node.id ? 'selected' : ''}`}
                                                    onClick={() => setSelectedNode(node)}
                                                >
                                                    <div className="node-card-header">
                                                        <div className="node-card-id">{node.id}</div>
                                                        <div className="node-card-badges">
                                                            {node.is_input && <span className="mini-badge input">I</span>}
                                                            {node.has_formula && <span className="mini-badge formula">F</span>}
                                                            {node.is_output && <span className="mini-badge output">O</span>}
                                                        </div>
                                                    </div>

                                                    {node.formula && (
                                                        <div className="node-card-formula">
                                                            <code>{node.formula}</code>
                                                        </div>
                                                    )}

                                                    {node.value && String(node.value).trim() && (
                                                        <div className="node-card-value">
                                                            Value: <strong>{node.value}</strong>
                                                        </div>
                                                    )}

                                                    <div className="node-card-meta">
                                                        <span>{node.sheet}</span>
                                                        <span className="node-deps">
                                                            ↓{analysisResult.graph.edges.filter(e => e.target === node.id).length}
                                                            {' '}
                                                            ↑{analysisResult.graph.edges.filter(e => e.source === node.id).length}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                        {analysisResult.graph.nodes.filter(node => {
                                            if (nodeFilter === 'input' && !node.is_input) return false;
                                            if (nodeFilter === 'formula' && !node.has_formula) return false;
                                            if (searchQuery) {
                                                const query = searchQuery.toLowerCase();
                                                return (
                                                    node.id.toLowerCase().includes(query) ||
                                                    (node.formula && node.formula.toLowerCase().includes(query)) ||
                                                    (node.value && String(node.value).toLowerCase().includes(query))
                                                );
                                            }
                                            return true;
                                        }).length === 0 && (
                                                <div className="no-results">
                                                    <p>No nodes found</p>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
