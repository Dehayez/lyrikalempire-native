import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmarkSharp } from "react-icons/io5";
import './Auth.scss';
import { FormInput, Button } from '../components';
import userService from '../services/userService';
import { toastService } from '../utils/toastUtils';

const RequestPasswordResetPage = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await userService.requestPasswordReset(email);
      toastService.success('Password reset code sent. Please check your email.');
      navigate('/reset-password', { state: { email } });
    } catch (error) {
      toastService.warning('Error sending password reset code');
    }
  };

  return (
    <div className="auth-container">
      <h2>Reset Your Password</h2>
      <form onSubmit={handleSubmit}>
        <FormInput
          id='email'
          name='email'
          type='email'
          label='Email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button variant='primary' type='submit' size='full-width'>Send Reset Code</Button>
      </form>
    </div>
  );
};

export default RequestPasswordResetPage;