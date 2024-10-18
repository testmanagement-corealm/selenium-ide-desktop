import Paper from '@mui/material/Paper'
import React, { useEffect, useState } from 'react'
import PlaybackDimensionControls from '../PlaybackDimensionControls'
import PlaybackTabBar from '../PlaybackTabBar'
import { TabShape } from '../PlaybackTabBar/tab'
import URLBar from '../URLBar'
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import AccountCircle from '@mui/icons-material/AccountCircle';
import LoginDialog from '../../windows/Splash/LoginDialog'; // Import your LoginDialog component

const {
  windows: {
    onPlaybackWindowChanged,
    onPlaybackWindowClosed,
    onPlaybackWindowOpened,
  },
} = window.sideAPI

const tabBarSX = {
  borderBottom: 1,
  borderColor: 'grey.500',
}

const PlaybackControls: React.FC = () => {
  const [tabs, setTabs] = useState<TabShape[]>([])
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false); // Track login state
  const [fullName, setFullName] = useState<string>(''); // Store the full name of the user
  const [loginOpen, setLoginOpen] = useState<boolean>(false); // Control the login dialog
  const [errorMessage, setErrorMessage] = useState<string>(''); // Store error messages

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await window.sideAPI.driver.setToken(''); // Clear the token
   await window.sideAPI.driver.stopProcessonLogout()
    setIsLoggedIn(false); // Update login state
    setFullName('Guest'); // Reset full name
    handleMenuClose();
  };

  const handleLogin = async (username: string, password: string) => {
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

      if (response.ok) {
        const userDetails = await response.json();
        await window.sideAPI.driver.setToken(userDetails.token);
        setFullName(`${userDetails.firstname} ${userDetails.lastname}`);
        setIsLoggedIn(true);
        setLoginOpen(false); // Close the login dialog
        handleMenuClose();
      } else {
        const userDetails = await response.json();
        console.log(userDetails);
        
        setErrorMessage('Incorrect username or password.');
        setLoginOpen(true);
      }
    } catch (error) {
      console.error('Error during login:', error);
      setErrorMessage('An error occurred during login.');
      setLoginOpen(true);
    }
  };

  const fetchTokens = async () => {
    try {
    
      const data = await window.sideAPI.driver.getToken();
      console.log("FROM electron store", data);
      return data;
    } catch (error) {
      console.error("Error fetching token:", error);
      return null; // Return null on error
    }
  };

  useEffect(() => {
    
    const fetchToken = async () => {
      try {
        const token = await fetchTokens(); // Ensure this returns a token or undefined
        if (token) {
          const response = await fetch('https://dev.corealm.io/xt/auth/getuserid', {
            method: 'POST',
            headers: { 'Authorization': token },
          });

          const responseText = await response.text(); // Get the raw response text
          console.log("Response Text:", responseText); // Log it to the console
          let userId=responseText;

          if (response.ok) {
            // const userDetails = JSON.parse(responseText); // Parse the JSON
            // setFullName(`${userDetails.firstname} ${userDetails.lastname}`);

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
              console.log("IN IF");
              let fullName=await response.json()
              console.log(fullName.fullName)
              setFullName(fullName.fullName)
    }


            setIsLoggedIn(true);
            setLoginOpen(false); // Token is valid, user is logged in
          } else {
            setLoginOpen(true); // Token is invalid, show login dialog
          }
        } else {
          setLoginOpen(true); // No token found, show login dialog
        }
      } catch (error) {
        console.error('Error fetching token:', error);
        setLoginOpen(true); // Show login dialog on error
      }
    };

    fetchToken(); // Call the async function
  }, []);

  useEffect(() => {
    onPlaybackWindowChanged.addListener((id, partialTab) => {
      setTabs((tabs) => {
        const tab = tabs.find((tab) => tab.id === id)
        if (!tab) return tabs
        return tabs.map((tab) => {
          if (tab.id !== id) return tab
          return {
            ...tab,
            ...partialTab,
          }
        })
      })
    })
    onPlaybackWindowOpened.addListener((id, { test = '', title = '', url }) => {
      setTabs((tabs) => {
        const hasTab = tabs.some((tab) => tab.id === id)
        if (hasTab) {
          return tabs
        }
        return tabs.concat({
          id,
          focused: false,
          test,
          title,
          url,
          visible: false,
        })
      })
    })
    onPlaybackWindowClosed.addListener((id) => {
      setTabs((tabs) => tabs.filter((tab) => tab.id !== id))
    })
  }, [])
  return (
    <Paper className="flex flex-col flex-initial width-100 window-drag">
      {loginOpen && (
        <LoginDialog
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onLogin={handleLogin}
          errorMessage={errorMessage}
        />
      )}
      <Grid container justifyContent="flex-end">
        <Grid item>
          <Grid container alignItems="center">
            <IconButton onClick={handleMenuClick} size="large">
              <AccountCircle fontSize="large" />
            </IconButton>
            <Typography variant="body1" style={{ marginLeft: '8px', marginRight: '8px' }}>
              {isLoggedIn ? fullName : 'Guest'}
            </Typography>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={isLoggedIn ? handleLogout : () => setLoginOpen(true)} 
                style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
                {isLoggedIn ? 'Logout' : 'Login'}
              </MenuItem>
            </Menu>
          </Grid>
        </Grid>
      </Grid>
      <PlaybackTabBar tabs={tabs} />
      <div className="flex flex-row flex-initial no-window-drag">
        <Paper
          className="flex flex-1 height-100 py-2 ps-3 z-3"
          elevation={2}
          square
          sx={tabBarSX}
        >
          <URLBar tab={tabs.find((t) => t.visible) ?? null} />
          <PlaybackDimensionControls />
        </Paper>
      </div>
    </Paper>
  )
}

export default PlaybackControls
