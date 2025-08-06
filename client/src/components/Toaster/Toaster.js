import React from 'react';
import { ToastContainer } from 'react-toastify';
import './Toaster.scss';

// Main Toaster component
const Toaster = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
      limit={3}
    />
  );
};

export default Toaster; 