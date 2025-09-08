import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import classNames from 'classnames';
import { IoAddSharp } from 'react-icons/io5';

import { usePlaylist } from '../../contexts';
import { getPlaylistById, getBeatsByPlaylistId, removeBeatFromPlaylist, updateBeatOrder } from '../../services';
import { eventBus } from '../../utils';
import { useSort } from '../../hooks/useSort';

import { BeatList } from '../BeatList';
import { UpdatePlaylistForm } from './UpdatePlaylistForm';
import { IconButton } from '../Buttons'; 

import './PlaylistDetail.scss';

const PlaylistDetail = ({ onPlay, selectedBeat, isPlaying, currentBeat, sortedBeats, addToCustomQueue, onBeatClick, onUpdate, isBeatCachedSync }) => {
  const { id } = useParams();
  const { playlists, updatePlaylist } = usePlaylist();

  const [isOpen, setIsOpen] = useState(false);
  const [playlist, setPlaylist] = useState(() => playlists.find(p => p.id === id));
  const [beats, setBeats] = useState([]);
  const { sortedItems: sortedBeatsFromPlaylist } = useSort(beats);

  const refreshPlaylist = async () => {
    const updatedPlaylist = await getPlaylistById(id);
    setPlaylist(updatedPlaylist);
    updatePlaylist(updatedPlaylist);
    const updatedBeats = await getBeatsByPlaylistId(id);
    setBeats(updatedBeats);
  };

  const moveBeat = useCallback((dragIndex, hoverIndex) => {
    const dragBeat = beats[dragIndex];
    const updatedBeats = [...beats];
    updatedBeats.splice(dragIndex, 1);
    updatedBeats.splice(hoverIndex, 0, dragBeat);

    setBeats(updatedBeats);
    updateBeatOrder(id, updatedBeats.map((beat, index) => ({ id: beat.id, order: index + 1 })));
  }, [beats, id]);

  const handleUpdateBeat = (beatId, updatedFields) => {
    setBeats((prevBeats) => {
      const updatedBeats = prevBeats.map((beat) =>
        beat.id === beatId ? { ...beat, ...updatedFields } : beat
      );
      return updatedBeats.sort((a, b) => a.beat_order - b.beat_order);
    });
  };

  useEffect(() => {
    const updatePlaylistDetails = (updatedPlaylist) => {
      if (updatedPlaylist.id === playlist?.id) {
        setPlaylist({ ...playlist, title: updatedPlaylist.title, description: updatedPlaylist.description });
      }
    };
  
    eventBus.on('playlistUpdated', updatePlaylistDetails);
  
    return () => {
      eventBus.off('playlistUpdated', updatePlaylistDetails);
    };
  }, [playlist]);

  const handleDeleteBeats = async (beatIds) => {
    try {
      const ids = Array.isArray(beatIds) ? beatIds : [beatIds];
      await Promise.all(ids.map(beatId => removeBeatFromPlaylist(id, beatId)));
      await refreshPlaylist();
    } catch (error) {
      console.error('Error deleting beats from playlist:', error);
    }
  };

  useEffect(() => {
    const fetchPlaylistDetails = async () => {
      try {
        const playlistData = await getPlaylistById(id);
        if (Array.isArray(playlistData) && playlistData.length > 0) {
          setPlaylist(playlistData[0]);
        } else {
          setPlaylist(playlistData);
        }
  
        const beatsData = await getBeatsByPlaylistId(id);
        const sortedBeats = beatsData.sort((a, b) => a.beat_order - b.beat_order);
        setBeats(sortedBeats);
      } catch (error) {
        console.error('Error fetching playlist details:', error);
      }
    };
  
    fetchPlaylistDetails();
  }, [id, playlists]);

  return (
    <>
      {playlist && (
            <DndProvider backend={HTML5Backend}>
                <BeatList
                  key={beats.length}
                  externalBeats={sortedBeatsFromPlaylist}
                  shouldFetchBeats={false}
                  onPlay={onPlay}
                  selectedBeat={selectedBeat}
                  isPlaying={isPlaying}
                  currentBeat={currentBeat}
                  sortedBeats={sortedBeats}
                  addToCustomQueue={addToCustomQueue}
                  onBeatClick={onBeatClick}
                  deleteMode='playlist'
                  playlistName={playlist.title}
                  playlistId={playlist.id}
                  onDeleteFromPlaylist={handleDeleteBeats}
                  onUpdateBeat={handleUpdateBeat}
                  onUpdate={onUpdate}
                  moveBeat={moveBeat}
                  setBeats={setBeats}
                  isBeatCachedSync={isBeatCachedSync}
                  headerContent={
                    <div className='playlist__header'>
                      <div className='playlist__text' onClick={() => setIsOpen(true)}>
                        <h2 className='playlist__title'>{playlist.title}</h2>
                        <p className={classNames('playlist__description', { 'has-description': playlist.description })}>
                          {playlist.description}
                        </p>
                      </div>
                      <IconButton
                        className="playlist__action-button"
                        onClick={() => console.log('Button clicked!')}
                        text="Add to playlist"
                        tooltipPosition="left"
                      >
                        <IoAddSharp />
                      </IconButton>
                    </div>
                  }
                />
            </DndProvider>
      )}
      {isOpen &&
        <UpdatePlaylistForm
          playlist={playlist}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() =>  refreshPlaylist()}
        />
      }
    </>
  );
};

export default PlaylistDetail;