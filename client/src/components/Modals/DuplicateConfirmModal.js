import React from 'react';
import DraggableModal from './DraggableModal';
import './DuplicateConfirmModal.scss';

const DuplicateConfirmModal = ({ 
  isOpen, 
  beatTitle, 
  playlistTitle, 
  onConfirm, 
  onCancel 
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

    return (
      <DraggableModal
        isOpen={isOpen}
        title="Duplicate Track Detected"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onCloseNoReset={handleCancel} // Use onCancel for overlay click
        confirmButtonText="Add Anyway"
        cancelButtonText="Cancel"
        confirmButtonType="warning"
      >
      <div className="duplicate-confirm-modal__content">
        <p>
          <strong>{beatTitle}</strong> is already in <strong>{playlistTitle}</strong>.
        </p>
        <p>
          Do you want to add this duplicate track to the playlist?
        </p>
      </div>
    </DraggableModal>
  );
};

export default DuplicateConfirmModal;
