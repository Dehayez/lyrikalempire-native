import React from 'react';
import DraggableModal from '../DraggableModal';
import './ConfirmModal.scss';

const ConfirmModal = ({ isOpen, setIsOpen, title = "Confirm", message, confirmButtonText = "Confirm", cancelButtonText = "Cancel", onConfirm, onCancel }) => {
  return (
    <DraggableModal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={title}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmButtonText={confirmButtonText}
      cancelButtonText={cancelButtonText}
      confirmButtonType='warning'
    >
      <p>{message}</p>
    </DraggableModal>
  );
};

export default ConfirmModal;