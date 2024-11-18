import FormControl from '@mui/material/FormControl'
import HelpCenter from '@mui/icons-material/HelpCenter'
// import TextField from 'browser/components/UncontrolledTextField'
import TextField from '@mui/material/TextField'
import startCase from 'lodash/fp/startCase'
import React, { FC } from 'react';
import { CommandFieldProps } from '../types'
import { updateField } from './utils'
import Tooltip from '@mui/material/Tooltip'
import { LocatorFields } from '@seleniumhq/side-api'
import { useIntl } from 'react-intl'
import languageMap from 'browser/I18N/keys'


const inputLabelProps = {
  sx: {
    textOverflow: 'ellipsis',
  },
}

const CommandTextField: FC<CommandFieldProps> = ({
  command,
  disabled,
  fieldName,
  note,
  testID,
  labelname
}) => {

  // const [_localValue, setLocalValue] = React.useState(command[fieldName])

  const intl = useIntl()
  const FieldName = startCase(fieldName)
  const updateText = updateField(fieldName)
  // 处理label标签
  const handleLabel = (value: string) => {
    switch (value) {
      case 'Comment':
        return intl.formatMessage({ id: languageMap.testCore.comment })
      case 'Target':
        return intl.formatMessage({ id: languageMap.testCore.target })
      case 'Value':
        return intl.formatMessage({ id: languageMap.testCore.value })
      default:
        return value
    }
  }
  // 一定会使用languageMap.commandMap,其实是为了兼容参数commands
  const fullNote =
    note ||
    intl.formatMessage({
      id: `commandMap.${command.command}.${fieldName}.description`,
    })
  const label = fullNote
    ? handleLabel(FieldName) + ' - ' + fullNote
    : handleLabel(FieldName)

    // Handle input changes, including variable name validation
  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const inputValue = e.target.value;

    if (command.command === 'GenerateDate' && fieldName === 'defaultValue') {
      const regex = /^[+-]?\d*$/; // Regex to check for a number
      if (!regex.test(inputValue)) {
        console.log('Invalid input for GenerateDate:', inputValue);      
        e.target.value = command.defaultValue || '';     
        updateText(testID, command.id, command)(e);
        return
      } else {
        updateText(testID, command.id, command)(e);
        return
      }
    }


    if (( (command.command === 'createVariable' ||command.command === 'GenerateDate') && fieldName == 'target')|| command.command == 'getText' && fieldName =='variableName') {

      const regex = /^([a-zA-Z_$][a-zA-Z\d_$]*)$/gi;
      // const _inputEvent = e.nativeEvent as InputEvent;

      // Prevent the onChange from propagating to UncontrolledTextField
     
      // if (inputValue == 'GV_'&& inputEvent.inputType === "deleteContentBackward") {
      //   // Prevent the change
      //   e.preventDefault();
      //   return; // Exit the function to avoid further processing
      // }
      if (regex.test(inputValue)) {
        let st = 'GV_' + inputValue.substr(3);
        console.log('new str', st)
        e.target.value = st
        // If valid, call the updateText function
             
        updateText(testID, command.id, command)(e);
      } else {
        // If invalid, log the error and do not update
        console.log('Invalid variable name:', inputValue);
          // Cast the event to InputEvent to access inputType

          // if(e.target.value != ''){
            e.target.value = command[fieldName] || '';
          // }
        // e.stopPropagation();
   

        console.log('Invalid variable name:', e.target.value);
        updateText(testID, command.id, command)(e);
        // Optionally, you can reset the field or show a validation message
      }
    } else {
      // If not a variable-related command, just update the field normally

      updateText(testID, command.id, command)(e);
    }
  };
  // // Handle blur event
  // const handleOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  //   const inputValue = e.target.value;

  //   if (command.command === 'GenerateDate' && fieldName === 'defaultValue') {
  //     const regex = /^[+-]?\d+$/; // Regex to check for a number
  //     if (!regex.test(inputValue)) {
  //       console.log('Invalid input for GenerateDate:', inputValue);
  //       setError('Please enter a valid number.'); // Set error message
  //       e.target.value =  ''; // Reset to previous valid value
  //       updateText(testID, command.id, command)(e);
  //     } else {
  //       setError(null); // Clear error if valid
  //     }
  //   }
  // };
  // useEffect(() => {
  //   setLocalValue(command[fieldName])
  //   // console.log('commandfile',command[fieldName], fieldName,command )
  // }, [command.id, command.target, command[fieldName]])
 

  return (
 
    <FormControl className="flex flex-row">
      <TextField
        className="flex-1"
        disabled={disabled}
        id={`${fieldName}-${command.id}`}
        label={labelname?labelname: label}
        InputLabelProps={inputLabelProps}
        name={fieldName}
         onChange={handleOnChange}
     
        onContextMenu={() => {
          window.sideAPI.menus.open('textField')
        }}
        size="small"
        value={command[fieldName as LocatorFields]}
      />
      
      {fullNote && (
        <Tooltip className="mx-2 my-auto" title={fullNote} placement="top-end">
          <HelpCenter />
        </Tooltip>
      )}
    </FormControl>
    
  );
}


export default CommandTextField
