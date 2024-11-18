import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CommandShape } from '@seleniumhq/side-model'
import { CoreSessionData } from '@seleniumhq/side-api'
import React, { FC, useEffect, useState } from 'react'
import CommandSelector from './CommandFields/CommandSelector'
import ArgField from './CommandFields/ArgField'
import CommandTextField from './CommandFields/TextField'
import { FormattedMessage, useIntl } from 'react-intl'
import languageMap from 'browser/I18N/keys'
import CommandCheckboxField from './CommandFields/CommandCheckboxField'
import NumberTextField from './CommandFields/NumberTextField'
import SelectField from './CommandFields/SelectField'

export interface CommandEditorProps {
  command: CommandShape
  commands: CoreSessionData['state']['commands']
  disabled?: boolean
  selectedCommandIndexes: number[]
  testID: string
  commandList:CommandShape[]
}

export interface MiniCommandShape {
  id: string
  name: string
}

const CommandEditor: FC<CommandEditorProps> = ({
  command,
  selectedCommandIndexes,
  ...props
}) => {
  const [dropDownData, setDropDownData] = useState<string[]>([]);// State for dropdown data
  const intl = useIntl()
  if (typeof command.command != 'string') {
    command.command = '//unknown - could not process'
  }
  const { commands } = props
  const isDisabled = command.command.startsWith('//')

  useEffect(() => {
    // Effect to perform actions when useVariable changes
    // console.log('useVariable changed:');
    let arr: string[] = [];
    const processCommands = () => {
     
      for (let i = 0; i < props.commandList.length; i++) {
        if (props.commandList[i].command === 'createVariable' || props.commandList[i].command === 'GenerateDate') {
          if (props.commandList[i].target !== '') {
            arr.push(`${props.commandList[i].target}`)
       
          }
        }
        if (props.commandList[i].command === 'getText' || props.commandList[i].command === 'extractData') {
          if (props.commandList[i].variableName !== '') {
            arr.push(`${props.commandList[i].variableName}`);
          }
        }
      }
      // console.log('dropwdondata',arr)
      setDropDownData(arr);
    };

     processCommands(); // Call the function to process commands
    // Add any side effects or API calls here based on the useVariable state
  }, [command.useVariable]); // Dependency array includes useVariable
  const correctedCommand: CommandShape = {
    ...command,
    command: isDisabled ? command.command.slice(2) : command.command,
  }
  if (selectedCommandIndexes.length > 1) {
    return (
      <Stack className="p-4" spacing={1}>
        <Typography className="centered py-4" variant="body2">
          {selectedCommandIndexes.length} commands selected
        </Typography>
      </Stack>
    )
  }
  if (
    !(correctedCommand.command in commands) ||
    selectedCommandIndexes.length === 0
  ) {
    return (
      <Stack className="p-4" spacing={1}>
        <Typography className="centered py-4" variant="body2">
          {<FormattedMessage id={languageMap.testsTab.noCommandsSelected} />}
        </Typography>
      </Stack>
    )
  }
  return (
    <Paper className="z-4" elevation={5} square>
      <Stack
        className="flex-initial p-4"
        spacing={1}
        style={{ maxHeight: '300px', overflowY: 'auto' }}
      >
        <CommandSelector
          command={correctedCommand}
          isDisabled={isDisabled}
          {...props}
        />
        <ArgField command={correctedCommand} {...props} fieldName="target" />
              {command.command == 'getText'?
        
        <SelectField
        command={correctedCommand}
        {...props}
        disabled={false}
        fieldName="validationType"
        note="Check whether the value captured is of the selected validation type"
        labelname="Validation type"
        options={[ 'String','Numeric']} // Array of options to display
      />
      : null
      }
         { command.command == 'getText' ? 
             <CommandTextField
             command={correctedCommand}
             {...props}
             fieldName="variableName"
             note={decodeURI("These variables can be used in successive steps or recordings.%0AA variable name must start with a letter or an underscore character (_).%0AA variable name cannot start with a digit.%0AA variable name can only contain alpha-numeric characters and underscores (a-z, A-Z, 0-9, and _ ).%0AA variable name cannot contain spaces"
             )}
           />
        :null}
        {command.command &&
        (command.command == 'createVariable' || command.command == 'type') ? (
          <CommandCheckboxField
            command={correctedCommand}
            {...props}
            fieldName="dynamicValue"
            note="If this flag is set to true,dynamically genarated value will be added to the recorded value."
          />
        ) : null}
        {command.dynamicValue ? (
         <NumberTextField
         command={correctedCommand}
         {...props}
         fieldName="dynamicValueLen"
         labelname="Max length"
         note="Provide maximum length for the dynamic value."
         max={22}
         min={1}    
         />          
        ) : null}

          {(command.command === 'type' ||
            command.command === 'verifyValue' ||
            command.command === 'verifyText' ||
            command.command === 'verifyNotText' ||
            command.command === 'assertNotText' ||
            command.command === 'assertValue' ||
            command.command === 'assertText')  ? 
            <CommandCheckboxField
            command={correctedCommand}
            {...props}
            fieldName="useVariable"
            labelname=" Use variable"
            note="If this flag is set to true,value will be considered as a variable."
          />
    
        :null}  
        {command.useVariable ?
        
        
        <SelectField
        command={correctedCommand}
        {...props}
        disabled={false}
        fieldName="variableName"
        note=""
        labelname="Select Variable"
        options={dropDownData} // Array of options to display
      />:
        
        null}



         {command.command != 'GenerateDate' && command.command != 'getText' ? 
        <ArgField command={correctedCommand} {...props} fieldName="value" />
        :null}
        {command.opensWindow && (
          <>
            <CommandTextField
              command={correctedCommand}
              {...props}
              fieldName={
                intl.formatMessage({
                  id: languageMap.testCore.windowHandleName,
                }) as 'windowHandleName'
              }
              note={intl.formatMessage({
                id: languageMap.testCore.windowHandleNameNote,
              })}
            />
            <CommandTextField
              command={correctedCommand}
              {...props}
              fieldName={
                intl.formatMessage({
                  id: languageMap.testCore.windowTimeout,
                }) as 'windowTimeout'
              }
              note={intl.formatMessage({
                id: languageMap.testCore.windowTimeoutNote,
              })}
            />
          </>
        )}
        {(command.command === 'type' ||
            command.command === 'verifyValue' ||
            command.command === 'verifyText' ||
            command.command === 'verifyNotText' ||
            command.command === 'assertNotText' ||
            command.command === 'assertValue' ||
            command.command === 'assertText')  ? 
            <CommandTextField
            command={correctedCommand}
            {...props}
            fieldName="defaultValue"
            note="Value captured during recording."
            labelname='Parameter Value'
          />
        :null}
        {command.command == 'step' ? (
          <CommandTextField
            command={correctedCommand}
            {...props}
            fieldName="comment"
            note="Azure Test Case ID"
          />
        ) : null}
        {command.command == 'GenerateDate' ? (
          <CommandTextField
            command={correctedCommand}
            {...props}
            fieldName="value"
            note="Date Time Format.            
            dd/MM/yyyy (e.g., 21/05/2024)
            yyyy-MM-dd (e.g., 2024-05-21)
            MMMM dd, yyyy (e.g., May 21, 2024)
            dd MMMM, yyyy (e.g., 21 May, 2024)
            dddd, MMMM dd, yyyy (e.g., Friday, May 21, 2024)
            For more date format options, refer to https://date-fns.org/v2.25.0/docs/format            
            "
            labelname='Date Time Format'
          />
        ) : null}
         {command.command == 'GenerateDate' ? (
          <CommandTextField
            command={correctedCommand}
            {...props}
            fieldName="defaultValue"
            note="Specify the number of days to add or subtract from the dynamically generated date. 
              Use a format like +1 or -2 to adjust the date accordingly."
            labelname='Add/Sub Days'
          />
        ) : null}

         <CommandTextField
          command={correctedCommand}
          {...props}
          fieldName="description"
          note=""
        />

        {command.command && command.command !== 'Createteststep' ? (
          <CommandCheckboxField
            command={correctedCommand}
            {...props}
            fieldName="continueExecution"
            note="If this flag is set to true, execution of successive commands will not block even if this command fails"
          />
        ) : null}
        {command.command && command.command !== 'Createteststep' ? (
          <CommandCheckboxField
            command={correctedCommand}
            {...props}
            fieldName="skiperror"
            labelname="Ignore Error"
            note="When enabled, errors occurring during this step will be omitted from the overall test status."
          />
        ) : null}

      </Stack>
    </Paper>
  )
}

export default CommandEditor
