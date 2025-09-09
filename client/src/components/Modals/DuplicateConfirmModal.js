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
  const handleConfirm = (e) => {
    e?.stopPropagation();
    onConfirm();
  };

  const handleCancel = (e) => {
    e?.stopPropagation();
    onCancel();
  };

    return (
      <DraggableModal
        isOpen={isOpen}
        setIsOpen={() => {}} // Prevent modal from trying to close itself
        title="Already added"
        onConfirm={handleCancel}
        onCancel={handleConfirm}
        onCloseNoReset={handleCancel}
        confirmButtonText="Don't add"
        cancelButtonText="Add anyway"
        confirmButtonType="primary"
        cancelButtonType="transparent"
        hideCloseButton={true}
      >
        <div 
          className="duplicate-confirm-modal__content"
          onClick={(e) => e.stopPropagation()}
        >
          <p>This is already in your <strong>{playlistTitle}</strong> playlist. </p>
        </div>
      </DraggableModal>
    );
};

export default DuplicateConfirmModal;
