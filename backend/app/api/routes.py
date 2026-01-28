"""
API routes for Formula Intelligence.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import uuid
import os
import time
from datetime import datetime

from ..models import (
    AnalysisRequest,
    AnalysisResult,
    AnalysisStatus,
    DependencyQuery,
    DependencyResponse,
    HealthCheck,
)
from ..services import analysis_service
from ..utils import settings, get_logger

logger = get_logger(__name__)
router = APIRouter()

# In-memory job storage (in production, use Redis or database)
jobs = {}


@router.post("/analyze", response_model=AnalysisStatus)
async def analyze_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    include_values: bool = False,
    detect_anomalies: bool = True,
    identify_cost_drivers: bool = True,
    top_drivers_count: int = 50,
):
    """
    Upload and analyze an Excel file.
    
    This endpoint accepts an Excel file and starts background processing.
    Returns a job ID that can be used to check status and retrieve results.
    """
    # Validate file
    if not file.filename.endswith(tuple(settings.ALLOWED_EXTENSIONS)):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Check file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB"
        )
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Save file temporarily
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, f"{job_id}_{file.filename}")
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create job record
    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "progress": 0,
        "message": "File uploaded, starting analysis",
        "file_name": file.filename,
        "file_size": file_size,
        "file_path": file_path,
        "created_at": datetime.now(),
    }
    
    # Start background processing
    background_tasks.add_task(
        process_analysis,
        job_id=job_id,
        file_path=file_path,
        include_values=include_values,
        detect_anomalies=detect_anomalies,
        identify_cost_drivers=identify_cost_drivers,
        top_drivers_count=top_drivers_count,
    )
    
    logger.info(
        "Analysis job created",
        job_id=job_id,
        file_name=file.filename,
        file_size=file_size
    )
    
    return AnalysisStatus(
        job_id=job_id,
        status="processing",
        progress=0,
        message="Analysis started"
    )


async def process_analysis(
    job_id: str,
    file_path: str,
    include_values: bool,
    detect_anomalies: bool,
    identify_cost_drivers: bool,
    top_drivers_count: int,
):
    """Background task to process analysis."""
    try:
        start_time = time.time()
        
        # Update progress
        jobs[job_id]["progress"] = 10
        jobs[job_id]["message"] = "Reading Excel file"
        
        # Run analysis
        result = await analysis_service.analyze_workbook(
            file_path=file_path,
            include_values=include_values,
            detect_anomalies=detect_anomalies,
            identify_cost_drivers=identify_cost_drivers,
            top_drivers_count=top_drivers_count,
            progress_callback=lambda p, m: update_progress(job_id, p, m)
        )
        
        processing_time = time.time() - start_time
        
        # Update job with results
        jobs[job_id].update({
            "status": "completed",
            "progress": 100,
            "message": "Analysis complete",
            "result": result,
            "completed_at": datetime.now(),
            "processing_time": processing_time,
        })
        
        logger.info(
            "Analysis completed",
            job_id=job_id,
            processing_time=round(processing_time, 2)
        )
        
    except Exception as e:
        logger.error("Analysis failed", job_id=job_id, error=str(e))
        jobs[job_id].update({
            "status": "failed",
            "message": f"Analysis failed: {str(e)}",
            "error": str(e),
        })
    finally:
        # Clean up file
        try:
            os.remove(file_path)
        except:
            pass


def update_progress(job_id: str, progress: int, message: str):
    """Update job progress."""
    if job_id in jobs:
        jobs[job_id]["progress"] = progress
        jobs[job_id]["message"] = message


@router.get("/analysis/{job_id}", response_model=AnalysisResult)
async def get_analysis_result(job_id: str):
    """
    Get analysis results for a job.
    
    Returns the complete analysis including graph, anomalies, and cost drivers.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    if job["status"] == "processing":
        return AnalysisResult(
            job_id=job_id,
            status="processing",
            created_at=job["created_at"],
            file_name=job["file_name"],
            file_size=job["file_size"],
        )
    
    if job["status"] == "failed":
        return AnalysisResult(
            job_id=job_id,
            status="failed",
            created_at=job["created_at"],
            file_name=job["file_name"],
            file_size=job["file_size"],
            error=job.get("error"),
        )
    
    # Return completed result
    result = job.get("result", {})
    
    return AnalysisResult(
        job_id=job_id,
        status="completed",
        created_at=job["created_at"],
        completed_at=job.get("completed_at"),
        file_name=job["file_name"],
        file_size=job["file_size"],
        graph=result.get("graph"),
        metrics=result.get("metrics"),
        anomalies=result.get("anomalies"),
        cost_drivers=result.get("cost_drivers"),
        processing_time=job.get("processing_time"),
    )


@router.get("/analysis/{job_id}/status", response_model=AnalysisStatus)
async def get_analysis_status(job_id: str):
    """Get current status of an analysis job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    return AnalysisStatus(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress", 0),
        message=job.get("message", "")
    )


@router.post("/dependencies", response_model=DependencyResponse)
async def get_dependencies(query: DependencyQuery, job_id: str):
    """
    Get dependencies for a specific cell.
    
    Requires a completed analysis job ID.
    """
    if job_id not in jobs or jobs[job_id]["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")
    
    result = jobs[job_id].get("result", {})
    graph_data = result.get("graph")
    
    if not graph_data:
        raise HTTPException(status_code=404, detail="Graph data not found")
    
    # This would use the actual graph to find dependencies
    # For now, return a placeholder
    return DependencyResponse(
        cell_address=query.cell_address,
        dependencies=[],
        dependents=[],
        dependency_count=0,
        dependent_count=0,
    )


@router.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(
        status="healthy",
        version=settings.APP_VERSION,
        timestamp=datetime.now()
    )
