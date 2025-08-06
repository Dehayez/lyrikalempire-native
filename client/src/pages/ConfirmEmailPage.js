import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoCheckmarkSharp, IoCloseSharp } from "react-icons/io5";
import './Auth.scss';
import { FormInput, Button, CodeInput } from '../components';
import userService from '../services/userService';
import { toastService } from '../utils/toastUtils';

const ConfirmEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email } = location.state || {};
  const [confirmationCode, setConfirmationCode] = useState(new Array(6).fill(''));
  const [isCodeValid, setIsCodeValid] = useState(false);

  const handleCodeSubmit = async (e) => {
    if (e) e.preventDefault();
    const code = confirmationCode.join('');
    try {
      await userService.verifyConfirmationCode(email, code);
      setIsCodeValid(true);
      toastService.confirmationCodeValidated();
      navigate('/login');
    } catch (error) {
      toastService.invalidConfirmationCode();
    }
  };

  return (
    <div className="auth-container">
      <h2>Confirm Your Email</h2>
      <form onSubmit={handleCodeSubmit}>
        <CodeInput value={confirmationCode} onChange={setConfirmationCode} />
        <Button variant='primary' type='submit' size='full-width'>Validate Code</Button>
      </form>
    </div>
  );
};

export default ConfirmEmailPage;