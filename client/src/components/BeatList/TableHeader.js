import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useResizableColumns } from '../../hooks';
import { addGenre, addMood, addKeyword, addFeature } from '../../services';
import { useData } from '../../contexts';
import { Form } from '../Form';
import { IoChevronUpSharp, IoChevronDownSharp, IoTimeOutline, IoAddSharp } from 'react-icons/io5';
import ContextMenu from '../ContextMenu/ContextMenu';
import './TableHeader.scss';

const TableHeader = ({ onSort, sortConfig, mode, topOffset, isScrolled }) => {
  const tableRef = useRef(null);
  const [activeContextMenu, setActiveContextMenu] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('');
  const { fetchGenres, fetchMoods, fetchKeywords, fetchFeatures, genres, moods, keywords, features } = useData();
  const columns = ['title', 'tierlist', 'bpm', 'genre', 'mood', 'keyword', 'feature'];

  const { recalculatePercentages } = useResizableColumns(tableRef);

  // Expose recalculatePercentages to parent components if needed
  useEffect(() => {
    if (window.recalculateTablePercentages) {
      window.recalculateTablePercentages = recalculatePercentages;
    }
  }, [recalculatePercentages]);

  const handleMouseEvents = (eventName, columnName) => {
    if (eventName === 'click') {
      onSort && onSort(columnName);
    }
  };

  const handleRightClick = (e, column) => {
    e.preventDefault();
    setActiveContextMenu(column);
    setContextMenuPosition({ top: e.clientY, left: e.clientX });
  };

  const handleOpenForm = (type) => {
    setFormType(type);
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    try {
      switch (formType) {
        case 'genre':
          await addGenre(data);
          fetchGenres();
          break;
        case 'mood':
          await addMood(data);
          fetchMoods();
          break;
        case 'keyword':
          await addKeyword(data);
          fetchKeywords();
          break;
        case 'feature':
          await addFeature(data);
          fetchFeatures();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
    setShowForm(false);
  };

  const handleUpdateSelectableInput = (newItem) => {
    switch (formType) {
      case 'genre':
        genres.push(newItem);
        break;
      case 'mood':
        moods.push(newItem);
        break;
      case 'keyword':
        keywords.push(newItem);
        break;
      case 'feature':
        features.push(newItem);
        break;
      default:
        break;
    }
  };

  return (
    <thead className={`table-header ${isScrolled ? 'table-header--scrolled' : ''}`} ref={tableRef}
      style={{
        position: 'sticky',
        top: `${topOffset}px`,
      }}>
      <tr>
        <th className="table-header__cell table-header__cell--center non-draggable">#</th>
        {columns.map((column) => (
          <th
            key={column}
            onContextMenu={(e) => handleRightClick(e, column)}
            className={`table-header__cell table-header__cell--${column}`}
          >
            <div
              className="table-header__cell-left"
              onClick={() => handleMouseEvents('click', column)}
            >
              <span className={`table-header__cell-text${sortConfig.key === column ? ' active' : ''}`}>
                {column === 'bpm' ? 'BPM' : column.charAt(0).toUpperCase() + column.slice(1)}
              </span>
              <span className={`table-header__cell-icon${sortConfig.key === column ? ' active' : ''}`}>
                {sortConfig.key === column && sortConfig.direction === 'ascending' ? (
                  <IoChevronUpSharp />
                ) : (
                  <IoChevronDownSharp />
                )}
              </span>
            </div>

            {(column === 'genre' || column === 'mood' || column === 'keyword' || column === 'feature') &&
              activeContextMenu === column && (
                <ContextMenu
                  items={[
                    {
                      icon: IoAddSharp,
                      text: `Add ${activeContextMenu}`,
                      onClick: () => handleOpenForm(activeContextMenu),
                    },
                  ]}
                  position={contextMenuPosition}
                  setActiveContextMenu={setActiveContextMenu}
                />
              )}
          </th>
        ))}
          <th className="table-header__cell table-header__cell--center table-header__cell--duration non-draggable">
            <IoTimeOutline />
          </th>
        <th className="table-header__cell table-header__cell--center table-header__cell--menu non-draggable"></th>
      </tr>
      {showForm &&
        ReactDOM.createPortal(
          <Form
            title={`Add ${formType}`}
            placeholder={`Enter ${formType}`}
            item={formType}
            onClose={() => setShowForm(false)}
            onSubmit={handleSubmit}
            onUpdateSelectableInput={handleUpdateSelectableInput}
          />,
          document.getElementById('root')
        )}
    </thead>
  );
};

export default TableHeader;