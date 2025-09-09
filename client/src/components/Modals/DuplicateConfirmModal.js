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
        title="Already added"
        onConfirm={handleCancel}
        onCancel={handleConfirm}
        onCloseNoReset={handleCancel}
        confirmButtonText="Don't add"
        cancelButtonText="Add anyway"
        confirmButtonType="primary"
        cancelButtonType="transparent"
      >
        <div className="duplicate-confirm-modal__content">
          <p>This is already in your <strong>{playlistTitle}</strong> playlist. </p>
        </div>
      </DraggableModal>
    );
};

export default DuplicateConfirmModal;
