import { axiosInstance } from '../utils/axios';
import { API_ENDPOINTS } from '../config';
import { handleAPIError } from '../utils/apiErrors';

interface BackgroundResponse {
    background_image: string | null;
}

export const getBackgroundImage = async (): Promise<string | null> => {
    try {
        const response = await axiosInstance.get<BackgroundResponse>(API_ENDPOINTS.EMPLOYEE.BACKGROUND_IMAGE);
        return response.data?.background_image || null;
    } catch (error) {
        return handleAPIError(error);
    }
};

export const updateBackgroundImage = async (filename: string): Promise<void> => {
    try {
        await axiosInstance.post<void>(API_ENDPOINTS.EMPLOYEE.BACKGROUND_IMAGE, {
            background_image: filename
        });
    } catch (error) {
        return handleAPIError(error);
    }
};
