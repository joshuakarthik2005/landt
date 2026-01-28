import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAnalysisStore } from '../store/analysisStore';
import './GraphViewer.css';

const GraphViewer = ({ onNodeClick }) => {
    const { analysisResult } = useAnalysisStore();
    const graphRef = useRef();
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef();
    const [hoveredNode, setHoveredNode] = useState(null);

    // Prepare graph data
    const graphData = useMemo(() => {
        if (!analysisResult?.graph) return { nodes: [], links: [] };

        const nodes = analysisResult.graph.nodes.map(node => ({
            id: node.id,
            val: node.has_formula ? 8 : (node.is_input ? 7 : 5), // Larger, more visible nodes
            color: '#cbd5e1', // Uniform white/grey nodes
            ...node
        }));

        const links = analysisResult.graph.edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            color: 'rgba(255, 255, 255, 0.8)' // Much brighter/visible white connections
        }));

        return { nodes, links };
    }, [analysisResult]);

    // Resize handler
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        // Initial update with a small delay to ensure container is rendered
        setTimeout(updateDimensions, 100);

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Automatic center on data load
    useEffect(() => {
        if (graphRef.current) {
            graphRef.current.d3Force('charge').strength(-150); // Moderate repulsion
            graphRef.current.d3Force('link').distance(60); // Moderate link distance

            setTimeout(() => {
                if (graphRef.current) {
                    graphRef.current.zoomToFit(400, 40); // Better fit with less padding for larger view
                }
            }, 500);
        }
    }, [graphData]);

    const handleNodeHover = (node) => {
        setHoveredNode(node || null);
        document.body.style.cursor = node ? 'pointer' : null;
    };

    const handleNodeClick = (node) => {
        if (onNodeClick && node) {
            onNodeClick(node);
        }
    };

    const handleZoomIn = () => {
        if (graphRef.current) {
            graphRef.current.zoom(graphRef.current.zoom() * 1.3, 400);
        }
    };

    const handleZoomOut = () => {
        if (graphRef.current) {
            graphRef.current.zoom(graphRef.current.zoom() / 1.3, 400);
        }
    };

    const handleResetZoom = () => {
        if (graphRef.current) {
            graphRef.current.zoomToFit(400, 100);
        }
    };

    return (
        <div className="graph-viewer-container" ref={containerRef}>
            {graphData.nodes.length === 0 ? (
                <div className="empty-state">
                    Upload a file to visualize dependencies
                </div>
            ) : (
                <>
                    <ForceGraph2D
                        ref={graphRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={graphData}
                        nodeLabel="id"
                        nodeColor={node => hoveredNode && node.id === hoveredNode.id ? '#ffffff' : node.color}
                        linkColor={() => '#334155'}
                        linkDirectionalParticles={2}
                        linkDirectionalParticleSpeed={0.005}
                        linkDirectionalParticleWidth={2}
                        onNodeHover={handleNodeHover}
                        onNodeClick={handleNodeClick}
                        backgroundColor="#0f172a"
                        d3AlphaDecay={0.02}
                        d3VelocityDecay={0.3}
                        nodeCanvasObject={(node, ctx, globalScale) => {
                            const isHovered = hoveredNode && node.id === hoveredNode.id;
                            const label = node.id;
                            const fontSize = isHovered ? (16 / globalScale) : (12 / globalScale);

                            // Draw Node Circle
                            ctx.beginPath();
                            const r = node.val;
                            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                            ctx.fillStyle = isHovered ? '#ffffff' : node.color;
                            ctx.fill();

                            // Add glow if hovered
                            if (isHovered) {
                                ctx.shadowBlur = 15;
                                ctx.shadowColor = node.color;
                            } else {
                                ctx.shadowBlur = 0;
                            }

                            // Draw Label
                            // Only show labels for all nodes if zoom is close enough, or always for small graphs
                            // For this size (29 nodes), always showing is fine, but let's be subtle
                            if (globalScale > 1.5 || isHovered || graphData.nodes.length < 50) {
                                ctx.font = `${fontSize}px Sans-Serif`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'top';
                                ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
                                ctx.fillText(label, node.x, node.y + r + 2);
                            }

                            // Reset shadow for next draw
                            ctx.shadowBlur = 0;
                        }}
                        nodePointerAreaPaint={(node, color, ctx) => {
                            // Hit detection area
                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI, false);
                            ctx.fill();
                        }}
                    />

                    <div className="graph-controls-overlay">
                        <div className="legend-header">Legend</div>
                        <div className="legend-item">
                            <span className="dot input"></span>
                            <span className="legend-label">Input Cells</span>
                            <span className="legend-count">({graphData.nodes.filter(n => n.is_input).length})</span>
                        </div>
                        <div className="legend-item">
                            <span className="dot formula"></span>
                            <span className="legend-label">Formula Cells</span>
                            <span className="legend-count">({graphData.nodes.filter(n => n.has_formula).length})</span>
                        </div>
                        <div className="legend-item">
                            <span className="dot value"></span>
                            <span className="legend-label">Value Cells</span>
                            <span className="legend-count">({graphData.nodes.filter(n => !n.has_formula && !n.is_input).length})</span>
                        </div>
                        <div className="legend-divider"></div>
                        <div className="legend-hint">
                            <small>Hold click to drag nodes</small>
                        </div>
                    </div>

                    {/* Top Right Toolbar */}
                    <div className="graph-toolbar">
                        <button className="toolbar-btn" onClick={handleZoomIn} title="Zoom In">
                            +
                        </button>
                        <button className="toolbar-btn" onClick={handleZoomOut} title="Zoom Out">
                            −
                        </button>
                        <button className="toolbar-btn" onClick={handleResetZoom} title="Reset View">
                            ⟲
                        </button>
                    </div>

                    {/* Floating Stats Cards */}
                    <div className="floating-stats">
                        <div className="stat-card">
                            <span className="stat-number">{graphData.nodes.length}</span>
                            <span className="stat-label">NODES</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-number">{graphData.links.length}</span>
                            <span className="stat-label">LINKS</span>
                        </div>

                        {hoveredNode && (
                            <div className="viewing-card">
                                <div className="viewing-label">VIEWING</div>
                                <div className="viewing-id">{hoveredNode.id}</div>
                            </div>
                        )}
                    </div>

                    {hoveredNode && (
                        <div className="node-tooltip-custom">
                            <div className="tooltip-header">
                                <strong>{hoveredNode.id}</strong>
                                <span className={`badge ${hoveredNode.is_input ? 'input' : 'formula'}`}>
                                    {hoveredNode.is_input ? 'Input' : 'Formula'}
                                </span>
                            </div>
                            {hoveredNode.formula && (
                                <div className="tooltip-formula">
                                    <code>{hoveredNode.formula}</code>
                                </div>
                            )}
                            <div className="tooltip-meta">
                                Sheet: {hoveredNode.sheet}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default GraphViewer;
