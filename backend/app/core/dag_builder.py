"""
DAG Builder - Constructs Directed Acyclic Graph from formula dependencies.

This module builds a NetworkX graph representing the dependency structure
of an Excel workbook, with cells as nodes and formula references as edges.
"""

import networkx as nx
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass
from collections import defaultdict
from ..utils import get_logger
from .parser import CellReference, FormulaParser

logger = get_logger(__name__)


@dataclass
class GraphNode:
    """Represents a node in the dependency graph."""
    address: str  # Full address like "Sheet1!A1"
    sheet: str
    col: str
    row: int
    value: Any
    formula: Optional[str]
    has_formula: bool
    is_input: bool  # True if node has no dependencies (root node)
    is_output: bool  # True if node has no dependents (leaf node)
    
    def __hash__(self):
        return hash(self.address)
    
    def __eq__(self, other):
        return self.address == other.address


@dataclass
class GraphEdge:
    """Represents an edge in the dependency graph."""
    source: str  # Cell being referenced
    target: str  # Cell containing the formula
    edge_type: str  # 'static' or 'dynamic'
    formula_snippet: Optional[str] = None


class DAGBuilder:
    """
    Builds a Directed Acyclic Graph from Excel workbook data.
    
    The graph represents:
    - Nodes: Individual cells
    - Edges: Dependencies (A→B means B depends on A)
    """
    
    def __init__(self):
        self.graph = nx.DiGraph()
        self.parser = FormulaParser()
        self.logger = logger.bind(component="DAGBuilder")
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: List[GraphEdge] = []
    
    def build_graph(
        self,
        sheets_data: List[Dict[str, Any]],
        include_values: bool = False
    ) -> nx.DiGraph:
        """
        Build dependency graph from sheets data.
        
        Args:
            sheets_data: List of sheet dictionaries with cells
            include_values: Whether to include cell values in nodes
            
        Returns:
            NetworkX DiGraph with dependency structure
        """
        self.logger.info("Starting graph construction", sheet_count=len(sheets_data))
        
        # First pass: Create all nodes
        for sheet_data in sheets_data:
            sheet_name = sheet_data['name']
            cells = sheet_data['cells']
            
            for cell in cells:
                self._add_node(
                    sheet=sheet_name,
                    col=cell.get('col', ''),
                    row=cell.get('row', 0),
                    value=cell.get('value') if include_values else None,
                    formula=cell.get('formula')
                )
        
        # Second pass: Create edges from formulas
        for sheet_data in sheets_data:
            sheet_name = sheet_data['name']
            cells = sheet_data['cells']
            
            for cell in cells:
                if cell.get('formula'):
                    self._process_formula(
                        sheet=sheet_name,
                        col=cell.get('col', ''),
                        row=cell.get('row', 0),
                        formula=cell['formula']
                    )
        
        # Mark input and output nodes
        self._identify_io_nodes()
        
        # Detect cycles
        cycles = self._detect_cycles()
        if cycles:
            self.logger.warning("Circular references detected", cycle_count=len(cycles))
        
        self.logger.info(
            "Graph construction complete",
            node_count=self.graph.number_of_nodes(),
            edge_count=self.graph.number_of_edges(),
            cycle_count=len(cycles)
        )
        
        return self.graph
    
    def _add_node(
        self,
        sheet: str,
        col: str,
        row: int,
        value: Any,
        formula: Optional[str]
    ) -> str:
        """Add a node to the graph."""
        address = f"{sheet}!{col}{row}"
        
        node = GraphNode(
            address=address,
            sheet=sheet,
            col=col,
            row=row,
            value=value,
            formula=formula,
            has_formula=formula is not None,
            is_input=False,  # Will be determined later
            is_output=False
        )
        
        self.nodes[address] = node
        
        # Add to NetworkX graph
        self.graph.add_node(
            address,
            sheet=sheet,
            col=col,
            row=row,
            has_formula=formula is not None,
            formula=formula
        )
        
        return address
    
    def _process_formula(
        self,
        sheet: str,
        col: str,
        row: int,
        formula: str
    ) -> None:
        """Process a formula and create edges for its dependencies."""
        target_address = f"{sheet}!{col}{row}"
        
        # Parse formula to get dependencies
        parsed = self.parser.parse(formula, current_sheet=sheet)
        dependencies = parsed['dependencies']
        is_dynamic = parsed['is_dynamic']
        
        # Create edges for each dependency
        for dep in dependencies:
            source_address = dep.to_address()
            
            # Ensure source node exists (it might be a reference to another sheet)
            if source_address not in self.nodes:
                # Create placeholder node for external reference
                self._add_node(
                    sheet=dep.sheet or sheet,
                    col=dep.col,
                    row=dep.row,
                    value=None,
                    formula=None
                )
            
            # Add edge
            edge_type = 'dynamic' if is_dynamic else 'static'
            self._add_edge(source_address, target_address, edge_type, formula)
    
    def _add_edge(
        self,
        source: str,
        target: str,
        edge_type: str,
        formula: Optional[str] = None
    ) -> None:
        """Add an edge to the graph."""
        edge = GraphEdge(
            source=source,
            target=target,
            edge_type=edge_type,
            formula_snippet=formula[:50] if formula else None
        )
        
        self.edges.append(edge)
        
        self.graph.add_edge(
            source,
            target,
            type=edge_type,
            formula=formula
        )
    
    def _identify_io_nodes(self) -> None:
        """Identify input (no predecessors) and output (no successors) nodes."""
        for node_id in self.graph.nodes():
            in_degree = self.graph.in_degree(node_id)
            out_degree = self.graph.out_degree(node_id)
            
            if node_id in self.nodes:
                self.nodes[node_id].is_input = (in_degree == 0)
                self.nodes[node_id].is_output = (out_degree == 0)
                
                # Update graph node attributes
                self.graph.nodes[node_id]['is_input'] = (in_degree == 0)
                self.graph.nodes[node_id]['is_output'] = (out_degree == 0)
    
    def _detect_cycles(self) -> List[List[str]]:
        """Detect circular references in the graph."""
        try:
            cycles = list(nx.simple_cycles(self.graph))
            return cycles
        except:
            return []
    
    def get_dependencies(self, cell_address: str, recursive: bool = False) -> Set[str]:
        """
        Get all dependencies of a cell.
        
        Args:
            cell_address: Cell address like "Sheet1!A1"
            recursive: If True, get all transitive dependencies
            
        Returns:
            Set of cell addresses that this cell depends on
        """
        if cell_address not in self.graph:
            return set()
        
        if recursive:
            # Get all ancestors (transitive dependencies)
            return set(nx.ancestors(self.graph, cell_address))
        else:
            # Get direct predecessors only
            return set(self.graph.predecessors(cell_address))
    
    def get_dependents(self, cell_address: str, recursive: bool = False) -> Set[str]:
        """
        Get all cells that depend on this cell.
        
        Args:
            cell_address: Cell address like "Sheet1!A1"
            recursive: If True, get all transitive dependents
            
        Returns:
            Set of cell addresses that depend on this cell
        """
        if cell_address not in self.graph:
            return set()
        
        if recursive:
            # Get all descendants (transitive dependents)
            return set(nx.descendants(self.graph, cell_address))
        else:
            # Get direct successors only
            return set(self.graph.successors(cell_address))
    
    def get_calculation_order(self) -> List[str]:
        """
        Get topological sort order for calculation.
        
        Returns:
            List of cell addresses in calculation order
        """
        try:
            return list(nx.topological_sort(self.graph))
        except nx.NetworkXError:
            self.logger.error("Cannot compute topological sort - graph has cycles")
            return []
    
    def get_subgraph(self, cell_addresses: List[str], include_dependencies: bool = True) -> nx.DiGraph:
        """
        Extract a subgraph containing specified cells.
        
        Args:
            cell_addresses: List of cell addresses to include
            include_dependencies: If True, include all dependencies
            
        Returns:
            Subgraph containing specified cells
        """
        if include_dependencies:
            # Include all ancestors of specified cells
            nodes_to_include = set(cell_addresses)
            for addr in cell_addresses:
                if addr in self.graph:
                    nodes_to_include.update(nx.ancestors(self.graph, addr))
            
            return self.graph.subgraph(nodes_to_include).copy()
        else:
            return self.graph.subgraph(cell_addresses).copy()
    
    def compute_impact_score(self, cell_address: str) -> float:
        """
        Compute impact score based on number of dependents.
        
        Higher score means more cells depend on this cell.
        
        Args:
            cell_address: Cell address
            
        Returns:
            Impact score (0-1)
        """
        if cell_address not in self.graph:
            return 0.0
        
        # Count all transitive dependents
        dependents = self.get_dependents(cell_address, recursive=True)
        total_nodes = self.graph.number_of_nodes()
        
        if total_nodes == 0:
            return 0.0
        
        return len(dependents) / total_nodes
    
    def get_graph_metrics(self) -> Dict[str, Any]:
        """
        Compute various graph metrics.
        
        Returns:
            Dictionary of metrics
        """
        metrics = {
            "node_count": self.graph.number_of_nodes(),
            "edge_count": self.graph.number_of_edges(),
            "density": nx.density(self.graph),
            "is_dag": nx.is_directed_acyclic_graph(self.graph),
        }
        
        # Count input/output nodes
        input_count = sum(1 for n in self.nodes.values() if n.is_input)
        output_count = sum(1 for n in self.nodes.values() if n.is_output)
        
        metrics["input_nodes"] = input_count
        metrics["output_nodes"] = output_count
        
        # Average degree
        if self.graph.number_of_nodes() > 0:
            degrees = [d for n, d in self.graph.degree()]
            metrics["avg_degree"] = sum(degrees) / len(degrees)
        else:
            metrics["avg_degree"] = 0
        
        return metrics
    
    def export_to_dict(self) -> Dict[str, Any]:
        """
        Export graph to dictionary format for JSON serialization.
        
        Returns:
            Dictionary representation of graph
        """
        return {
            "nodes": [
                {
                    "id": node.address,
                    "sheet": node.sheet,
                    "col": node.col,
                    "row": node.row,
                    "has_formula": node.has_formula,
                    "formula": node.formula,
                    "value": node.value,
                    "is_input": node.is_input,
                    "is_output": node.is_output,
                }
                for node in self.nodes.values()
            ],
            "edges": [
                {
                    "source": edge.source,
                    "target": edge.target,
                    "type": edge.edge_type,
                }
                for edge in self.edges
            ],
            "metrics": self.get_graph_metrics()
        }
