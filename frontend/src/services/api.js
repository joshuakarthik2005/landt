import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const analysisAPI = {
    /**
     * Upload and analyze an Excel file
     */
    async analyzeFile(file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);

        const params = new URLSearchParams({
            include_values: String(options.includeValues === true),
            detect_anomalies: String(options.detectAnomalies !== false),
            identify_cost_drivers: String(options.identifyCostDrivers !== false),
            top_drivers_count: String(options.topDriversCount || 50),
        });

        const response = await api.post(`/analyze?${params}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    /**
     * Get analysis status
     */
    async getStatus(jobId) {
        const response = await api.get(`/analysis/${jobId}/status`);
        return response.data;
    },

    /**
     * Get analysis results
     */
    async getResults(jobId) {
        const response = await api.get(`/analysis/${jobId}`);
        return response.data;
    },

    /**
     * Get dependencies for a cell
     */
    async getDependencies(jobId, cellAddress, recursive = false) {
        const response = await api.post(`/dependencies?job_id=${jobId}`, {
            cell_address: cellAddress,
            recursive,
        });
        return response.data;
    },

    /**
     * Health check
     */
    async healthCheck() {
        const response = await api.get('/health');
        return response.data;
    },
};

export default api;
