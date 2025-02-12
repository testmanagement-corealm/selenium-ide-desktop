import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, CircularProgress, Typography, Snackbar, Alert, Box } from '@mui/material';


interface TwoFADialogProps {
  isOpened: boolean;
  cancel: (arg0: boolean) => void;
  userId: string;
  fullname: (arg0: string) => void;
}

const TwoFADialog: React.FC<TwoFADialogProps> = ({ isOpened, cancel, userId, fullname }) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
//   const [otpError, setOtpError] = useState<string | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [hPLoaderStatus, setHPLoaderStatus] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const otpBoxReference = useRef<(HTMLInputElement | null)[]>(new Array(6).fill(null)); // Initialize with nulls
const  baseurl ='https://dev.corealm.io/xt/'
  // Fetch 2FA method on component mount
  useEffect(() => {
    console.log('twoda userid',userId)
    if (userId) {
      start(userId);
    }
  }, [userId]);

  // Focus the first empty input when the dialog opens
  useLayoutEffect(() => {
    if (isOpened) {
      const firstEmptyIndex = otp.indexOf('');
      setTimeout(() => {
        if (firstEmptyIndex !== -1 && otpBoxReference.current[firstEmptyIndex]) {
          otpBoxReference.current[firstEmptyIndex]?.focus();
        }
      }, 100); // Small delay (e.g., 100ms)
    }
  }, [isOpened, otp]); // Trigger focus when OTP or dialog state changes

  // Function to fetch OTP type (email or authenticator app)
  const start = async (userId: string) => {
    const formData = new FormData();
    formData.append('userID', userId);
    formData.append('regen', 'false');

    try {
      const response = await fetch(`${baseurl}auth/getType`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setEmail(data.user.email);
      if (data.user.twoFA.type === 'email') {
        setVerificationMethod('email');
      } else {
        setVerificationMethod('authenticatorApp');
      }
    } catch (error) {
      console.error('Error fetching 2FA type:', error);
    }
  };

  // Handle OTP input change
  const handleChange = (value: string, index: number) => {
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input field
      if (value && index < otp.length - 1) {
        otpBoxReference.current[index + 1]?.focus();
      }
    }
  };
  
