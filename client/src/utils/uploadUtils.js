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
    await addBeat(beat, file, userId, (percentage) => {
      toastService.updateUploadToast(toastId, file.name, percentage, 'upload');
    });

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
    await replaceAudio(beatId, file, userId, duration, (percentage) => {
      toastService.updateUploadToast(toastId, file.name, percentage, 'replace');
    });

    toastService.completeUploadToast(toastId, file.name, 'replace');

    if (setRefreshBeats) {
      setRefreshBeats((prev) => !prev);
    }
  } catch (error) {
    handleUploadError(error, 'audio replacement');
  }
};