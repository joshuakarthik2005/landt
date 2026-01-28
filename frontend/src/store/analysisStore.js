import { create } from 'zustand';
import { analysisAPI } from '../services/api';

export const useAnalysisStore = create((set, get) => ({
    // State
    jobId: null,
    analysisResult: null,
    isLoading: false,
    progress: 0,
    error: null,
    statusMessage: '',

    // Actions
    uploadFile: async (file, options) => {
        set({ isLoading: true, error: null, progress: 0 });

        try {
            const response = await analysisAPI.analyzeFile(file, options);
            const { job_id } = response;

            set({ jobId: job_id, progress: 10, statusMessage: 'Analysis started' });

            // Start polling for status
            get().pollStatus(job_id);
        } catch (error) {
            set({
                isLoading: false,
                error: error.response?.data?.message || error.message,
            });
        }
    },

    pollStatus: async (jobId) => {
        let pollCount = 0;
        const maxPolls = 150; // 5 minutes max (150 * 2 seconds)

        const pollInterval = setInterval(async () => {
            pollCount++;

            // Timeout after max polls
            if (pollCount >= maxPolls) {
                clearInterval(pollInterval);
                set({
                    isLoading: false,
                    error: 'Analysis timed out. Please try again with a smaller file.',
                });
                return;
            }

            try {
                const status = await analysisAPI.getStatus(jobId);

                set({
                    progress: status.progress,
                    statusMessage: status.message,
                });

                if (status.status === 'completed') {
                    clearInterval(pollInterval);
                    get().fetchResults(jobId);
                } else if (status.status === 'failed') {
                    clearInterval(pollInterval);
                    set({
                        isLoading: false,
                        error: status.message,
                    });
                }
            } catch (error) {
                clearInterval(pollInterval);
                set({
                    isLoading: false,
                    error: error.response?.data?.detail || error.message || 'Failed to check analysis status',
                });
            }
        }, 2000); // Poll every 2 seconds
    },

    fetchResults: async (jobId) => {
        try {
            const result = await analysisAPI.getResults(jobId);

            set({
                analysisResult: result,
                isLoading: false,
                progress: 100,
                statusMessage: 'Analysis complete',
            });
        } catch (error) {
            set({
                isLoading: false,
                error: error.response?.data?.message || error.message,
            });
        }
    },

    reset: () => {
        set({
            jobId: null,
            analysisResult: null,
            isLoading: false,
            progress: 0,
            error: null,
            statusMessage: '',
        });
    },
}));
