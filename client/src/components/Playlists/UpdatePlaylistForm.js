import React, { useState, useEffect, useCallback } from 'react';
import { updatePlaylist } from '../../services';

import DraggableModal from '../Modals/DraggableModal';
import { FormInput, FormTextarea } from '../Inputs';
import { Warning } from '../Warning';

import './UpdatePlaylistForm.scss';

export const UpdatePlaylistForm = ({ playlist, onCancel, onConfirm, isOpen, setIsOpen }) => {
    const [title, setTitle] = useState(playlist.title);
    const [isTitleEmpty, setIsTitleEmpty] = useState(false);
    const [description, setDescription] = useState(playlist.description || '');


    const handleUpdate = useCallback(async () => {
        if (!title.trim()) {
          setIsTitleEmpty(true);
          return;
        }
      
        try {
          await updatePlaylist(playlist.id, { title, description });
          onConfirm();
          setIsOpen(false);
        } catch (error) {
          console.error('Failed to update playlist', error);
        }
    }, [title, description, playlist.id, onConfirm, setIsOpen]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Enter') {
                handleUpdate();
            } else if (event.key === 'Escape') {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleUpdate, onCancel]);

    return (
        <DraggableModal
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            title='Update Playlist'
            onConfirm={handleUpdate}
            onCancel={onCancel}
         >
            <div className="update-playlist__form">
                <FormInput 
                id='title'
                name='title'
                type='text' 
                label='Title' 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                spellCheck="false" 
                maxLength={100} 
                />
                {isTitleEmpty && <Warning message="Title cannot be empty" />}
                <FormTextarea label="Description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} spellCheck="false" maxLength={400} />
            </div>
        </DraggableModal>
    );
};