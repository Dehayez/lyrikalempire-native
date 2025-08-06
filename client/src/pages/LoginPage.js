import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmarkSharp, IoCloseSharp } from "react-icons/io5";
import { GoogleLogin } from 'react-google-login';
import './Auth.scss';
import { FormInput, Button } from '../components';
import { useUser } from '../contexts/UserContext';
import userService from '../services/userService';
import { toastService } from '../utils/toastUtils'; 

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { login, setUser, isAuthenticated, isLoading } = useUser();
  const navigate = useNavigate();

  // Redirect to homepage if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(identifier, password);
    } catch (error) {
      toastService.loginFailed(error.message);
    }
  };

  const loginWithGoogle = async (tokenId) => {
    try {
      const { token, email, username } = await userService.loginWithGoogle(tokenId);
      localStorage.setItem('token', token);
      setUser({ email, username });
      navigate('/');
    } catch (error) {
      throw new Error('Google login failed');
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      const { tokenId } = response;
      await loginWithGoogle(tokenId);
      navigate('/');
    } catch (error) {
      toastService.loginFailed(error.message);
    }
  };

  const handleGoogleFailure = (error) => {
    toastService.warning('Google Sign-In failed');
  };

  return (
    <div className="auth-container">
      <h2>Log into your account</h2>
      <form onSubmit={handleSubmit}>
        <FormInput
          id='identifier'
          name='identifier'
          type='text'
          label='Email or username*'
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <FormInput
          id='password'
          name='password'
          type='password'
          label='Password*'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <p className='link-container'>
          <span className='link' onClick={() => navigate('/request-password-reset')}>Forgot Password?</span>
        </p>
        <Button className='auth-button' variant='primary' type='submit' size='full-width'>Login</Button>
       {/*  <GoogleLogin
          clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}
          buttonText="Login with Google"
          onSuccess={handleGoogleSuccess}
          onFailure={handleGoogleFailure}
          cookiePolicy={'single_host_origin'}
          className="google-login-button"
        /> */}
        <p className='auth-link'>Don't have an account yet? <span className='link' onClick={() => navigate('/register')}>Register</span></p>
      </form>
    </div>
  );
};

export default LoginPage;