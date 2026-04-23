import apiClient from './client';
import { ENDPOINTS } from './config';

export const vendorService = {
  getVerificationStatus: async () => {
    const response = await apiClient.get(ENDPOINTS.VENDOR_VERIFICATION_STATUS);
    return response.data;
  },

  uploadCnic: async (frontImage, backImage) => {
    const formData = new FormData();
    formData.append('cnicFront', frontImage);
    formData.append('cnicBack', backImage);

    // React Native's XMLHttpRequest adds the multipart boundary automatically
    // when it sees FormData + Content-Type: multipart/form-data. Without this
    // explicit header the apiClient default (application/json) stays active and
    // the XHR never serialises the FormData, causing an indefinite hang.
    const response = await apiClient.post(ENDPOINTS.VENDOR_VERIFICATION_CNIC, formData, {
      timeout: 120000,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  },

  processVerification: async () => {
    const response = await apiClient.post(ENDPOINTS.VENDOR_VERIFICATION_PROCESS, {}, {
      timeout: 90000, // 90 s — OCR + matching can take time
    });
    return response.data;
  },

  retryVerification: async () => {
    const response = await apiClient.post(ENDPOINTS.VENDOR_VERIFICATION_RETRY);
    return response.data;
  },
};