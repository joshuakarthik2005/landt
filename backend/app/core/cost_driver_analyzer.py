"""
Cost Driver Analyzer - Identifies key cost drivers using graph metrics.

Uses graph algorithms like betweenness centrality and clustering to identify
cells that have the most impact on the overall budget/cost structure.
"""

import networkx as nx
from typing import List, Dict, Set, Any, Tuple, Optional
from dataclasses import dataclass
from ..utils import get_logger

logger = get_logger(__name__)


@dataclass
class CostDriver:
    """Represents a cost driver cell."""
    cell_address: str
    sheet: str
    col: str
    row: int
    centrality_score: float
    impact_score: float
    dependent_count: int
    cluster_id: Optional[int] = None
    description: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "cell_address": self.cell_address,
            "sheet": self.sheet,
            "col": self.col,
            "row": self.row,
            "centrality_score": round(self.centrality_score, 4),
            "impact_score": round(self.impact_score, 4),
            "dependent_count": self.dependent_count,
            "cluster_id": self.cluster_id,
            "description": self.description
        }


class CostDriverAnalyzer:
    """
    Analyzes dependency graph to identify cost drivers.
    
    Cost drivers are cells that:
    1. Have high betweenness centrality (control information flow)
    2. Have many dependents (high impact)
    3. Are input nodes (raw assumptions/parameters)
    """
    
    def __init__(self, graph: nx.DiGraph):
        self.graph = graph
        self.logger = logger.bind(component="CostDriverAnalyzer")
        self.cost_drivers: List[CostDriver] = []
        self.clusters: Dict[int, List[str]] = {}
    
    def analyze(self, top_n: int = 50) -> List[CostDriver]:
        """
        Identify top cost drivers.
        
        Args:
            top_n: Number of top drivers to return
            
        Returns:
            List of CostDriver objects sorted by importance
        """
        self.logger.info("Starting cost driver analysis")
        
        # Compute centrality metrics
        centrality_scores = self._compute_betweenness_centrality()
        
        # Compute impact scores
        impact_scores = self._compute_impact_scores()
        
        # Identify clusters
        self._identify_clusters()
        
        # Create CostDriver objects
        self.cost_drivers = []
        
        for node_id in self.graph.nodes():
            node_data = self.graph.nodes[node_id]
            
            # Get dependent count
            dependent_count = len(list(nx.descendants(self.graph, node_id)))
            
            # Find cluster
            cluster_id = self._get_node_cluster(node_id)
            
            # Create cost driver
            driver = CostDriver(
                cell_address=node_id,
                sheet=node_data.get('sheet', ''),
                col=node_data.get('col', ''),
                row=node_data.get('row', 0),
                centrality_score=centrality_scores.get(node_id, 0.0),
                impact_score=impact_scores.get(node_id, 0.0),
                dependent_count=dependent_count,
                cluster_id=cluster_id,
                description=self._generate_description(node_id, node_data)
            )
            
            self.cost_drivers.append(driver)
        
        # Sort by combined score (centrality + impact)
        self.cost_drivers.sort(
            key=lambda d: d.centrality_score + d.impact_score,
            reverse=True
        )
        
        # Return top N
        top_drivers = self.cost_drivers[:top_n]
        
        self.logger.info(
            "Cost driver analysis complete",
            total_drivers=len(self.cost_drivers),
            top_n=len(top_drivers)
        )
        
        return top_drivers
    
    def _compute_betweenness_centrality(self) -> Dict[str, float]:
        """
        Compute centrality for all nodes using PageRank.
        
        PageRank is better suited for DAGs than betweenness centrality.
        It measures the importance of a node based on the structure
        of incoming links.
        """
        try:
            # Use PageRank for DAGs - it's more meaningful than betweenness
            centrality = nx.pagerank(self.graph, alpha=0.85)
            
            # Log some statistics
            if centrality:
                max_score = max(centrality.values())
                min_score = min(centrality.values())
                avg_score = sum(centrality.values()) / len(centrality)
                self.logger.debug(
                    "Computed PageRank centrality",
                    node_count=len(centrality),
                    max_score=round(max_score, 4),
                    min_score=round(min_score, 4),
                    avg_score=round(avg_score, 4)
                )
            
            return centrality
        except Exception as e:
            self.logger.error("Error computing centrality", error=str(e))
            # Fallback: use out-degree as a simple centrality measure
            centrality = {}
            total_nodes = self.graph.number_of_nodes()
            if total_nodes > 0:
                for node in self.graph.nodes():
                    out_degree = self.graph.out_degree(node)
                    centrality[node] = out_degree / total_nodes
            return centrality
    
    def _compute_impact_scores(self) -> Dict[str, float]:
        """
        Compute impact score based on number of dependents.
        
        Impact score = (number of dependents) / (total nodes)
        Higher score means the node affects more downstream cells.
        """
        total_nodes = self.graph.number_of_nodes()
        if total_nodes == 0:
            return {}
        
        impact_scores = {}
        
        for node_id in self.graph.nodes():
            # descendants gives all nodes reachable from this node
            dependents = nx.descendants(self.graph, node_id)
            impact_score = len(dependents) / total_nodes
            impact_scores[node_id] = impact_score
        
        # Log statistics
        if impact_scores:
            max_impact = max(impact_scores.values())
            nodes_with_impact = sum(1 for score in impact_scores.values() if score > 0)
            self.logger.debug(
                "Computed impact scores",
                node_count=len(impact_scores),
                max_impact=round(max_impact, 4),
                nodes_with_impact=nodes_with_impact
            )
        
        return impact_scores

    
    def _identify_clusters(self) -> None:
        """
        Identify clusters/communities in the graph.
        
        Uses weakly connected components to group related cells.
        """
        # Convert to undirected for clustering
        undirected = self.graph.to_undirected()
        
        # Find connected components
        components = list(nx.connected_components(undirected))
        
        self.clusters = {}
        for idx, component in enumerate(components):
            self.clusters[idx] = list(component)
        
        self.logger.debug("Identified clusters", cluster_count=len(self.clusters))
    
    def _get_node_cluster(self, node_id: str) -> Optional[int]:
        """Get cluster ID for a node."""
        for cluster_id, nodes in self.clusters.items():
            if node_id in nodes:
                return cluster_id
        return None
    
    def _generate_description(self, node_id: str, node_data: Dict[str, Any]) -> str:
        """Generate human-readable description of cost driver."""
        dependent_count = len(list(nx.descendants(self.graph, node_id)))
        
        if node_data.get('is_input', False):
            return f"Input parameter affecting {dependent_count} cells"
        elif node_data.get('has_formula', False):
            return f"Calculated value affecting {dependent_count} cells"
        else:
            return f"Value affecting {dependent_count} cells"
    
    def get_input_drivers(self) -> List[CostDriver]:
        """Get cost drivers that are input nodes (raw parameters)."""
        return [
            d for d in self.cost_drivers
            if self.graph.nodes[d.cell_address].get('is_input', False)
        ]
    
    def get_drivers_by_sheet(self, sheet_name: str) -> List[CostDriver]:
        """Get cost drivers for a specific sheet."""
        return [d for d in self.cost_drivers if d.sheet == sheet_name]
    
    def get_cluster_summary(self) -> Dict[int, Dict[str, Any]]:
        """Get summary of each cluster."""
        summary = {}
        
        for cluster_id, nodes in self.clusters.items():
            # Get sheets in this cluster
            sheets = set()
            for node_id in nodes:
                sheet = self.graph.nodes[node_id].get('sheet', '')
                if sheet:
                    sheets.add(sheet)
            
            summary[cluster_id] = {
                "node_count": len(nodes),
                "sheets": list(sheets),
                "sample_nodes": nodes[:5]  # First 5 nodes as sample
            }
        
        return summary
    
    def export_to_dict(self) -> Dict[str, Any]:
        """Export analysis results to dictionary format."""
        return {
            "total_drivers": len(self.cost_drivers),
            "top_drivers": [d.to_dict() for d in self.cost_drivers[:20]],
            "input_drivers": [d.to_dict() for d in self.get_input_drivers()[:10]],
            "cluster_count": len(self.clusters),
            "cluster_summary": self.get_cluster_summary()
        }