// Handle Keydown for OTP fields to trigger handleSubmit
const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter' && otp.every((digit) => digit !== '')) {
    handleSubmit();  // Trigger handleSubmit when "Enter" is pressed
  }
};
  // Resend OTP function
  const handleResendOtp = async () => {
    try {
      const response = await fetch(`${baseurl}auth/twoFA`, {
        method: 'POST',
        body: JSON.stringify({ userID: userId, email }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        setSnackbarMessage('OTP sent successfully');
        setSnackbarOpen(true);
        setOtp(new Array(6).fill(''));
      } else {
        setSnackbarMessage('Something went wrong');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      setSnackbarMessage('Something went wrong');
      setSnackbarOpen(true);
    }
  };

  // Handle OTP form submission
  const handleSubmit = async () => {
    const enteredOtp = otp.join('');
    setHPLoaderStatus(true);

    try {
      const formData = new FormData();
      formData.append('otp', enteredOtp);
      formData.append('userID', userId);
      formData.append('email', email);
      formData.append('type', verificationMethod);

      const response = await fetch(`${baseurl}auth/verifyOTP`, {
        method: 'POST',
        body: formData,
      });

      if (response.status === 200) {
   
        const userDetails = await response.json()
        console.log(userDetails)
        console.log(userDetails.token)
        let token = userDetails.token
        await window.sideAPI.driver.setToken(token)
        fullname(`${userDetails.firstname} ${userDetails.lastname}`)
        cancel(false)
        // Assuming UiState.saveUserData() and ModalState.toggleTwoFAModal() are global state management methods
        // UiState.saveUserData(data);
        // ModalState.toggleTwoFAModal();
      } else if (response.status === 400) {
        setOtp(new Array(6).fill(''));
        setSnackbarMessage('Invalid OTP!');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('Something went wrong. Please try again');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setSnackbarMessage('Something went wrong');
      setSnackbarOpen(true);
    } finally {
      setHPLoaderStatus(false);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    cancel(true);
  };

  // Custom onClose handler to prevent backdrop click closing
  const handleClose = (_event: any, reason: any) => {
    if (reason === 'backdropClick') {
      // Prevent closing if the backdrop is clicked
      return;
    }
    cancel(true); // Call cancel if any other reason
  };


  return (
<>
  <Dialog
    open={isOpened}
    onClose={handleClose}
    sx={{
      '& .MuiDialog-paper': {
        width: '80%',
        maxWidth: '417px',
        margin: 'auto',
        height: 'auto', // Allow the dialog height to adjust dynamically
      },
    }}
  >
    <DialogTitle sx={{ textAlign: 'center' }}>
      <Typography variant="h6">
        <span style={{ fontWeight: 'bold', color: 'black' }}>CoreALM</span>
        <span style={{ fontWeight: 'bold', color: 'red' }}> XT</span>
      </Typography>
    </DialogTitle>

    {/* Make the content scrollable */}
    <DialogContent
      sx={{
        'overflow': 'auto',
        maxHeight: 'calc(100vh - 160px)', // Adjust based on desired dialog height and header/footer space
        paddingBottom: '10px',
      }}
    >
      <Typography variant="body1" gutterBottom style={{ fontSize: '13px', textAlign: 'center' }}>
        To help keep your account safe, we want to make sure it’s really you trying to sign in.
      </Typography>
      <Typography variant="body2" gutterBottom style={{ textAlign: 'center', marginTop: '30px' }}>
        Enter the OTP sent to your {verificationMethod}:
      </Typography>
      <div className="otp-inputs" style={{ display: 'flex', justifyContent: 'center' }}>
        {otp.map((digit, index) => (
          <TextField
            key={index}
            value={digit}
            onChange={(e) => handleChange(e.target.value, index)}
            onKeyDown={handleKeyDown}
            inputRef={(reference) => (otpBoxReference.current[index] = reference)}
            variant="outlined"
            margin="normal"
            type="text"
            inputProps={{
              maxLength: 1,
              pattern: '[0-9]*',
            }}
            sx={{
              marginRight: 1,
              width: 50,
              height: 50,
              '& input': {
                width: '50px',
                height: '50px',
                padding: '4px',
              },
            }}
          />
        ))}
      </div>

      {/* Center the Resend OTP button */}
      {verificationMethod === 'email' && (
        <Box display="flex" justifyContent="center">
          <Button variant="text" color="primary" onClick={handleResendOtp}>
            Resend OTP
          </Button>
        </Box>
      )}
    </DialogContent>

    {/* Center the Cancel and Verify buttons */}
    <DialogActions sx={{ justifyContent: 'center' }}>
      <Button
        onClick={handleSubmit}
        color="primary"
        variant="contained"
        sx={{ width: 150 }} // Make it a little wider if needed
        disabled={otp.some((digit) => digit === '') || hPLoaderStatus}
      >
        {hPLoaderStatus ? <CircularProgress size={24} /> : 'Verify'}
      </Button>
      <Button onClick={handleCancel} color="primary" sx={{ marginRight: 2 }} variant="outlined">
        Cancel
      </Button>
    </DialogActions>

    {/* Footer with copyright */}
    <DialogActions
      sx={{
        justifyContent: 'center',
        padding: '10px',
        borderTop: '1px solid lightgray',
        marginTop: '18px',
      }}
    >
      <Typography variant="body2" style={{ textAlign: 'center', fontSize: '12px', color: 'gray' }}>
        CoreALM XT <br />
        Copyright © 2025 CoreALM LLC. All rights reserved.
      </Typography>
    </DialogActions>
  </Dialog>

  {/* Snackbar for feedback */}
  <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
    <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarMessage.includes('Error') || snackbarMessage.includes('Invalid') ? 'error' : 'success'} sx={{ width: '100%' }}>
      {snackbarMessage}
    </Alert>
  </Snackbar>
</>

  );
};

export default TwoFADialog;
