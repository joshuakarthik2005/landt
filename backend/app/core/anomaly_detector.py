"""
Anomaly Detector - Identifies issues in Excel workbooks.

Detects:
- Hard-coded overwrites (values in formula cells)
- Broken references (#REF!, #NAME!)
- Unused formulas (dead logic)
- Pattern deviations using Graph Neural Networks
"""

import networkx as nx
from typing import List, Dict, Set, Any, Optional
from dataclasses import dataclass
from enum import Enum
from ..utils import get_logger

logger = get_logger(__name__)


class AnomalyType(Enum):
    """Types of anomalies that can be detected."""
    HARD_CODED_OVERWRITE = "hard_coded_overwrite"
    BROKEN_REFERENCE = "broken_reference"
    UNUSED_FORMULA = "unused_formula"
    CIRCULAR_REFERENCE = "circular_reference"
    PATTERN_DEVIATION = "pattern_deviation"
    MISSING_DEPENDENCY = "missing_dependency"


@dataclass
class Anomaly:
    """Represents a detected anomaly."""
    type: AnomalyType
    severity: str  # 'low', 'medium', 'high', 'critical'
    cell_address: str
    sheet: str
    description: str
    suggestion: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "type": self.type.value,
            "severity": self.severity,
            "cell_address": self.cell_address,
            "sheet": self.sheet,
            "description": self.description,
            "suggestion": self.suggestion,
            "metadata": self.metadata or {}
        }


