import React from 'react';
import DraggableModal from './DraggableModal';
import './DuplicateConfirmModal.scss';

const DuplicateConfirmModal = ({ 
  isOpen, 
  setIsOpen, 
  beatTitle, 
  playlistTitle, 
  onConfirm, 
  onCancel 
}) => {
  return (
    <DraggableModal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title="Duplicate Track Detected"
      onConfirm={onConfirm}
      onCancel={onCancel}
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
