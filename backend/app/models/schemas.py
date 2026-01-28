"""
Pydantic models for API request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class AnalysisRequest(BaseModel):
    """Request model for analysis endpoint."""
    include_values: bool = Field(default=False, description="Include cell values in graph")
    detect_anomalies: bool = Field(default=True, description="Run anomaly detection")
    identify_cost_drivers: bool = Field(default=True, description="Identify cost drivers")
    top_drivers_count: int = Field(default=50, description="Number of top cost drivers to return")


class GraphNode(BaseModel):
    """Graph node model."""
    id: str
    sheet: str
    col: str
    row: int
    has_formula: bool
    formula: Optional[str] = None
    value: Optional[str] = None
    is_input: bool
    is_output: bool


class GraphEdge(BaseModel):
    """Graph edge model."""
    source: str
    target: str
    type: str  # 'static' or 'dynamic'


class GraphMetrics(BaseModel):
    """Graph metrics model."""
    node_count: int
    edge_count: int
    density: float
    is_dag: bool
    input_nodes: int
    output_nodes: int
    avg_degree: float


class GraphData(BaseModel):
    """Complete graph data model."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    metrics: GraphMetrics


class AnomalyModel(BaseModel):
    """Anomaly model."""
    type: str
    severity: str
    cell_address: str
    sheet: str
    description: str
    suggestion: Optional[str] = None
    metadata: Dict[str, Any] = {}


class AnomalySummary(BaseModel):
    """Summary of detected anomalies."""
    total_count: int
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    anomalies: List[AnomalyModel]


class CostDriverModel(BaseModel):
    """Cost driver model."""
    cell_address: str
    sheet: str
    col: str
    row: int
    centrality_score: float
    impact_score: float
    dependent_count: int
    cluster_id: Optional[int] = None
    description: str


class CostDriverSummary(BaseModel):
    """Summary of cost drivers."""
    total_drivers: int
    top_drivers: List[CostDriverModel]
    input_drivers: List[CostDriverModel]
    cluster_count: int
    cluster_summary: Dict[int, Dict[str, Any]]


class MetricsSummary(BaseModel):
    """Summary of analysis metrics."""
    formula_count: int
    input_count: int
    sheet_count: int
    avg_complexity: float


class AnalysisResult(BaseModel):
    """Complete analysis result."""
    job_id: str
    status: str  # 'processing', 'completed', 'failed'
    created_at: datetime
    completed_at: Optional[datetime] = None
    file_name: str
    file_size: int
    graph: Optional[GraphData] = None
    metrics: Optional[MetricsSummary] = None
    anomalies: Optional[AnomalySummary] = None
    cost_drivers: Optional[CostDriverSummary] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None


class AnalysisStatus(BaseModel):
    """Status of an analysis job."""
    job_id: str
    status: str
    progress: int = Field(ge=0, le=100, description="Progress percentage")
    message: str


class DependencyQuery(BaseModel):
    """Query for cell dependencies."""
    cell_address: str
    recursive: bool = Field(default=False, description="Include transitive dependencies")


class DependencyResponse(BaseModel):
    """Response for dependency query."""
    cell_address: str
    dependencies: List[str]
    dependents: List[str]
    dependency_count: int
    dependent_count: int


class HealthCheck(BaseModel):
    """Health check response."""
    status: str
    version: str
    timestamp: datetime
