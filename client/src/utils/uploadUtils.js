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

export const uploadBeatWithToast = async (beat, file, userId, setRefreshBeats) => {
  const toastId = toastService.createUploadToast(file.name, 'upload');

  try {
    // Simulate progress since multer doesn't provide progress callbacks
    const simulateProgress = () => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5; // Random progress between 5-20%
        if (progress >= 90) {
          progress = 90; // Don't go to 100% until actually complete
          clearInterval(interval);
        }
        toastService.updateUploadToast(toastId, file.name, Math.round(progress), 'upload');
      }, 200); // Update every 200ms
      
      return interval;
    };

    const progressInterval = simulateProgress();

    // Call addBeat without progress callback since multer doesn't support it
    await addBeat(beat, file, userId);

    // Clear the simulated progress and complete
    clearInterval(progressInterval);
    
    toastService.completeUploadToast(toastId, beat.title, 'upload');

    if (setRefreshBeats) {
      setRefreshBeats((prev) => !prev);
    }
  } catch (error) {
    handleUploadError(error, 'upload');
  }
};

export const replaceAudioWithToast = async (beatId, file, userId, setRefreshBeats, duration) => {
  const toastId = toastService.createUploadToast(file.name, 'replace');

  try {
    // Simulate progress since multer doesn't provide progress callbacks
    const simulateProgress = () => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5; // Random progress between 5-20%
        if (progress >= 90) {
          progress = 90; // Don't go to 100% until actually complete
          clearInterval(interval);
        }
        toastService.updateUploadToast(toastId, file.name, Math.round(progress), 'replace');
      }, 200); // Update every 200ms
      
      return interval;
    };

    const progressInterval = simulateProgress();

    // Call replaceAudio without progress callback since multer doesn't support it
    await replaceAudio(beatId, file, userId, duration);

    // Clear the simulated progress and complete
    clearInterval(progressInterval);
    
    toastService.completeUploadToast(toastId, file.name, 'replace');

    if (setRefreshBeats) {
      setRefreshBeats((prev) => !prev);
    }
  } catch (error) {
    handleUploadError(error, 'audio replacement');
  }
};