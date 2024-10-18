import React, { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import AppWrapper from 'browser/components/AppWrapper'
import renderWhenReady from 'browser/helpers/renderWhenReady'
import languageMap from 'browser/I18N/keys'
import { FormattedMessage } from 'react-intl'
import LoginDialog from './LoginDialog' // Import the new LoginDialog component
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AccountCircle from '@mui/icons-material/AccountCircle'; 

const ProjectEditor = () => {
  const [logPath, setLogPath] = useState<string>('...')
  const [recentProjects, setRecentProjects] = useState<string[]>([])
  const [loginOpen, setLoginOpen] = useState<boolean>(false)
// const [loginOpen, setLoginOpen] = useState<boolean>(true);
const [errorMessage, setErrorMessage] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
   const [fullName, setFullName] = useState<string>(''); 
  //    const [username, setUsername] = useState<string>(''); // Track username input
  // const [password, setPassword] = useState<string>(''); 
  const fetchToken = async () => {
    try {
      const data = await window.sideAPI.driver.getToken()
      console.log("FROM electron store", data)
      return data;
    } catch (error) {
      console.error("Error fetching token:", error);
      return null; // Return null on error
    }
  }

const validateToken = async (token: any) => {
  try {

    const server = 'https://dev.corealm.io/xt/';
    const response = await fetch(server + 'auth/getuserid', {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Authorization': token,
      },
    });
    let userId=await response.text();
    // console.log("RRRESPONSE",await response.text());
    //  let userId=await response.text()    
    if (response.ok) { // Using response.ok for a cleaner check
      
      const formData = new FormData();
      formData.append('userId', userId);

      const url = 'https://dev.corealm.io/xt/auth/getuserdetails';
        const response = await fetch(url, {
          method: 'POST',
          mode: 'cors',
          body: formData,
          cache: 'no-cache',
         });

    // Check the response status
    if (response.status !== 200) {
        console.log(await response.json())
      // Indicate that login was unsuccessful
    }else{
              let fullName=await response.json()
              console.log(fullName.fullName)
              setFullName(fullName.fullName)
        }
      return true; // Token is valid
    }  else {
      console.log("Token is invalid or other error occurred");
      return false; // Token is invalid or other errors
    }
  } catch (error) {
    console.error("Error validating token:", error);
    return false; // Return false in case of an error
  }
};


 useEffect(() => {
  const getTokens = async () => {
    const token = await fetchToken();
    console.log("Fetched Token:", token); // Log the fetched token

    const tokenvalidate = await validateToken(token);
    console.log("Token Validity:", tokenvalidate); // Log the validity of the token

    if (token && tokenvalidate) {
      
      console.log("Token exists:", token);
      setLoginOpen(false); // Hide modal if token exists
    } else {
      console.log("No token found, showing login.");
      setLoginOpen(true); // Show modal if no token
    }

    // Load log path and recent projects
    window.sideAPI.system.getLogPath().then(setLogPath);
    window.sideAPI.projects.getRecent().then(setRecentProjects);
  };

  getTokens();
}, []);

const handleLogout = async () => {
    await window.sideAPI.driver.setToken(''); // Clear the token
    setFullName('Guest'); // Set full name to "Guest"
    setLoginOpen(true); // Show login dialog
    handleMenuClose(); // Close the menu
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
 const handleLogin = async (username: string, password: string) => {
  console.log('Login attempt:', { username, password });
 setErrorMessage('');
  const formData = new FormData();
  formData.append('email', username);
  formData.append('password', password);

  const url = 'https://dev.corealm.io/xt/auth/login';

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      body: formData,
      cache: 'no-cache',
    });

    // Check the response status
    if (response.status !== 200) {
      const userDetails = await response.json();
      console.log('Login failed!', userDetails);
      setErrorMessage('Incorrect username or password.');
      setLoginOpen(true);
       
      return false; // Indicate that login was unsuccessful
    }

    // If login is successful, process user details
    const userDetails = await response.json();
    console.log(userDetails);
    console.log(userDetails.token);
    let token=userDetails.token
    await window.sideAPI.driver.setToken(token)
    setLoginOpen(false); // Close the modal on successful login
    setFullName(`${userDetails.firstname} ${userDetails.lastname}`); 
    console.log(`${userDetails.firstname} ${userDetails.lastname}`);
    
    // You can store the user details or perform other actions here
    // e.g., await chrome.storage.local.set({ user: userDetails });

    return true; // Indicate successful login

  } catch (error) {
    console.error('Error during login:', error);
     setErrorMessage('An error occurred during login.');
    setLoginOpen(true); // Show login dialog on error
    return false; // Indicate that there was an error
  }
};


  const loadProject = async () => {
    const response = await window.sideAPI.dialogs.open()
    if (response.canceled) return
    await window.sideAPI.projects.load(response.filePaths[0])
  }

  const newProject = async () => {
    await window.sideAPI.projects.new()
  }
//  const isLoginButtonDisabled = !username || !password;
  return (
<AppWrapper>
      {loginOpen && <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} errorMessage={errorMessage} />}

      <Grid container spacing={3} style={{ padding: '20px' }}>
        <Grid item xs={12}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item xs>
              <Grid container direction="column" alignItems="center">
                <Typography variant="h4" gutterBottom>
                  <FormattedMessage id={languageMap.splash.present} />
                </Typography>
                <Typography variant="caption" display="block">
                  <FormattedMessage id={languageMap.splash.logPath} /> "{logPath}"
                </Typography>
                <Typography variant="subtitle1">
                  <FormattedMessage id={languageMap.splash.openNotice} />
                </Typography>
              </Grid>
            </Grid>
            <Grid item>
  <Grid container alignItems="center">
    <IconButton onClick={handleMenuClick} size="large">
      <AccountCircle fontSize="large" />
    </IconButton>
    <Typography variant="body1" style={{ marginLeft: '8px', marginRight: '8px' }}>
      {fullName}
    </Typography>
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleLogout} style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
        Logout
      </MenuItem>
    </Menu>
  </Grid>
</Grid>

          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Button data-load-project onClick={loadProject} variant="contained" fullWidth color="primary">
            <FormattedMessage id={languageMap.splash.loadProject} />
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button data-new-project onClick={newProject} variant="outlined" fullWidth color="secondary">
            <FormattedMessage id={languageMap.splash.createProject} />
          </Button>
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            <FormattedMessage id={languageMap.splash.openRecent} />
          </Typography>
          <List dense>
            {recentProjects.map((filepath, index) => (
              <ListItem
                disablePadding
                key={index}
                onClick={() => {
                  window.sideAPI.projects.load(filepath).then(() => {
                    window.sideAPI.projects.getRecent().then(setRecentProjects);
                  });
                }}
              >
                <ListItemButton>
                  <ListItemText primary={filepath} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    </AppWrapper>
  );
};

renderWhenReady(ProjectEditor)
