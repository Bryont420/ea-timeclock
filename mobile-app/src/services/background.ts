/**
 * @fileoverview Background service that handles fetching and updating
 * user background image preferences. Provides API integration for managing
 * custom background images in the application.
 */

import { axiosInstance } from '../utils/axios';
import { API_ENDPOINTS } from '../config';
import { handleAPIError } from '../utils/apiErrors';

/**
 * Interface for background image API response
 */
interface BackgroundResponse {
    background_image: string | null;
}

/**
 * Fetches the current background image for the user.
 * 
 * @returns Promise that resolves to the background image filename or null
 * @throws APIError if request fails
 */
export const getBackgroundImage = async (): Promise<string | null> => {
    try {
        const response = await axiosInstance.get<BackgroundResponse>(API_ENDPOINTS.EMPLOYEE.BACKGROUND_IMAGE);
        return response.data?.background_image || null;
    } catch (error) {
        return handleAPIError(error);
    }
};

/**
 * Updates the user's background image preference.
 * 
 * @param filename - Name of the background image file
 * @throws APIError if request fails
 */
export const updateBackgroundImage = async (filename: string): Promise<void> => {
    try {
        await axiosInstance.post<void>(API_ENDPOINTS.EMPLOYEE.BACKGROUND_IMAGE, {
            background_image: filename
        });
    } catch (error) {
        return handleAPIError(error);
    }
};
