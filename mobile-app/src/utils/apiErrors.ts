/**
 * @fileoverview API error handling utilities for consistent error management
 * across the application. Provides custom error class and error handling function
 * for API responses.
 */

/**
 * Custom error class for API-related errors.
 * Extends the base Error class with additional properties for
 * HTTP status code and response data.
 */
export class APIError extends Error {
    /** HTTP status code of the error */
    status: number;
    /** Additional error data from the API response */
    data: any;

    /**
     * Creates a new APIError instance
     * @param message - Error message
     * @param status - HTTP status code
     * @param data - Additional error data
     */
    constructor(message: string, status: number, data?: any) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Handles API errors by converting them into APIError instances.
 * Extracts error messages from various possible locations in the response.
 * 
 * @param error - Error object from API call
 * @throws APIError with appropriate message and status
 */
export const handleAPIError = (error: any): never => {
    if (error.response) {
        const errorMessage = error.response.data.non_field_errors?.[0] || 
                           error.response.data.message || 
                           error.response.data.error ||
                           'An error occurred';
        throw new APIError(
            errorMessage,
            error.response.status,
            error.response.data
        );
    }
    throw new APIError(
        error.message || 'Network error',
        0
    );
};
