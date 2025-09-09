import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { IoVolumeMediumSharp, IoRemoveCircleOutline, IoPencil } from "react-icons/io5";
import classNames from 'classnames';

import { ContextMenu } from '../ContextMenu';
import { DuplicateConfirmModal } from '../Modals';
import { addBeatsToPlaylist } from '../../services';
import { toastService } from '../../utils';

const PlaylistItem = ({
  playlist,
  index,
  playedPlaylistId,
  currentPlaylistId,
  isPlaying,
  onPlaylistClick,
  onRightClick,
  activeContextMenu,
  contextMenuX,
  contextMenuY,
  setActiveContextMenu,
  onOpenConfirmModal,
  onOpenUpdateForm
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState({
    isOpen: false,
    beatTitle: '',
    playlistTitle: '',
    pendingItem: null
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'BEAT',
    drop: async (item) => {
      // Allow drops from home page OR from other playlists
      const canAcceptDrop = item.isFromHomePage || 
                           (item.isFromPlaylistPage && item.sourcePlaylistId !== playlist.id);
      
      if (!canAcceptDrop) {
        return;
      }
      
      try {
        const result = await addBeatsToPlaylist(playlist.id, [item.id]);
        
        // Check if it's a duplicate
        if (result && result.isDuplicate) {
          setDuplicateModal({
            isOpen: true,
            beatTitle: item.title || 'Track',
            playlistTitle: playlist.title,
            pendingItem: item
          });
        } else {
          const sourceText = item.isFromPlaylistPage ? 'playlist' : 'library';
          toastService.addToPlaylist(item.title || 'Track', playlist.title);
        }
      } catch (error) {
        console.error('Error adding beat to playlist:', error);
        toastService.warning('Failed to add track to playlist');
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop() && (() => {
        const item = monitor.getItem();
        return item?.isFromHomePage || 
               (item?.isFromPlaylistPage && item?.sourcePlaylistId !== playlist.id);
      })(),
    }),
    hover: (item, monitor) => {
      const canAcceptDrop = item?.isFromHomePage || 
                           (item?.isFromPlaylistPage && item?.sourcePlaylistId !== playlist.id);
      setIsDragOver(monitor.isOver() && canAcceptDrop);
    },
  });

  const handleDuplicateConfirm = async () => {
    if (duplicateModal.pendingItem) {
      try {
        await addBeatsToPlaylist(playlist.id, [duplicateModal.pendingItem.id], true);
        toastService.addToPlaylist(duplicateModal.pendingItem.title || 'Track', playlist.title);
      } catch (error) {
        console.error('Error adding duplicate beat to playlist:', error);
        toastService.warning('Failed to add track to playlist');
      }
    }
    setDuplicateModal({ isOpen: false, beatTitle: '', playlistTitle: '', pendingItem: null });
  };

  const handleDuplicateCancel = () => {
    setDuplicateModal({ isOpen: false, beatTitle: '', playlistTitle: '', pendingItem: null });
  };

  const itemClasses = classNames('playlists__list-item', {
    'playlists__list-item--playing': playedPlaylistId === playlist.id,
    'playlists__list-item--active': playlist.id === currentPlaylistId,
    'playlists__list-item--drag-over': isOver && canDrop,
  });

  return (
    <li 
      ref={drop}
      key={index} 
      className={itemClasses}
      onClick={() => onPlaylistClick(playlist.id)}
      onContextMenu={(e) => onRightClick(e, playlist, index)}
      style={{ textDecoration: 'none' }}
    >
      <div>{playlist.title}</div>
      {playedPlaylistId === playlist.id && isPlaying && <IoVolumeMediumSharp/>}

      {activeContextMenu === `${playlist.id}-${index}` && (
        <ContextMenu
          beat={playlist}
          position={{ top: contextMenuY, left: contextMenuX }}
          setActiveContextMenu={setActiveContextMenu}
          items={[
            {
              icon: IoRemoveCircleOutline,
              iconClass: 'delete-playlist',
              text: 'Delete playlist',
              buttonClass: 'delete-playlist',
              onClick: () => onOpenConfirmModal(playlist.id),
            },
            {
              icon: IoPencil,
              iconClass: 'edit-playlist',
              text: 'Edit details',
              buttonClass: 'edit-playlist',
              onClick: () => onOpenUpdateForm(playlist),
            }
          ]}
        />
      )}

      {duplicateModal.isOpen && (
        <DuplicateConfirmModal
          isOpen={duplicateModal.isOpen}
          beatTitle={duplicateModal.beatTitle}
          playlistTitle={duplicateModal.playlistTitle}
          onConfirm={handleDuplicateConfirm}
          onCancel={handleDuplicateCancel}
        />
      )}
    </li>
  );
};

export default PlaylistItem;
