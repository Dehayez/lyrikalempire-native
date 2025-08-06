import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoCheckmarkSharp, IoCloseSharp } from "react-icons/io5";
import './Auth.scss';
import { FormInput, Button, CodeInput } from '../components';
import userService from '../services/userService';
import { toastService } from '../utils/toastUtils';

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email } = location.state || {};
  const [resetCode, setResetCode] = useState(new Array(6).fill(''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCodeValid, setIsCodeValid] = useState(false);

  useEffect(() => {
    if (resetCode.every(val => val !== '')) {
      handleCodeSubmit();
    }
  }, [resetCode]);

  const handleCodeSubmit = async (e) => {
    if (e) e.preventDefault();
    const code = resetCode.join('');
    try {
      await userService.verifyResetCode(email, code);
      setIsCodeValid(true);
      toastService.success('Reset code validated');
    } catch (error) {
      toastService.warning('Invalid reset code');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toastService.warning('Passwords do not match');
      return;
    }

    try {
      const code = resetCode.join('');
      await userService.resetPassword(email, code, password);
      toastService.success('Password reset successfully');
      navigate('/login');
    } catch (error) {
      toastService.warning('Error resetting password');
    }
  };

  return (
    <div className="auth-container">
      <h2>{isCodeValid ? 'Enter New Password' : 'Enter Reset Code'}</h2>
      {!isCodeValid ? (
        <form onSubmit={handleCodeSubmit}>
          <CodeInput value={resetCode} onChange={setResetCode} />
          <Button variant='primary' type='submit' size='full-width'>Validate Code</Button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit}>
          <FormInput
            id='password'
            name='password'
            type='password'
            label='New Password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <FormInput
            id='confirmPassword'
            name='confirmPassword'
            type='password'
            label='Confirm New Password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button variant='primary' type='submit' size='full-width'>Reset Password</Button>
        </form>
      )}
    </div>
  );
};

export default ResetPasswordPage;