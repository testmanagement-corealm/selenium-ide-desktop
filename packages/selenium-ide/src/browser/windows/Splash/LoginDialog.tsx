import React, { useState } from 'react';
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

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
      
        <TextField
          autoFocus
          margin="dense"
          label="Username"
          type="text"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
  margin="dense"
  label="Password"
  type={showPassword ? 'text' : 'password'} // Use showPassword to toggle
  fullWidth
  value={password}
  onChange={(e) => setPassword(e.target.value)}
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
