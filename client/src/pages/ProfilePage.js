import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import userService from '../services/userService';
import { Button, FormInput, PageContainer } from '../components';
import { IoLogOutOutline } from "react-icons/io5";

import './ProfilePage.scss';

const ProfilePage = () => {
  const { user, setUser, logout } = useUser();
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setEmail(user.email);
    setUsername(user.username);
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await userService.updateUserDetails({ email, username });
      setUser(updatedUser);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEmail(user.email);
    setUsername(user.username);
    setIsEditing(false);
  };

  return (
    <PageContainer
      title="Profile"
      subtitle="Manage your account details and preferences."
    >
      <div className="profile-page">
        <section className="profile-page__card profile-page__card--details">
          <div className="profile-page__card-header">
            <div>
              <h2 className="profile-page__card-title">Account details</h2>
              <p className="profile-page__card-subtitle">Keep your info up to date.</p>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>

          <div className="profile-page__fields">
            <div className="profile-page__field">
              <p className="profile-page__label">Email</p>
              <p className="profile-page__value">{email}</p>
            </div>
            <div className="profile-page__field">
              <p className="profile-page__label">Username</p>
              {isEditing ? (
                <FormInput
                  id="profile-username"
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              ) : (
                <p className="profile-page__value">{username}</p>
              )}
            </div>
          </div>

          {error && (
            <p className="profile-page__error" role="alert">
              {error}
            </p>
          )}

          {isEditing && (
            <div className="profile-page__actions">
              <Button variant="transparent" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </section>

        <section className="profile-page__card profile-page__card--session">
          <div className="profile-page__card-header">
            <div>
              <h2 className="profile-page__card-title">Session</h2>
              <p className="profile-page__card-subtitle">
                Log out from this device whenever you need.
              </p>
            </div>
          </div>
          <Button className="profile-page__logout" variant="transparent" onClick={logout}>
            Log Out <IoLogOutOutline />
          </Button>
        </section>
      </div>
    </PageContainer>
  );
};

export default ProfilePage;