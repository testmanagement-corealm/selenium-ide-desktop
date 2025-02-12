import AppWrapper from 'browser/components/AppWrapper'
import renderWhenReady from 'browser/helpers/renderWhenReady'
import React, { useState } from 'react'
import { Panel, PanelGroup } from 'react-resizable-panels'
//import SIDELogger from 'browser/components/Logger'
import PlaybackControls from 'browser/components/PlaybackControls'
import ProjectPlaybackWindow from 'browser/components/PlaybackPanel'
import ProjectEditor from 'browser/components/ProjectEditor'
import { usePanelGroup } from 'browser/hooks/usePanelGroup'
import { SessionContextProviders } from 'browser/contexts/provider'
// import ResizeHandle from 'browser/components/ResizeHandle'
import SendtoXt from 'browser/components/SendToXT'
import SaveasSide from 'browser/components/SaveasSide'
import LoginDialog from '../Splash/LoginDialog'


const ProjectMainWindow = () => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const[sideSavedialog, setsideSavedialog]= React.useState(false);
 const [loginOpen, setLoginOpen] = useState<boolean>(false)
 const [errorMessage, setErrorMessage] = useState<string>(''); // Store error messages
  const [fullName, setFullName] = useState<string>('')
  const handleCloseDialog = () => {
    setDialogOpen(false);
    // Send a message to the main process when the dialog is closed
    (window as any).electronAPI.sendMessageToMain('Dialog closed');
};

const handleClosesidesaveDialog = () => {
  setsideSavedialog(false);
  // Send a message to the main process when the dialog is closed
  (window as any).electronAPI.sendMessageToMain('Dialog closed');
};

  
  const handleSave = (data: {
    // testName: string;
    // description: string;
    project: string;
    // testType: string;
    // locatoryStrategy: string;
  }) => {
    console.log('Saved Data:', data);





    // Handle saved data (e.g., send to server or update state)
  };
  React.useEffect(() => {
    (window as any).electronAPI.onMenuItemClicked(async(message: any) => {
      console.log(`Received from main: ${message}`);
      let login =await getTokens()
      if(login){
        setLoginOpen(true)
      }else{
        setsideSavedialog(false)
        setDialogOpen(true)
      }
   
      //alert(message); // Display the alert
    });
  }, [])
  React.useEffect(() => {
    (window as any).electronAPI.onsideSaveClicked(async(message: any) => {
      console.log(`Received from main: ${message}`);
      let login =await getTokens()
      if(login){
          setLoginOpen(true)
      }else{
        setDialogOpen(false)
        setsideSavedialog(true)
      }
    
      //alert(message); // Display the alert
    });
  }, [])
  React.useEffect(() => {
    (window as any).electronAPI.closedialogClicked(async(message: any) => {
      console.log(`Received from main: ${message}`);
      setDialogOpen(false)
      setsideSavedialog(false)
    
      //alert(message); // Display the alert
    });
  }, [])


  
    const validateToken = async (token: any) => {
      try {
        const server = 'https://dev.corealm.io/xt/'
        const response = await fetch(server + 'auth/getuserid', {
          method: 'POST',
          mode: 'cors',
          cache: 'no-cache',
          headers: {
            Authorization: token,
          },
        })
        let userId = await response.text()
        // console.log("RRRESPONSE",await response.text());
        //  let userId=await response.text()
        if (response.ok) {
          // Using response.ok for a cleaner check
  
          const formData = new FormData()
          formData.append('userId', userId)
  
          const url = 'https://dev.corealm.io/xt/auth/getuserdetails'
          const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            body: formData,
            cache: 'no-cache',
          })
  
          // Check the response status
          if (response.status !== 200) {
            console.log(await response.json())
            // Indicate that login was unsuccessful
          } else {
            let fullName = await response.json()
            console.log(fullName.fullName)
            setFullName(fullName.fullName)
          }
          return true // Token is valid
        } else {
          console.log('Token is invalid or other error occurred')
          return false // Token is invalid or other errors
        }
      } catch (error) {
        console.error('Error validating token:', error)
        return false // Return false in case of an error
      }
    }
    const getTokens = async () => {
    
      let token =  await window.sideAPI.driver.getToken()
      console.log('Fetched Token:', token) // Log the fetched token

      const tokenvalidate = await validateToken(token)
      console.log('Token Validity:', tokenvalidate) // Log the validity of the token

      if (token && tokenvalidate) {
        console.log('Token exists:', token)
        return false // Hide modal if token exists
      } else {
        console.log('No token found, showing login.')
        return true // Show modal if no token
      }

    }
    const handleLogin = async (username: string, password: string) => {
      setErrorMessage('');
      setFullName('')
  
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
          setFullName(`${userDetails.firstname} ${userDetails.lastname}`)
          setLoginOpen(false); // Close the login dialog
       
        } else {
          const userDetails = await response.json();
          console.log(userDetails);
            userDetails.message = userDetails.message? userDetails.message:''
        userDetails.userId = userDetails.userId? userDetails.userId:''
        if(userDetails.message !=="TWOFA ENABLED"){
          setErrorMessage('Incorrect username or password.')
          setLoginOpen(false)
        }
          setLoginOpen(true);
          return userDetails
        }
      } catch (error) {
        console.error('Error during login:', error);
        setErrorMessage('An error occurred during login.');
        setLoginOpen(true);
      }
    };
  
  
  return(
  
  <AppWrapper>
          {loginOpen && (
        <LoginDialog
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onLogin={handleLogin}
          errorMessage={errorMessage}
          fullname={(name)=>{
            if(name){
              setFullName(name)
           
            }
            

          }}
        />
      )}
     <SendtoXt
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
      />
      <SaveasSide
       open={sideSavedialog}
       onClose={handleClosesidesaveDialog}
       onSave={handleSave}
      />
    <SessionContextProviders>
      <PanelGroup
        direction="horizontal"
        id="editor-playback"
         {...usePanelGroup('editor-playback')}
      >
      
        
        <Panel id="playback-logger-panel">
          <PanelGroup
            direction="vertical"
            id="playback-logger"
            {...usePanelGroup('playback-logger')}
          >
            <PlaybackControls />
            <Panel id="playback-panel">
              <ProjectPlaybackWindow />
            </Panel>
            {/* <ResizeHandle id="playback-logger-resize" x /> */}
            {/* <Panel className="pos-rel" id="logger-panel">
              <SIDELogger />
            </Panel> */}
          </PanelGroup>
        </Panel>
        {/* <ResizeHandle id="h-resize-2" y /> */}
        <Panel id="editor-panel">
          <ProjectEditor fullNameval={fullName} />
        </Panel>
      </PanelGroup>
    </SessionContextProviders>
  </AppWrapper>
)
}

renderWhenReady(ProjectMainWindow)
