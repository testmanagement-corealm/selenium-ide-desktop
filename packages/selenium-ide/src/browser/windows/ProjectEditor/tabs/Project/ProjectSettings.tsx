import CloseIcon from '@mui/icons-material/Close'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Stack from '@mui/material/Stack'
import { CommandShape } from '@seleniumhq/side-model'
import languageMap from 'browser/I18N/keys'
import EditorToolbar from 'browser/components/Drawer/EditorToolbar'
import TextField from 'browser/components/UncontrolledTextField'
import { context } from 'browser/contexts/config'
import { context as testsContext } from 'browser/contexts/tests'
import { context as activeTestContext } from 'browser/contexts/active-test'
import React, { FC, useContext, useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { InputLabel } from '@mui/material'

export interface MiniProjectShape {
  id: string
  name: string
}

const {
  plugins: { projectCreate, projectDelete, projectEdit },
  projects: { update },
} = window.sideAPI
const ProjectSettings: FC = () => {
  const {
    project: { delay, name, plugins, timeout, url },
  } = React.useContext(context)

   const tests = useContext(testsContext)

 const { activeTestID } = useContext(activeTestContext)
 const[executionPriority, setExecutionPriority] = useState('reset')
// Function to reorder targets
const reorderTargets = async (targets: [string, string][],executionPriority:string): Promise<[string, string][]> => {
  const xpathTargets: [string, string][] = [];
  const cssTargets: [string, string][] = [];
  const otherTargets: [string, string][] = [];

  // Iterate over each target and categorize based on its type
  targets.forEach(([value, type]) => {
    if (type.startsWith('xpath')) {
      if (type === 'xpath:position') {
        xpathTargets.unshift([value, type]); // Place 'xpath:position' first
      } else {
        xpathTargets.push([value, type]); // Add other xpaths
      }
    } else if (type.startsWith('css')) {
      cssTargets.push([value, type]); // Add CSS selectors
    } else {
      otherTargets.push([value, type]); // Handle other types like 'id', 'name', etc.
    }
  });
      // Apply conditional logic for priority based on executionPriority
      if (executionPriority === 'absolute') {
        // If executionPriority is 'default', prioritize CSS over XPath
        return [...xpathTargets, ...otherTargets, ...cssTargets];
      } else 
    
        {
        // If executionPriority is 'absolute', prioritize XPath over CSS
        return [...cssTargets,...xpathTargets, ...otherTargets ];
      } 
    
};

useEffect(()=>{
  console.log('useeffect triggered')
  
  if(activeTestID !== '-1'){
    let filtereditem = tests.filter(item=>item.id === activeTestID)
 
  if(filtereditem.length>0){
    // console.log('filtereditem----*****-', filtereditem,filtereditem[0]?.locatorstrategy)
    setExecutionPriority(filtereditem[0].locatorstrategy||'reset')
  }
}
 
},[activeTestID])
const fetchData = async (executionPriority:string) => {
  try {
    // console.log('Current tests:', tests, activeTestID);
    if(activeTestID !== '-1'){
      let filtereditem = tests.filter(item=>item.id === activeTestID)
      // console.log('filtereditem-----', filtereditem,filtereditem[0].locatorstrategy)
      let testsval = [...tests]
      let indexval = tests.findIndex(item=> item.id === activeTestID)
      // console.log('indexval', indexval)
    
      if (filtereditem && filtereditem[0]?.commands &&filtereditem[0]?.name && filtereditem[0]?.id !=='-1') {
        let commands =[]
        for(let i=0 ; i < filtereditem[0].commands.length;i++ ){
          let command: CommandShape = filtereditem[0].commands[i];  // Assuming you want to work with the first command
    
          // Apply the reorder function to the targets
          if (command.targets) {
            command.targets = await reorderTargets(command.targets,executionPriority);
          }
    
 
          command.target = command.targets?.[0]?.[0] || filtereditem[0].commands[i].target; 

          commands.push(command)
        }
        testsval[indexval].commands = commands
        testsval[indexval].locatorstrategy = executionPriority
        console.log('Updated command target:', testsval);
        update({
          tests: testsval,
        })
      }
    }
  } catch (error) {
    console.log(error)
  }

 
};


  // Handle change to the select field and ensure we update the value correctly
  const handleChange = (e: SelectChangeEvent<string>) => {
    // console.log(e.target.value)

   setExecutionPriority(e.target.value)
   fetchData(e.target.value)

  }


  if (url === 'http://loading') {
    return null
  }
  return (
    <>
      <Stack className="p-4" spacing={1}>
        <FormControl>
          <TextField
            id="name"
            label={<FormattedMessage id={languageMap.projectConfig.name} />}
            name="name"
            onChange={(e: any) => {
              update({
                name: e.target.value,
              })
            }}
            size="small"
            value={name}
          />
        </FormControl>
        <FormControl>
          <TextField
            id="timeout"
            label={<FormattedMessage id={languageMap.projectConfig.stepTimeout} />}
            helperText={<FormattedMessage id={languageMap.projectConfig.stepTimeoutHelper} />}
            name="timeout"
            type="number"
            inputProps={{ min: 0, step: 1000 }}
            onChange={(e: any) => {
              update({
                // delay: Math.max(parseInt(e.target.value || "0"), 0)
                timeout: Math.max(parseInt(e.target.value || '0'), 0),
              })
            }}
            size="small"
            // value={project.delay || 0}
            value={timeout || 0}
          />
        </FormControl>
        <FormControl>
          <TextField
            id="delay"
            label={<FormattedMessage id={languageMap.projectConfig.stepDelay} />}
            helperText={<FormattedMessage id={languageMap.projectConfig.stepDelayHelper} />}
            name="delay"
            type="number"
            inputProps={{ min: 0, step: 1000 }}
            onChange={(e: any) => {
              update({
                delay: Math.max(parseInt(e.target.value || '0'), 0),
              })
            }}
            size="small"
            value={delay || 0}
          />
        </FormControl>
        <FormControl>
        <InputLabel id="project-label">{<FormattedMessage id={languageMap.projectConfig.executionprior} />}</InputLabel>
        <Select
        style={{'padding':'0px'}}
        // className="flex-1"
        // disabled={disabled}
        id={`executionpriority`}
        label={<FormattedMessage id={languageMap.projectConfig.stepDelay} />}
      
        value={executionPriority}
        onChange={handleChange}  // Use the updated handleChange function
        MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }} // Optional: limits dropdown height
        defaultValue=""
      >
        {/* Optionally add a default "Select" placeholder */}
        <MenuItem value="absolute" >
          Xpath
        </MenuItem>
        <MenuItem value="default" >
          CSS
        </MenuItem>
        <MenuItem value="reset">
          Default
        </MenuItem>
        {/* Render each option dynamically from the options prop */}
        {/* {options.map((option, index) => (
          <MenuItem key={index} value={option}>
            {option}
          </MenuItem>
        ))} */}
      </Select>
        </FormControl>
      </Stack>
      <List
        dense
        subheader={
          <EditorToolbar onAdd={() => projectCreate()} addText="Add Plugin">
            {<FormattedMessage id={languageMap.projectConfig.projectPlugins} />}
          </EditorToolbar>
        }
        sx={{
          borderColor: 'primary.main',
        }}
      >
        {plugins.map((plugin, index) => (
          <ListItem className="py-3" key={index}>
            <TextField
              value={typeof plugin === 'string' ? plugin : ''}
              id={`plugin-${index}`}
              fullWidth
              onBlur={(e) => projectEdit(index, e.target.value)}
              size="small"
            />
            <IconButton className="ms-4" onClick={() => projectDelete(index)}>
              <CloseIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
    </>
  )
}

export default ProjectSettings
