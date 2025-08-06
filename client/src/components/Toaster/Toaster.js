import React from 'react';
import { ToastContainer } from 'react-toastify';
import './Toaster.scss';

// Main Toaster component
const Toaster = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={30000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
    />
  );
};

export default Toaster; 