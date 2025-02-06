import React, { useContext, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Typography,
  // Tabs,
  // Tab,
  // Checkbox,
  // FormControlLabel,
  // Dialog as ConfirmDialog,
  // DialogContentText,
} from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import { ProjectShape } from '@seleniumhq/side-model'
import CircularProgress from '@mui/material/CircularProgress';
import { Box } from '@mui/material';
import { context as activetestIDContext } from 'browser/contexts/active-test'
const LoadingOverlay = ({ isLoading, message}: { isLoading: boolean,message: string }) => {
  if (!isLoading) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent background
        display: 'flex',
        flexDirection: 'column',  // Stack content vertically
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000, // Ensure it appears above other content
        padding: 2,
      }}
    >
      <CircularProgress />
      {/* Show the message below the loader */}
      <Typography sx={{ marginTop: 2, fontSize: '1rem'}}>
        {message}
      </Typography>
    </Box>
  );
};

interface SendtoXtProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    testName: string
    description: string
    project: string
    testType: string
    locatoryStrategy: string
    selectedModules: any[]
  }) => void
}

let base_url = 'https://dev.corealm.io/xt/'
const base_url_ext = 'https://dev.corealm.io/xt/externalRoute/'
const SaveasSide: React.FC<SendtoXtProps> = ({ open, onClose }) => {
  const [testName, setTestName] = React.useState('')
 const { activeTestID } = useContext(activetestIDContext)
  const [description, setDescription] = React.useState('')
  const [project, setProject] = React.useState('')
  const [token, setToken] = React.useState('')
  const [returnMessage, setReturnMessage] = React.useState<{
    message: string
    status: 'success' | 'error'
  } | null>(null)
  const [testType, setTestType] = React.useState('side')
  const [locatoryStrategy, setLocatoryStrategy] = React.useState('absolute')
  const [projectList, setProjectList] = React.useState<any[]>([])

  const [_selectedModule, setSelectedModule] = React.useState<any[]>([])
  const [commandlist, setCommandlist] = React.useState<any[]>([])
  const[executionId, setExecutionId] = React.useState('')
  const [fulldata, setFulldata] = useState<ProjectShape>();

  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  // const [resumesaving, setResumeSaving] = React.useState<boolean>(false)
  const isFormValid = () => {
    return (
      testName &&
      description &&
      locatoryStrategy &&
      project 
     
    )
  }



  // const savemodule = async () => {
  //   setIsLoading(true) // Start loading

  //   let data = []
  //   // try {
  //   //   for (let i = 0; i < selectedModule.length; i++) {
  //   //     let cmds = await collectCommandsUpToNextStep(selectedModule[i].id)
  //   //     let obj = {
  //   //       modulename: selectedModule[i].value,
  //   //       moduledescription: selectedModule[i].comment,
  //   //       moduledetails: cmds,
  //   //     }
  //   //     data.push(obj)
  //   //   }

  //   //   // console.log('create module job', data)
  //   //   const ids = selectedModule.map((obj) => obj.value)
  //   //   const formData = new FormData()
  //   //   formData.append('projectId', project)
  //   //   formData.append('modules', JSON.stringify(data))
  //   //   let response = await fetch(`${base_url}functional/exportModules`, {
  //   //     method: 'POST',
  //   //     headers: {
  //   //       Authorization: token,
  //   //     },
  //   //     body: formData,
  //   //   })

  //   //   if (response.status == 201) {
  //   //     const formData1 = new FormData()
  //   //     formData1.append('projectId', project)
  //   //     formData1.append('testName', testName)
  //   //     formData1.append('testDescription', description)
  //   //     formData1.append('module', 'true')
  //   //     formData1.append('locatorType', locatoryStrategy)
  //   //     let response1 = await fetch(`${base_url}functional/saveModulejob`, {
  //   //       method: 'POST',
  //   //       headers: {
  //   //         Authorization: token,
  //   //       },
  //   //       body: formData1,
  //   //     })

  //   //     if (response1.status === 200) {
  //   //       let data = await response1.json()
  //   //       const formData1 = new FormData()
  //   //       formData1.append('projectId', project)
  //   //       formData1.append('testName', testName)
  //   //       formData1.append('executionId', data.executionId)
  //   //       formData1.append('modules', JSON.stringify(ids))
  //   //       let response2 = await fetch(
  //   //         `${base_url}functional/createModulejobs`,
  //   //         {
  //   //           method: 'POST',
  //   //           headers: {
  //   //             Authorization: token,
  //   //           },
  //   //           body: formData1,
  //   //         }
  //   //       )

  //   //       if (response2.status === 201) {
  //   //         const message = await response2.json()
  //   //         setReturnMessage({
  //   //           message: message.message || 'Test case created successfully with modules.',
  //   //           status: 'success',
  //   //         })
  //   //       } else {
  //   //         setReturnMessage({
  //   //           message: 'Failed to create module jobs.',
  //   //           status: 'error',
  //   //         })
  //   //       }
  //   //     }else if(response1.status == 400){
  //   //       setReturnMessage({
  //   //         message: 'Test name already exist.',
  //   //         status: 'error',
  //   //       })
  //   //       setResumeSaving(true)
  //   //       setActiveTab(0)
  //   //       return
     
  //   //     } else {
  //   //       setReturnMessage({
  //   //         message: 'Failed to save module job.',
  //   //         status: 'error',
  //   //       })
  //   //     }
  //   //   } else {
  //   //     setReturnMessage({
  //   //       message: 'Failed to export modules.',
  //   //       status: 'error',
  //   //     })
  //   //   }
  //   //   setResumeSaving(false)
  //   //   // console.log('save module', project, testName, locatoryStrategy)
  //   //   // console.log('create module', ids)
  //   // } catch (error) {
  //   //   setResumeSaving(false)
  //   //   setReturnMessage({
  //   //     message: 'An error occurred during the process.',
  //   //     status: 'error',
  //   //   })
  //   // } finally {
  //   //   setIsLoading(false) // Stop loading
   
  //   // }
  // }

  const coreALM_XT_Service = async():Promise<[string, number]> =>{
    try {
     
      let file = JSON.stringify(fulldata, null, 2)
      let myblob = new Blob([file], {
        type: 'text/plain',
      })
      const formData = new FormData()
      formData.append('testName', testName)
      if (description !== '') {
        formData.append('testDesc',description)
      } else {
        formData.append('testDesc', 'Created By CoreALM RTA Desktop')
      }
      formData.append('projectId', project)
      
      formData.append('data0', myblob, testName + '.side')
      formData.append('testType', testType)
      formData.append('locatorstrategy', locatoryStrategy)
      
     
      let response = await fetch(`${base_url_ext}createFunctionalTest`, {
        method: 'POST',
        headers: {
          Authorization: token,
        },
        body: formData,
      })
      if(response.status == 200){
        let execId = await response.text()
        setExecutionId(execId)
        return [`${execId}`, 201]
      } if(response.status == 400){
        return ['Test name already exists!', 400]
      }else{
        return ['Failed to create!', 500]
      }
     
    } catch (error) {
      console.log(error)
      return ['Failed to create!', 500]
     
    }
  }

  // customr code for functional test execution
const run_CoreXT = async(execId: string) => {
  try {
    const formData = new FormData()
    formData.append('executionId', execId)
    let response = await fetch(`${base_url_ext}executeFunctionalTest`, {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: formData,
    })
    let res = await response.json()
    return res.status
  } catch (error) {
    console.log(error)
    return 500
  }

}
  const handleClose = async()=>{
     
        setSelectedModule([])
        // setCommandlist([])
    
        setReturnMessage(null)
        onClose();
  }
  const handleSave = async () => {
    try {
      setIsLoading(true)
      setReturnMessage(null)
      if(commandlist.length ===0){
        setReturnMessage({
          message: 'No Commands found in the test.',
          status: 'error',
        })
      }else{
       let res: [string, number]  = await coreALM_XT_Service()
       setReturnMessage({
        message: res[1]>201?`${res[0]}`:'Test is Uploaded Successfully!',
        status: res[1] > 201 ? 'error' : 'success', // Make sure `status` is a string
      })
       console.log('res', res)
      }
    } catch (error) {
      console.log(error)
    }finally{
      setIsLoading(false)
    }
 
   
  }

  const handleRun = async()=>{
    try {
      setIsLoading(true)
      setReturnMessage(null)
      if(commandlist.length ===0){
        setReturnMessage({
          message: 'No Commands found in the test.',
          status: 'error',
        })
      }else{
        let res: [string, number] =[executionId,201]
        if(!executionId){
          res  = await coreALM_XT_Service()
        }
    
       if(res[1] == 201){
       let resval = await run_CoreXT(res[0])
      
        setReturnMessage({
          message: resval> 201?'Failed to start the test':'Test started Successfully!',
          status: resval > 201 ? 'error' : 'success', // Make sure `status` is a string
        })
       
       
       }else{
        setReturnMessage({
          message: `${res[0]}`,
          status: 'error', // Make sure `status` is a string
        })
       }
      
       console.log('res', res)
      }
    } catch (error) {
      console.log(error)
    }finally{
     setIsLoading(false)
    }
  
  }

  const fetchUserProjects = async () => {
    try {
      let token = await window.sideAPI.driver.getToken()

      // Check if token is defined, and if not, handle the error or set a default value
      if (!token) {
        console.error('Token not received.')
        // Optionally set a fallback or handle this case appropriately
        return
      }
      setToken(token)

      console.log('FROM electron store', token)
      // const token = 'YOUR_TOKEN_HERE'; // Replace with actual token
      const usrData = await fetch(`${base_url}coAdmin/getCurrentUser`, {
        method: 'POST',
        headers: {
          Authorization: token,
        },
      })

      const data = await usrData.json()
      const isAdmin = data[0]?.isSuperAdmin || data[0]?.isAdmin

      let response
      if (isAdmin) {
        response = await fetch(`${base_url}coAdmin/getProjectList`, {
          method: 'POST',
          headers: {
            Authorization: token,
          },
        })
      } else {
        response = await fetch(`${base_url}coAdmin/getProjectListUser`, {
          method: 'POST',
          headers: {
            Authorization: token,
          },
        })
      }

      const tempData = await response.json()
      const projects = isAdmin
        ? tempData
        : tempData.map((item: any) => ({
            id: item.projectId,
            name: item['project.name'],
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            userId: item.userId,
          }))

      // console.log('Fetched projects:', projects)
      setProjectList(projects)
      if (projects.length > 0) {
        setProject(projects[0].id) // Set default selected project
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  React.useEffect(() => {
    const handleGet = async () => {
      const activeProject = await window.sideAPI.projects.getActive()
      if (activeProject.tests.length > 0) {
        const data = activeProject.tests[0]
        setFulldata(activeProject)
        setTestName(data.name)
        setDescription(data.name || '')
        console.log('data', data)
         setCommandlist(data.commands)
        setTestType('side')
      }
      await fetchUserProjects() // Fetch user projects
    }

    if (open) {
      handleGet()
    }
  }, [open])



const handletestnameChange = async(inputValue: string)=> {
  try {
    const regex = /[!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/? ]+/gi;
    setReturnMessage(null)
    console.log("testname", inputValue.length ,inputValue);

    console.log('active test', fulldata)

    if (inputValue.length >= 50) {
      setReturnMessage({
        'message':'Test name must be less than 50 characters',
        'status':'error'
      })
    
    } else if (regex.test(inputValue)) {
      setReturnMessage({
        'message':"Space and special characters are not allowed",
        'status':'error'
      })
    } else {
      setTestName(inputValue);
      await window.sideAPI.tests.rename(activeTestID, inputValue)
      setFulldata((prevval) => {
        if (!prevval) {
          // Return an empty or default structure if `prevval` is undefined
          return prevval; // or return an empty object or default structure for ProjectShape
        }
        
        return {
          ...prevval,
          tests: prevval.tests?.map((test, index) =>
            index === 0 ? { ...test, name: inputValue} : test
          ),
        };
      });
      
    }
  } catch (error) {
    console.log(error);
  }
}




  const handleCloseDialog = (_event: React.SyntheticEvent, _reason: 'backdropClick' | 'escapeKeyDown') => {
    // if (reason === 'backdropClick') {
    //   // Prevent closing the dialog on backdrop click
    //   return;
    // }
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleCloseDialog} >
    
          <DialogTitle sx={{ borderBottom: '2px solid #ccc' }}>
            Save Side File (CoreALM XT)
          </DialogTitle>
        <DialogContent  sx={{ position: 'relative' }}>
          {/* <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="config and modules tabs"
          >
            <Tab label="Test Configuration" />
           
          </Tabs> */}

          {/* {activeTab === 0 && ( */}
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Test Name"
                value={testName}
                fullWidth
                margin="normal"
                size='small'
                onChange={(e) => { setExecutionId('')
                  handletestnameChange(e.target.value); }}
              />
              <TextField
                label="Description"
                value={description}
                onChange={(e) => { 
                  setExecutionId('')
                  setDescription(e.target.value)
                }}
                fullWidth
                   size='small'
                margin="normal"
              />

              <FormControl fullWidth margin="normal"    size='small'>
                <InputLabel id="project-label">Select Project</InputLabel>
                <Select
                  labelId="project-label"
                  id="project-select"
                  value={project}
                  label="Select Project"
                  onChange={(e: SelectChangeEvent<string>) =>
                     {setExecutionId('')
                    setProject(e.target.value)
                     }
                  }
                  displayEmpty
                  required
                >
                  {projectList.length === 0 ? (
                    <MenuItem value="noproj" disabled>
                      No projects available
                    </MenuItem>
                  ) : (
                    projectList.map((proj) => (
                      <MenuItem key={proj.id} value={proj.id}>
                        {proj.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal"    size='small'>
                <InputLabel id="test-type-label">Test Type</InputLabel>
                <Select
                  labelId="test-type-label"
                  id="test-type-select"
                  value={testType}
                  label="Test Type"
                  onChange={(e: SelectChangeEvent<string>) =>{
                   setExecutionId('')
                    setTestType(e.target.value)
                  }
                  }
                  required
                >
                  <MenuItem value="side">Side</MenuItem>
                  <MenuItem value="webrtc">WebRTC</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal"    size='small'>
                <InputLabel id="locatory-strategy-label">
                  Locatory Strategy
                </InputLabel>
                <Select
                  labelId="locatory-strategy-label"
                  id="locatory-strategy-select"
                  value={locatoryStrategy}
                  label="Locatory Strategy"
                  onChange={(e: SelectChangeEvent<string>) =>{ setExecutionId('')
                    setLocatoryStrategy(e.target.value)
                  }
                  }
                  displayEmpty
                  required
                >
                  <MenuItem value="default">CSS</MenuItem>
                  <MenuItem value="absolute">XPath</MenuItem>
                </Select>
              </FormControl>
            </Box>
          {/* )} */}

       
         <LoadingOverlay isLoading={isLoading} message="Your test is being uploaded. Please wait..." />
        </DialogContent>
       {
          returnMessage && (
            <div
              style={{
                margin: 'auto',
                color: returnMessage.status === 'error' ? 'red' : 'green',
              }}
            >
              {returnMessage.message}
            </div>
          )
        }
        <DialogActions  sx={{ borderTop: '2px solid #ccc' }}>
          <Button onClick={handleClose} color="primary" disabled={isLoading}  variant='outlined'>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            disabled={!isFormValid() || isLoading}
            variant="contained" 
          >
            Save Test
          </Button>
          <Button onClick={handleRun} color="primary" disabled={!isFormValid() || isLoading}       variant="contained" style={{'marginRight':'13px'}} >
            Run Test
          </Button>
        </DialogActions>
      </Dialog>

  
    </>
  )
}

export default SaveasSide
