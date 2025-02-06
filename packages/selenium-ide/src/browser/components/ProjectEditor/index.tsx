import Box from '@mui/material/Box'
import { useEffect, useState } from 'react'
import SIDEAppBar from 'browser/components/AppBar'
import SIDEDrawer from 'browser/components/Drawer'
import Main from 'browser/components/Main'
import { context } from 'browser/contexts/show-drawer'
import { PROJECT_TAB, TAB } from 'browser/enums/tab'
import { usePanelGroup } from 'browser/hooks/usePanelGroup'
import React, { useContext } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Panel, PanelGroup } from 'react-resizable-panels'
import ResizeHandle from '../ResizeHandle'
import Grid from '@mui/material/Grid'
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton'
import AccountCircle from '@mui/icons-material/AccountCircle';
import LoginDialog from 'browser/windows/Splash/LoginDialog'
// import Typography from '@mui/material/Typography'
export type PluginWindow = {
  name: string
  url: string
}
interface ProjectEditorProps {
  fullNameval: string; // Define the expected prop type here
}

const ProjectEditor: React.FC<ProjectEditorProps> = ({ fullNameval }) => {
  const [tab, setTab] = React.useState<TAB>(PROJECT_TAB)
  const showDrawer = useContext(context)
  const [pluginWindows, setPluginWindows] = React.useState<PluginWindow[]>([])
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false); // Track login state
    const [fullName, setFullName] = useState<string>(''); // Store the full name of the user
    const [loginOpen, setLoginOpen] = useState<boolean>(false); // Control the login dialog
    const [errorMessage, setErrorMessage] = useState<string>(''); // Store error messages
  React.useEffect(() => {
    const handler = (name: string, url: string) => {
      setPluginWindows((prev) => prev.concat({ name, url }))
    }
    window.sideAPI.plugins.onRequestCustomEditorPanel.addListener(handler)
    return () => {
      window.sideAPI.plugins.onRequestCustomEditorPanel.removeListener(handler)
    }
  }, [])
  React.useEffect(() => {
    console.log('fullnameval---------------',fullNameval)

      setFullName(fullNameval?fullNameval:'Guest')
      setIsLoggedIn(fullNameval? true:false)
  
  }, [fullNameval])


  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // if(fullNameval){
    //   setFullName(fullNameval)
    //   setIsLoggedIn(true)
    // }
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
  //console.log('showdrawer', showDrawer)
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col height-100 pb-1 ps-1 window-drag" style={{'background':'white'}}>
      <div className="no-window-drag" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' ,background:'white','height':'33px'}}>
  <SIDEAppBar setTab={setTab} tab={tab} />
  
  {loginOpen && (
    <LoginDialog
      open={loginOpen}
      onClose={() => setLoginOpen(false)}
      onLogin={handleLogin}
      errorMessage={errorMessage}
    />
  )}

  <Grid item style={{ display: 'flex', alignItems: 'center' }}>
    <Grid container alignItems="center" style={{ display: 'flex', alignItems: 'center' }}>
      <IconButton onClick={handleMenuClick} size="large" style={{'color':'#3B7ACD'}}>
        <AccountCircle fontSize="large" />
      </IconButton>
  
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      > <MenuItem
  
     
    >
      Hi {fullName}
    </MenuItem>
    {isLoggedIn ? (
  <MenuItem onClick={handleLogout}>
    Logout
  </MenuItem>
) : (
  <MenuItem onClick={() => setLoginOpen(true)}>
    Login
  </MenuItem>
)}
      </Menu>
    </Grid>
  </Grid>
</div>

        <PanelGroup direction="vertical" id="plugin-windows">
          <Panel defaultSize={100} id="plugin-windows-panel">
            <div className="flex-col flex-1 height-100 no-window-drag">
              <PanelGroup
                direction="horizontal"
                id="drawer-editor"
                {...usePanelGroup('drawer-editor', !showDrawer)}
              >
                {showDrawer && (
                  <>
                    <Panel
                      collapsible
                      id="editor-drawer"
                      defaultSize={25}
                      order={1}
                    >
                      <SIDEDrawer tab={tab} />
                    </Panel>
                    <ResizeHandle id="h-resize-1" y />
                  </>
                )}
                <Panel defaultSize={75} id="editor-panel" order={2}>
                  <Box className="fill flex flex-col">
                    <Main setTab={setTab} tab={tab} />
                  </Box>
                </Panel>
              </PanelGroup>
            </div>
          </Panel>
          {pluginWindows.map((pluginWindow, index) => (
            <React.Fragment key={index}>
              <ResizeHandle id={`v-resize-${index}`} x />
              <Panel key={index} id={pluginWindow.name}>
                <iframe
                  className="fill"
                  src={pluginWindow.url}
                  title={pluginWindow.name}
                />
              </Panel>
            </React.Fragment>
          ))}
        </PanelGroup>
      </div>
    </DndProvider>
  )
}

export default ProjectEditor
