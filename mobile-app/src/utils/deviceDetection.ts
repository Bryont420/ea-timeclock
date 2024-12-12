/**
 * Check if the current device is a mobile device
 * @returns boolean indicating if the device is mobile
 */
export const isMobileDevice = (): boolean => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};