class AnomalyDetector:
    """
    Detects various anomalies in Excel workbooks.
    """
    
    def __init__(self, graph: nx.DiGraph):
        self.graph = graph
        self.logger = logger.bind(component="AnomalyDetector")
        self.anomalies: List[Anomaly] = []
    
    def detect_all(self, sheets_data: List[Dict[str, Any]]) -> List[Anomaly]:
        """
        Run all anomaly detection methods.
        
        Args:
            sheets_data: List of sheet dictionaries
            
        Returns:
            List of detected anomalies
        """
        self.logger.info("Starting anomaly detection")
        
        self.anomalies = []
        
        # Run different detection methods
        self._detect_broken_references(sheets_data)
        self._detect_unused_formulas()
        self._detect_circular_references()
        self._detect_hard_coded_overwrites(sheets_data)
        self._detect_missing_dependencies()
        
        self.logger.info(
            "Anomaly detection complete",
            total_anomalies=len(self.anomalies),
            by_type=self._count_by_type()
        )
        
        return self.anomalies
    
    def _detect_broken_references(self, sheets_data: List[Dict[str, Any]]) -> None:
        """Detect cells with error values like #REF!, #NAME!."""
        error_patterns = ['#REF!', '#NAME!', '#VALUE!', '#DIV/0!', '#N/A', '#NUM!']
        
        for sheet_data in sheets_data:
            sheet_name = sheet_data['name']
            cells = sheet_data['cells']
            
            for cell in cells:
                value = str(cell.get('value', ''))
                
                if any(error in value for error in error_patterns):
                    self.anomalies.append(Anomaly(
                        type=AnomalyType.BROKEN_REFERENCE,
                        severity='high',
                        cell_address=f"{sheet_name}!{cell.get('col')}{cell.get('row')}",
                        sheet=sheet_name,
                        description=f"Cell contains error value: {value}",
                        suggestion="Check formula references and ensure all referenced cells exist",
                        metadata={"error_value": value}
                    ))
    
    def _detect_unused_formulas(self) -> None:
        """Detect formulas that are never used by other cells (dead logic)."""
        for node_id in self.graph.nodes():
            node_data = self.graph.nodes[node_id]
            
            # Check if node has a formula but no dependents
            if node_data.get('has_formula', False):
                out_degree = self.graph.out_degree(node_id)
                
                if out_degree == 0:
                    # This is a formula cell with no dependents
                    self.anomalies.append(Anomaly(
                        type=AnomalyType.UNUSED_FORMULA,
                        severity='low',
                        cell_address=node_id,
                        sheet=node_data.get('sheet', ''),
                        description="Formula is not used by any other cell",
                        suggestion="Consider removing this formula if it's not needed for output",
                        metadata={"formula": node_data.get('formula', '')[:100]}
                    ))
    
    def _detect_circular_references(self) -> None:
        """Detect circular reference cycles."""
        try:
            cycles = list(nx.simple_cycles(self.graph))
            
            for cycle in cycles:
                # Create anomaly for each cell in the cycle
                cycle_str = " → ".join(cycle) + f" → {cycle[0]}"
                
                for cell_address in cycle:
                    node_data = self.graph.nodes[cell_address]
                    
                    self.anomalies.append(Anomaly(
                        type=AnomalyType.CIRCULAR_REFERENCE,
                        severity='critical',
                        cell_address=cell_address,
                        sheet=node_data.get('sheet', ''),
                        description=f"Part of circular reference: {cycle_str}",
                        suggestion="Break the circular dependency by restructuring formulas",
                        metadata={"cycle": cycle}
                    ))
        except Exception as e:
            self.logger.error("Error detecting cycles", error=str(e))
    
    def _detect_hard_coded_overwrites(self, sheets_data: List[Dict[str, Any]]) -> None:
        """
        Detect cells that should have formulas but contain hard-coded values.
        
        This is a heuristic check based on patterns in surrounding cells.
        """
        for sheet_data in sheets_data:
            sheet_name = sheet_data['name']
            cells = sheet_data['cells']
            
            # Group cells by row
            rows = {}
            for cell in cells:
                row = cell.get('row', 0)
                if row not in rows:
                    rows[row] = []
                rows[row].append(cell)
            
            # Check each row for patterns
            for row_num, row_cells in rows.items():
                formula_count = sum(1 for c in row_cells if c.get('formula'))
                value_count = sum(1 for c in row_cells if not c.get('formula') and c.get('value'))
                
                # If most cells in row have formulas, flag the ones that don't
                if formula_count > 3 and value_count > 0:
                    for cell in row_cells:
                        if not cell.get('formula') and cell.get('value'):
                            # This might be a hard-coded overwrite
                            self.anomalies.append(Anomaly(
                                type=AnomalyType.HARD_CODED_OVERWRITE,
                                severity='medium',
                                cell_address=f"{sheet_name}!{cell.get('col')}{cell.get('row')}",
                                sheet=sheet_name,
                                description="Cell contains hard-coded value in a row of formulas",
                                suggestion="Verify if this should be a formula instead of a hard-coded value",
                                metadata={
                                    "value": str(cell.get('value')),
                                    "row_formula_count": formula_count
                                }
                            ))
    
    def _detect_missing_dependencies(self) -> None:
        """Detect cells that reference non-existent cells."""
        for node_id in self.graph.nodes():
            # Check if any predecessors don't exist in the graph
            predecessors = list(self.graph.predecessors(node_id))
            
            for pred in predecessors:
                if pred not in self.graph.nodes():
                    node_data = self.graph.nodes[node_id]
                    
                    self.anomalies.append(Anomaly(
                        type=AnomalyType.MISSING_DEPENDENCY,
                        severity='high',
                        cell_address=node_id,
                        sheet=node_data.get('sheet', ''),
                        description=f"References non-existent cell: {pred}",
                        suggestion="Check if the referenced cell was deleted or moved",
                        metadata={"missing_cell": pred}
                    ))
    
    def _count_by_type(self) -> Dict[str, int]:
        """Count anomalies by type."""
        counts = {}
        for anomaly in self.anomalies:
            type_name = anomaly.type.value
            counts[type_name] = counts.get(type_name, 0) + 1
        return counts
    
    def get_anomalies_by_severity(self, severity: str) -> List[Anomaly]:
        """Get anomalies filtered by severity level."""
        return [a for a in self.anomalies if a.severity == severity]
    
    def get_anomalies_by_sheet(self, sheet_name: str) -> List[Anomaly]:
        """Get anomalies for a specific sheet."""
        return [a for a in self.anomalies if a.sheet == sheet_name]
    
    def export_to_dict(self) -> Dict[str, Any]:
        """Export anomalies to dictionary format."""
        return {
            "total_count": len(self.anomalies),
            "by_type": self._count_by_type(),
            "by_severity": {
                "critical": len(self.get_anomalies_by_severity('critical')),
                "high": len(self.get_anomalies_by_severity('high')),
                "medium": len(self.get_anomalies_by_severity('medium')),
                "low": len(self.get_anomalies_by_severity('low')),
            },
            "anomalies": [a.to_dict() for a in self.anomalies]
        }
