import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';

const FileUpload = () => {
    const [dragActive, setDragActive] = useState(false);
    const { uploadFile, isLoading, progress, statusMessage, error } = useAnalysisStore();

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = useCallback((e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    }, []);

    const handleFile = (file) => {
        // Validate file type
        const validExtensions = ['.xlsx', '.xlsm', '.xls'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            alert('Please upload a valid Excel file (.xlsx, .xlsm, or .xls)');
            return;
        }

        // Validate file size (100MB max)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File size must be less than 100MB');
            return;
        }

        // Upload file
        uploadFile(file, {
            includeValues: true,
            detectAnomalies: true,
            identifyCostDrivers: true,
            topDriversCount: 50,
        });
    };

    return (
        <div className="file-upload-container">
            <div
                className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${isLoading ? 'uploading' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id="file-input"
                    className="file-input"
                    accept=".xlsx,.xlsm,.xls"
                    onChange={handleChange}
                    disabled={isLoading}
                />

                <label htmlFor="file-input" className="file-upload-label">
                    <Upload size={48} className="upload-icon" />
                    <h3>Drop Excel file here or click to browse</h3>
                    <p>Supports .xlsx, .xlsm, .xls files up to 100MB</p>
                </label>
            </div>

            {isLoading && (
                <div className="upload-progress">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="progress-text">{statusMessage} ({progress}%)</p>
                </div>
            )}

            {error && (
                <div className="upload-error">
                    <p>Error: {error}</p>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
