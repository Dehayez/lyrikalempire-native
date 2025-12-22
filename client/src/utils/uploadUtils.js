import { toastService } from './toastUtils';
import { addBeat, replaceAudio } from '../services';

// Helper function to handle common error processing
const handleUploadError = (error, context = 'upload') => {
  let errorMessage = `An error occurred during the ${context}. Please try again later.`;
  
  if (error.response) {
    switch (error.response.status) {
      case 400:
        errorMessage = 'Bad Request: Please check the file and try again.';
        break;
      case 401:
        errorMessage = context === 'upload' 
          ? 'Unauthorized: Please log in to upload your beat.'
          : 'Unauthorized: Please log in to replace the audio.';
        break;
      case 403:
        errorMessage = 'Forbidden: You do not have permission to perform this action.';
        break;
      case 404:
        errorMessage = 'Not Found: The requested resource could not be found.';
        break;
      case 500:
        errorMessage = 'Server Error: Something went wrong on our end. Please try again later.';
        break;
      default:
        errorMessage = error.response.data?.error || errorMessage;
    }
  } else if (error.request) {
    errorMessage = 'No response from the server. Please check your internet connection and try again.';
  }

  toastService.errorUploadToast(errorMessage);
  throw error;
};

// Simulates progress based on file size
const createProgressSimulator = (toastId, fileName, actionType, fileSize) => {
  let progress = 0;
  let isProcessing = false;
  
  // Estimate duration based on file size (larger files = slower progress)
  // Base: ~500ms per MB for upload phase, slower for processing phase
  const fileSizeMB = fileSize / (1024 * 1024);
  const uploadInterval = Math.max(200, Math.min(500, fileSizeMB * 50));
  
  const interval = setInterval(() => {
    if (progress < 50) {
      // Upload phase: 0-50% with smaller increments
      progress += Math.random() * 5 + 2;
      if (progress >= 50) {
        progress = 50;
        isProcessing = true;
      }
    } else if (progress < 90) {
      // Processing phase: 50-90% with very slow increments
      progress += Math.random() * 2 + 0.5;
      if (progress >= 90) {
        progress = 90;
      }
    }
    
    toastService.updateUploadToast(toastId, fileName, Math.round(progress), actionType, isProcessing);
  }, uploadInterval);
  
  return interval;
};

export const uploadBeatWithToast = (beat, file, userId, setRefreshBeats) => {
  const toastId = toastService.createUploadToast(file.name, 'upload');
  
  // Show initial progress immediately
  toastService.updateUploadToast(toastId, file.name, 0, 'upload');
  
  // Start progress simulation based on file size
  const progressInterval = createProgressSimulator(toastId, file.name, 'upload', file.size);

  // Start upload
  addBeat(beat, file, userId)
    .then(() => {
      clearInterval(progressInterval);
      toastService.completeUploadToast(toastId, beat.title, 'upload');
      if (setRefreshBeats) setRefreshBeats((prev) => !prev);
    })
    .catch((error) => {
      clearInterval(progressInterval);
      handleUploadError(error, 'upload');
    });
};

export const replaceAudioWithToast = (beatId, file, userId, setRefreshBeats, duration) => {
  const toastId = toastService.createUploadToast(file.name, 'replace');
  
  // Show initial progress immediately
  toastService.updateUploadToast(toastId, file.name, 0, 'replace');
  
  // Start progress simulation based on file size
  const progressInterval = createProgressSimulator(toastId, file.name, 'replace', file.size);

  // Start upload
  replaceAudio(beatId, file, userId, duration)
    .then(() => {
      clearInterval(progressInterval);
      toastService.completeUploadToast(toastId, file.name, 'replace');
      if (setRefreshBeats) setRefreshBeats((prev) => !prev);
    })
    .catch((error) => {
      clearInterval(progressInterval);
      handleUploadError(error, 'audio replacement');
    });
};