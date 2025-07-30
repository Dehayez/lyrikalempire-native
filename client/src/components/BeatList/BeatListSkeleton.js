import React from 'react';
import './BeatListSkeleton.scss';

const BeatListSkeleton = () => {
  return (
    <div className="beat-list-skeleton">
      {/* Table skeleton */}
      <div className="beat-list-skeleton__table">
        {/* Table header skeleton */}
        <div className="beat-list-skeleton__table-header">
          <div className="beat-list-skeleton__header-cell"></div>
          <div className="beat-list-skeleton__header-cell"></div>
          <div className="beat-list-skeleton__header-cell"></div>
          <div className="beat-list-skeleton__header-cell"></div>
          <div className="beat-list-skeleton__header-cell"></div>
          <div className="beat-list-skeleton__header-cell"></div>
        </div>
        
        {/* Table rows skeleton */}
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="beat-list-skeleton__row">
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--play"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--title"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--artist"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--genre"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--mood"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--duration"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BeatListSkeleton; 