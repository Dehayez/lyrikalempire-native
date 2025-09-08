import React from 'react';
import { toast } from 'react-toastify';
import { IoCheckmarkSharp, IoCloseSharp } from "react-icons/io5";

// Toast types and their configurations
const TOAST_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning'
};

// Toast configurations
const TOAST_CONFIGS = {
  [TOAST_TYPES.SUCCESS]: {
    icon: <IoCheckmarkSharp size={24} />,
    className: "Toastify__toast--success",
    autoClose: 3000,
    pauseOnFocusLoss: false
  },
  [TOAST_TYPES.WARNING]: {
    icon: <IoCloseSharp size={24} />,
    className: "Toastify__toast--warning",
    autoClose: 5000,
    pauseOnFocusLoss: false
  }
};

// Toast service class
class ToastService {
  constructor() {
    this.uploadToasts = new Map(); // Track upload toasts by ID
  }

  // Generic toast method
  show(message, type = TOAST_TYPES.SUCCESS, options = {}) {
    const config = { ...TOAST_CONFIGS[type], ...options };
    
    return toast.dark(
      <div>
        {typeof message === 'string' ? <strong>{message}</strong> : message}
      </div>,
      config
    );
  }

  // Success toast
  success(message, options = {}) {
    return this.show(message, TOAST_TYPES.SUCCESS, options);
  }

  // Warning toast (for errors)
  warning(message, options = {}) {
    return this.show(message, TOAST_TYPES.WARNING, options);
  }

  // Upload toast methods
  createUploadToast(fileName, actionType = 'upload') {
    const actionText = actionType === 'replace' ? 'Replacing' : 'Uploading';
    
    const toastId = toast.dark(
      <div>
        <strong>{actionText}:</strong> {fileName}
      </div>,
      {
        ...TOAST_CONFIGS[TOAST_TYPES.SUCCESS],
        autoClose: false,
        closeOnClick: false,
        progress: 0
      }
    );

    this.uploadToasts.set(toastId, { fileName, actionType });
    return toastId;
  }

  updateUploadToast(toastId, fileName, percentage, actionType = 'upload') {
    const actionText = actionType === 'replace' ? 'Replacing' : 'Uploading';
    
    toast.update(toastId, {
      render: (
        <div>
          <strong>{actionText}:</strong> {fileName} ({percentage}%)
        </div>
      ),
      progress: percentage / 100,
      ...TOAST_CONFIGS[TOAST_TYPES.SUCCESS]
    });
  }

  completeUploadToast(toastId, title, actionType = 'upload') {
    const actionText = actionType === 'replace' ? 'replaced' : 'uploaded';
    
    toast.update(toastId, {
      render: (
        <div>
          <strong>{title}</strong> {actionText} successfully!
        </div>
      ),
      ...TOAST_CONFIGS[TOAST_TYPES.SUCCESS],
      progress: 1
    });

    this.uploadToasts.delete(toastId);
  }

  errorUploadToast(errorMessage) {
    return this.warning(errorMessage);
  }

  // Playlist-related toasts
  addToPlaylist(beatTitle, playlistTitle) {
    return this.success(
      <div>
        Added <strong>{beatTitle}</strong> to <strong>{playlistTitle}</strong>
      </div>
    );
  }

  removeFromPlaylist(beatTitle, playlistTitle) {
    return this.success(
      <div>
        Removed <strong>{beatTitle}</strong> from <strong>{playlistTitle}</strong>
      </div>
    );
  }

  addToQueue(beatTitle) {
    return this.success(`Added "${beatTitle}" to queue`);
  }

  // Auth-related toasts
  registrationSuccess() {
    return this.success('Registration successful. Check your email to confirm your account.');
  }

  registrationFailed() {
    return this.warning('Registration failed');
  }

  loginFailed(errorMessage) {
    return this.warning(errorMessage);
  }

  confirmationCodeValidated() {
    return this.success('Confirmation code validated');
  }

  invalidConfirmationCode() {
    return this.warning('Invalid confirmation code');
  }

  // Network/error toasts
  networkError() {
    return this.warning('No response from the server. Please check your internet connection and try again.');
  }

  serverError() {
    return this.warning('Server Error: Something went wrong on our end. Please try again later.');
  }

  unauthorized() {
    return this.warning('Unauthorized: Please log in to perform this action.');
  }

  forbidden() {
    return this.warning('Forbidden: You do not have permission to perform this action.');
  }

  notFound() {
    return this.warning('Not Found: The requested resource could not be found.');
  }

  badRequest() {
    return this.warning('Bad Request: Please check the file and try again.');
  }

  // File-related toasts
  unsupportedFileFormat(fileName) {
    return this.warning(`${fileName} is not uploaded. Only audio files are accepted`);
  }

  multipleUnsupportedFiles(count) {
    return this.warning(`${count} files are not uploaded. Only audio files are accepted`);
  }

  aifNotSupported() {
    return this.warning('AIF files are not supported');
  }

  // Clear all toasts
  clearAll() {
    toast.dismiss();
    this.uploadToasts.clear();
  }

  // Get upload toast info
  getUploadToastInfo(toastId) {
    return this.uploadToasts.get(toastId);
  }

  // Test function to check if progress bar works
  testProgressBar() {
    const toastId = this.createUploadToast('test.mp3', 'upload');
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      this.updateUploadToast(toastId, 'test.mp3', progress, 'upload');
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          this.completeUploadToast(toastId, 'test.mp3', 'upload');
        }, 1000);
      }
    }, 500);
  }
}

// Create singleton instance
const toastService = new ToastService();

// Export the service and types
export { toastService, TOAST_TYPES }; 