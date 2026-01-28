import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isMobileOrTablet } from '../../utils';
import { NavigationButtons, IconButton } from '../Buttons';
import { Breadcrumb } from '../Breadcrumb';
import { PanelToggle } from '../PanelToggle';
import { IoSettingsSharp } from "react-icons/io5";

import './Header.scss';

const Header = ({
  isLeftPanelVisible,
  isRightPanelVisible,
  toggleSidePanel,
  handleMouseEnterLeft,
  handleMouseLeaveLeft,
  handleMouseEnterRight,
  handleMouseLeaveRight,
  isLeftDivVisible,
  isRightDivVisible,
  isAuthPage,
  closeSidePanel,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const [isLeftHovered, setIsLeftHovered] = useState(false);
  const [isRightHovered, setIsRightHovered] = useState(false);

  const handleClickPanel = (panel) => {
    if (isMobileOrTablet()) {
      if (panel === 'left' && isRightPanelVisible) toggleSidePanel('right');
      if (panel === 'right' && isLeftPanelVisible) toggleSidePanel('left');
    }
    toggleSidePanel(panel);
  };

  const handleHomepageClick = () => {
    if (isMobileOrTablet()) closeSidePanel('both');
  };

  return (
    <header className="header">
      {!isAuthPage && (
        <PanelToggle
          isPanelVisible={isLeftPanelVisible}
          isDivVisible={isLeftDivVisible}
          isHovered={isLeftHovered}
          setHovered={setIsLeftHovered}
          handleMouseEnter={handleMouseEnterLeft}
          handleMouseLeave={handleMouseLeaveLeft}
          handleClick={() => handleClickPanel('left')}
          position="left"
        />
      )}

      {isDashboard && (
        <>
          <NavigationButtons />
          <Breadcrumb />
        </>
      )}

      <div className="header__nav-group" onClick={handleHomepageClick}>
        <Link to="/">
          <img className="header__nav-logo" src="/android-chrome-192x192.png" alt="Logo" />
        </Link>
      </div>

      {!isAuthPage && (
        <div className="header__actions">
          <IconButton
            className="header__settings-button"
            onClick={() => navigate('/settings')}
            text="Settings"
            tooltipPosition="left"
            ariaLabel="Open settings"
          >
            <IoSettingsSharp />
          </IconButton>
        </div>
      )}

      {!isAuthPage && (
        <PanelToggle
          isPanelVisible={isRightPanelVisible}
          isDivVisible={isRightDivVisible}
          isHovered={isRightHovered}
          setHovered={setIsRightHovered}
          handleMouseEnter={handleMouseEnterRight}
          handleMouseLeave={handleMouseLeaveRight}
          handleClick={() => handleClickPanel('right')}
          position="right"
        />
      )}
    </header>
  );
};

export default Header;