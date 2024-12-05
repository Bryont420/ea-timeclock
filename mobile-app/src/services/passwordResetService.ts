import axios from 'axios';

const API_BASE_URL = 'https://ea-time-clock.duckdns.org:1832/api';

export const requestPasswordReset = async (userId: string, email: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/password-reset/request/`, {
      user_id: userId,
      email: email,
    });
    return response.data;
  } catch (error) {
    throw (error as any).response ? (error as any).response.data : new Error('Network error');
  }
};

export const resetPassword = async (token: string, newPassword: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/password-reset/reset/${token}/`, {
      new_password: newPassword,
    });
    return response.data;
  } catch (error) {
    throw (error as any).response ? (error as any).response.data : new Error('Network error');
  }
};
