import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { IoVolumeMediumSharp, IoRemoveCircleOutline, IoPencil } from "react-icons/io5";
import classNames from 'classnames';

import { ContextMenu } from '../ContextMenu';
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

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'BEAT',
    drop: async (item) => {
      // Only allow drops from home page to prevent duplicates in playlist pages
      if (!item.isFromHomePage) {
        return;
      }
      
      try {
        await addBeatsToPlaylist(playlist.id, [item.id]);
        toastService.addToPlaylist(item.title || 'Track', playlist.title);
      } catch (error) {
        console.error('Error adding beat to playlist:', error);
        toastService.warning('Failed to add track to playlist');
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop() && monitor.getItem()?.isFromHomePage,
    }),
    hover: (item, monitor) => {
      setIsDragOver(monitor.isOver() && item?.isFromHomePage);
    },
  });

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
    </li>
  );
};

export default PlaylistItem;
