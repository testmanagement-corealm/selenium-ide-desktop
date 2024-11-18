import React from 'react'
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
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Dialog as ConfirmDialog,
  DialogContentText,
} from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import { CommandShape } from '@seleniumhq/side-model'
import CircularProgress from '@mui/material/CircularProgress';
import { Box } from '@mui/material';

const LoadingOverlay = ({ isLoading }: { isLoading: boolean }) => {
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
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000, // Ensure it appears above other content
          }}
      >
          <CircularProgress />
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

const SendtoXt: React.FC<SendtoXtProps> = ({ open, onClose, onSave }) => {
  const [testName, setTestName] = React.useState('')
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
  const [activeTab, setActiveTab] = React.useState(0)
  const [moduleItems, setModuleItems] = React.useState<CommandShape[]>([])
  const [selectedModule, setSelectedModule] = React.useState<any[]>([])
  const [commandlist, setCommandlist] = React.useState<any[]>([])
  const [showConfirmModal, setShowConfirmModal] = React.useState(false)
  const [confirmAction, setConfirmAction] = React.useState<() => void>(
    () => () => {}
  )
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [resumesaving, setResumeSaving] = React.useState<boolean>(false)
  const isFormValid = () => {
    return (
      testName &&
      description &&
      locatoryStrategy &&
      project &&
      moduleItems.length > 0 &&
      selectedModule.length >0
    )
  }

  // Function to collect commands from a given id up to the next "step" command
  async function collectCommandsUpToNextStep(startId: string) {
    let startIndex = -1
    const collectedCommands = []

    // First, find the index of the object with the given id
    for (let i = 0; i < commandlist.length; i++) {
      if (commandlist[i].id === startId) {
        startIndex = i
        break
      }
    }

    if (startIndex === -1) {
      console.error('ID not found in the array.')
      return null // ID not found
    }

    // Include the object with the matching id as the first step command
    collectedCommands.push(commandlist[startIndex])

    // Iterate through the next objects to collect commands until the next "step" command is found
    for (let i = startIndex + 1; i < commandlist.length; i++) {
      if (commandlist[i].command === 'step') {
        break // Stop collecting once the next "step" command is encountered
      }
      collectedCommands.push(commandlist[i]) // Collect the command
    }

    // If no commands were collected, return null
    if (collectedCommands.length === 0) {
      console.log('No commands collected.')
      return null
    }

    return collectedCommands
  }

  const checkstepunique = async () => {
    setReturnMessage(null)
    let updatedModules = [...selectedModule]
    console.log('resumesaving', resumesaving)
    if(!resumesaving){
      const formData = new FormData()
      formData.append('projectId', project)
      formData.append('modules', JSON.stringify(selectedModule))
      let response = await fetch(`${base_url}functional/moduleValidation`, {
        method: 'POST',
        headers: {
          Authorization: token,
        },
        body: formData,
      })
      if (response.status == 200) {
        updatedModules = await response.json()
        setSelectedModule(updatedModules)
      }
    }
    return updatedModules
  }


  const savemodule = async () => {
    setIsLoading(true) // Start loading

    let data = []
    try {
      for (let i = 0; i < selectedModule.length; i++) {
        let cmds = await collectCommandsUpToNextStep(selectedModule[i].id)
        let obj = {
          modulename: selectedModule[i].value,
          moduledescription: selectedModule[i].comment,
          moduledetails: cmds,
        }
        data.push(obj)
      }

      // console.log('create module job', data)
      const ids = selectedModule.map((obj) => obj.value)
      const formData = new FormData()
      formData.append('projectId', project)
      formData.append('modules', JSON.stringify(data))
      let response = await fetch(`${base_url}functional/exportModules`, {
        method: 'POST',
        headers: {
          Authorization: token,
        },
        body: formData,
      })

      if (response.status == 201) {
        const formData1 = new FormData()
        formData1.append('projectId', project)
        formData1.append('testName', testName)
        formData1.append('testDescription', description)
        formData1.append('module', 'true')
        formData1.append('locatorType', locatoryStrategy)
        let response1 = await fetch(`${base_url}functional/saveModulejob`, {
          method: 'POST',
          headers: {
            Authorization: token,
          },
          body: formData1,
        })

        if (response1.status === 200) {
          let data = await response1.json()
          const formData1 = new FormData()
          formData1.append('projectId', project)
          formData1.append('testName', testName)
          formData1.append('executionId', data.executionId)
          formData1.append('modules', JSON.stringify(ids))
          let response2 = await fetch(
            `${base_url}functional/createModulejobs`,
            {
              method: 'POST',
              headers: {
                Authorization: token,
              },
              body: formData1,
            }
          )

          if (response2.status === 201) {
            const message = await response2.json()
            setReturnMessage({
              message: message.message || 'Test case created successfully with modules.',
              status: 'success',
            })
          } else {
            setReturnMessage({
              message: 'Failed to create module jobs.',
              status: 'error',
            })
          }
        }else if(response1.status == 400){
          setReturnMessage({
            message: 'Test name already exist.',
            status: 'error',
          })
          setResumeSaving(true)
          setActiveTab(0)
          return
     
        } else {
          setReturnMessage({
            message: 'Failed to save module job.',
            status: 'error',
          })
        }
      } else {
        setReturnMessage({
          message: 'Failed to export modules.',
          status: 'error',
        })
      }
      setResumeSaving(false)
      // console.log('save module', project, testName, locatoryStrategy)
      // console.log('create module', ids)
    } catch (error) {
      setResumeSaving(false)
      setReturnMessage({
        message: 'An error occurred during the process.',
        status: 'error',
      })
    } finally {
      setIsLoading(false) // Stop loading
   
    }
  }

  const handleClose = async()=>{
        setModuleItems([])
        setSelectedModule([])
        setCommandlist([])
        setActiveTab(0)
        setReturnMessage(null)
        onClose();
  }
  const handleSave = async () => {
    const updatedModules = await checkstepunique()
    if (
      updatedModules.length > 0 &&
      updatedModules.some((module) => module.exists)
    ) {
      // Show confirmation dialog if a module already exists
      setActiveTab(1)
      setConfirmAction(() => async () => {
        const updatedSelectedModules = selectedModule.map(module => {
          if (module.exists) {
              const { exists, ...rest } = module; // Destructure to remove 'exists'
              return rest; // Return the module without 'exists'
          }
          return module; // Return the module as is if 'exists' is not present
      });
      setSelectedModule(updatedSelectedModules)
        await savemodule()
        onSave({
          testName,
          description,
          project,
          testType,
          locatoryStrategy,
          selectedModules: selectedModule,
        })
    
        // setModuleItems([])
        // setSelectedModule([])
        // setCommandlist([])
        // setActiveTab(0)
        // onClose();
      })
      setShowConfirmModal(true)
    } else {
      // Proceed to save if no existing modules
      await savemodule()
      onSave({
        testName,
        description,
        project,
        testType,
        locatoryStrategy,
        selectedModules: selectedModule,
      })
      // setModuleItems([])
      // setSelectedModule([])
      // setCommandlist([])
      // setActiveTab(0)
      // onClose();
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
        setTestName(data.name)
        setDescription(data.name || '')
        // console.log('data', data)
        setCommandlist(data.commands)
        const commandslist = data.commands.filter(
          (command: any) => command.command === 'step'
        )
        // console.log('commands', commandslist)
        setModuleItems(commandslist)
        setSelectedModule(commandslist)
        setTestType('side')
      }
      await fetchUserProjects() // Fetch user projects
    }

    if (open) {
      handleGet()
    }
  }, [open])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    // console.log('event', event)
 
    if (newValue === 1 && moduleItems.length === 0) {
      // If the user tries to switch to the "Modules" tab but it's not present, stay on the "Config" tab
      setActiveTab(0);
    } else {
      setActiveTab(newValue);
    }
  }

  const handleModuleChange = (index: number, value: string) => {
    const newItems = [...moduleItems]
    newItems[index].value = value
    setModuleItems(newItems)
    setSelectedModule(newItems)
  }

  const handleModulecheckboxChange = (item: any, checked: Boolean) => {
    const newItems = [...selectedModule]

    if (checked) {
      // Add the entire item to the selectedModule
      newItems.push(item)
    } else {
      // Remove the item based on its id
      const index = newItems.findIndex(
        (selectedItem) => selectedItem.id === item.id
      )
      if (index > -1) {
        newItems.splice(index, 1)
      }
    }

    setSelectedModule(newItems)
  }

  const handleConfirmSave = () => {
    confirmAction() // Call the action that was set for confirmation
    setShowConfirmModal(false) // Close the modal
  }

  const handleCancelConfirm = () => {
    setShowConfirmModal(false) // Just close the modal
  }

  const handleCloseDialog = (_event: React.SyntheticEvent, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick') {
      // Prevent closing the dialog on backdrop click
      return;
    }
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleCloseDialog} >
    
        <DialogTitle>Send to CoreALM XT Cloud</DialogTitle>
        <DialogContent  sx={{ position: 'relative' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="config and modules tabs"
          >
            <Tab label="Config" />
            {moduleItems.length > 0 && <Tab label="Modules" />}
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Test Name"
                value={testName}
                fullWidth
                margin="normal"
                onChange={(e) => setTestName(e.target.value)}
              />
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                margin="normal"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel id="project-label">Select Project</InputLabel>
                <Select
                  labelId="project-label"
                  id="project-select"
                  value={project}
                  label="Select Project"
                  onChange={(e: SelectChangeEvent<string>) =>
                    setProject(e.target.value)
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

              <FormControl fullWidth margin="normal">
                <InputLabel id="test-type-label">Test Type</InputLabel>
                <Select
                  labelId="test-type-label"
                  id="test-type-select"
                  value={testType}
                  label="Test Type"
                  onChange={(e: SelectChangeEvent<string>) =>
                    setTestType(e.target.value)
                  }
                  required
                >
                  <MenuItem value="side">Side</MenuItem>
                  <MenuItem value="webrtc">WebRTC</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel id="locatory-strategy-label">
                  Locatory Strategy
                </InputLabel>
                <Select
                  labelId="locatory-strategy-label"
                  id="locatory-strategy-select"
                  value={locatoryStrategy}
                  label="Locatory Strategy"
                  onChange={(e: SelectChangeEvent<string>) =>
                    setLocatoryStrategy(e.target.value)
                  }
                  displayEmpty
                  required
                >
                  <MenuItem value="default">CSS</MenuItem>
                  <MenuItem value="absolute">XPath</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              {moduleItems.map((item, index) => {
                // Check if this item is in selectedModule and has exists: true
                const isExists = selectedModule.some(
                  (selectedItem) =>
                    selectedItem.id === item.id && selectedItem.exists
                )
             
                return (
                  <FormControl key={index} fullWidth margin="normal">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedModule.some(
                            (selectedItem) => selectedItem.id === item.id
                          )}
                          onChange={(e) =>
                            handleModulecheckboxChange(item, e.target.checked)
                          }
                        />
                      }
                      label={
                        <TextField
                          value={item.value}
                          onChange={(e) =>
                            handleModuleChange(index, e.target.value)
                          }
                          placeholder="Enter module name"
                          InputProps={{
                            style: {
                              width: '500px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            },
                          }}
                          variant="outlined"
                          size="small"
                          error={isExists} // Show error if exists is true for this item
                          helperText={isExists ? 'Already exists' : ''}
                        />
                      }
                    />
                  </FormControl>
                )
              })}
            </Box>
          )}
         <LoadingOverlay isLoading={isLoading} />
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
        <DialogActions>
          <Button onClick={handleClose} color="primary" disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            disabled={!isFormValid() || isLoading}
          >
            Save Testcase
          </Button>
          {/* <Button onClick={handleSave} color="secondary" disabled={!isFormValid()}>
            Run Test
          </Button> */}
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={showConfirmModal} onClose={handleCancelConfirm}>
        <DialogTitle>Module Already Exists!</DialogTitle>
        <DialogContent>
          <DialogContentText>
           It may be utilized by various test cases. Do you want to proceed with replacing it?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmSave} color="primary">
            Yes, Replace
          </Button>
        </DialogActions>
      </ConfirmDialog>
    </>
  )
}

export default SendtoXt
