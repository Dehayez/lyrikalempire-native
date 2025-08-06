import React, { useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import Modal from 'react-modal';
import { Button, IconButton } from '../Buttons';
import { IoCloseSharp } from 'react-icons/io5';
import { isMobileOrTablet } from '../../utils';
import './DraggableModal.scss';

// Set app element only once to avoid conflicts
if (typeof window !== 'undefined') {
  try {
    Modal.setAppElement('#root');
  } catch (error) {
    // App element already set, ignore
  }
}

const modalStyle = {
  overlay: {
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
    zIndex: 10,
  },
  content: {
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    height: isMobileOrTablet() ? '100vh' : 'auto',
    width: isMobileOrTablet() ? '100vw' : 'auto',
    margin: isMobileOrTablet() ? '0' : 'auto',
    position: isMobileOrTablet() ? 'fixed' : 'absolute',
    top: isMobileOrTablet() ? '0' : '50%',
    left: isMobileOrTablet() ? '0' : '50%',
    right: isMobileOrTablet() ? '0' : 'auto',
    bottom: isMobileOrTablet() ? '0' : 'auto',
    transform: isMobileOrTablet() ? 'none' : 'translate(-50%, -50%)',
    padding: '0',
  },
};

const DraggableModal = ({ 
  isOpen, 
  setIsOpen, 
  title, 
  children, 
  onConfirm, 
  onCancel, 
  onCloseNoReset, 
  confirmButtonText = "Save", 
  cancelButtonText = "Cancel", 
  cancelButtonType = "transparent", 
  confirmButtonType = "primary" 
}) => {
  const draggableRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        onConfirm();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onConfirm]);

  // Cleanup modal when component unmounts
  useEffect(() => {
    return () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };
  }, [isOpen, setIsOpen]);

  const handleCancel = () => {
    setIsOpen(false);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onCloseNoReset} style={modalStyle}>
      {isMobileOrTablet() ? (
        <div className='modal modal--mobile'>
          <div className='modal-content'>
            <h2 className='modal__title'>{title}</h2>
            {children}
            <div className='modal__buttons'>
              <Button variant={cancelButtonType} onClick={handleCancel}>{cancelButtonText}</Button>
              <Button variant={confirmButtonType} onClick={onConfirm}>{confirmButtonText}</Button>
            </div>
          </div>
        </div>
      ) : (
        <Draggable handle=".modal__title" nodeRef={draggableRef}>
          <div ref={draggableRef} className='modal'>
            <div className='modal-content'>
              <IconButton className="modal__close-button" onClick={handleCancel}>
                <IoCloseSharp />
              </IconButton>
              <h2 className='modal__title'>{title}</h2>
              {children}
              <div className='modal__buttons'>
                <Button variant={cancelButtonType} onClick={handleCancel}>{cancelButtonText}</Button>
                <Button variant={confirmButtonType} onClick={onConfirm}>{confirmButtonText}</Button>
              </div>
            </div>
          </div>
        </Draggable>
      )}
    </Modal>
  );
};

export default DraggableModal;