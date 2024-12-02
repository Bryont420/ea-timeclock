export class APIError extends Error {
    status: number;
    data: any;

    constructor(message: string, status: number, data?: any) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

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
