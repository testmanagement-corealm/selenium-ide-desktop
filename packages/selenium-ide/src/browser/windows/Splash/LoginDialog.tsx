import React, { useState,useEffect,useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => void;
  errorMessage?: string; // Optional error message prop
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onClose, onLogin, errorMessage }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const handleLogin = () => {
    onLogin(username, password);
  };

  const handleClose = (event: any, reason: any) => {
    if (reason === 'backdropClick') {
      console.log(event)
      return;
      
    }
    onClose();
    console.log(reason)
  };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (username && password) {
        handleLogin(); // Call login function if both fields are filled
      } else {
        passwordRef.current?.focus(); // Move focus to password field if in username field
      }
    }
  };
  const stopOverlay=async()=>{
    try{
           await window.sideAPI.driver.stopProcessonMenuclick();
    }catch(err){
      console.log(err)
    }
  }
useEffect(() => {
    stopOverlay();
    // Focus on the username input when the dialog opens
    const usernameInput = document.getElementById('username-input');
    usernameInput?.focus();
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        style: { zIndex: 99999999 },
      }}
    >
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
           <TextField
          id="username-input"
          autoFocus
          margin="dense"
          label="Username"
          type="text"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <TextField
          margin="dense"
          label="Password"
          type={showPassword ? 'text' : 'password'} // Use showPassword to toggle
          fullWidth
          value={password}
          
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={passwordRef}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)} // Toggle visibility
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {errorMessage && (
          <Typography variant="body2" color="error" style={{ marginBottom: '16px' }}>
            {errorMessage}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleLogin} variant="contained" color="primary" disabled={!username || !password}>
          Login
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginDialog;
