import { MoreVert } from '@mui/icons-material';
import { FormControl, IconButton, TextField, Menu, MenuItem } from '@mui/material';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen'
import FindInPageIcon from '@mui/icons-material/FindInPage'
import Autocomplete from '@mui/material/Autocomplete'
import capitalize from 'lodash/fp/capitalize'
import React, { FC, useEffect , useState} from 'react'
// import { updateField, updateFieldAutoComplete } from './utils'
import {  updateFieldAutoComplete } from './utils'
import { CommandArgFieldProps } from '../types'
import languageMap from 'browser/I18N/keys'
import { useIntl } from 'react-intl'
import { LocatorFields } from '@seleniumhq/side-api'
import { FormattedMessage } from 'react-intl'

type PluralField = 'targets' | 'values'

const CommandLocatorField: FC<CommandArgFieldProps> = ({
  command,
  disabled,
  fieldName,
  testID,
}) => {
  const intl = useIntl()
  const fieldNames = (fieldName + 's') as PluralField
  const FieldName = capitalize(fieldName)
 const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  // const updateTarget = updateField(fieldName)
  const updateTargetAutoComplete = updateFieldAutoComplete(fieldName)
  const [_localValue, setLocalValue] = React.useState(command[fieldName])
  // const onChange = (e: any) => {
  //   setLocalValue(e)
  //   updateTarget(testID, command.id)(e)
  // }
  const onChange = (e: any,value:any) => {

    //console.log('update target',value)
    setLocalValue(value)
    // updateTarget(testID, command.id)(e)
    updateTargetAutoComplete(testID, command.id,command)(e, value)
  }
  const onChangeAutoComplete = (e: any, value: string) => {
    setLocalValue(value)
    updateTargetAutoComplete(testID, command.id,command)(e, value)
  }
  useEffect(() => {
   setLocalValue(command[fieldName])
   //console.log('commandfile',command[fieldName], fieldName,command )
  }, [command.id, command.target])

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
  const fullnote = intl.formatMessage({
    id: `commandMap.${command.command}.${fieldName}.description`,
  });
  const label = fullnote
    ? handleLabel(FieldName) + ' - ' + fullnote
    : handleLabel(FieldName)

  return (
    <FormControl className="flex flex-row">
      <Autocomplete
        className="flex-1"
        disabled={disabled}
        freeSolo
        inputValue={command[fieldName as LocatorFields]}
        componentsProps={{
          paper: {
            sx: {
              zIndex: 3000,
            },
          },
        }}
        // onChange={(_event: any, newValue: string | null) => {
        //   onChange(newValue)
        // }}
        onChange={(_event: any, newValue: string | null) => {
          onChange(_event,newValue)
        }}
        onContextMenu={() => {
          window.sideAPI.menus.open('textField')
        }}
        onInputChange={(event, newInputValue) => {
          onChangeAutoComplete(event, newInputValue)
        }}
        options={(command[fieldNames] ?? []).map((entry) => entry[0])}
        renderInput={(params) => (
          <TextField
            {...params}
            inputProps={{
              ...params.inputProps,
              ['data-overridearrowkeys']: true,
            }}
            label={label}
            name={fieldName}
          />
        )}
        size="small"
        text-overflow="ellipsis"
        value={command[fieldName as LocatorFields]}
      />
      
    {/* More options menu (three dots) */}
    {/* More options menu (three dots) */}
    <IconButton onClick={handleMenuOpen} disabled={disabled}>
        <MoreVert />
      </IconButton>

      {/* Menu with side-by-side options */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {/* Open Window option */}
        <MenuItem 
          disabled={disabled}
        onClick={() =>
              window.sideAPI.recorder.requestHighlightElement(fieldName)
            }>
          <IconButton
          size="small"
            
          >
            <FindInPageIcon />
          
         
         
          </IconButton>
          <FormattedMessage
              id={"Find target in a page" }
            />
          </MenuItem>
          
          {/* Enable/Disable Command option */}
          <MenuItem
            onClick={() =>
              window.sideAPI.recorder.requestSelectElement(true, fieldName)
            }
            disabled={disabled}
          >
          <IconButton
        size="small"
          
          >
            <AddToHomeScreenIcon />
           
         
          </IconButton>
          <FormattedMessage
              id={"Select target in a page" }
            />
        </MenuItem>
      </Menu>
      {/* <IconButton
        className="ms-4"
        disabled={disabled}
        onClick={() =>
          window.sideAPI.recorder.requestHighlightElement(fieldName)
        }
      >
        <FindInPageIcon />
      </IconButton>
      <IconButton
        disabled={disabled}
        onClick={() =>
          window.sideAPI.recorder.requestSelectElement(true, fieldName)
        }
      >
        <AddToHomeScreenIcon />
      </IconButton> */}
      {/* <Tooltip className="mx-2 my-auto" title={fullnote} placement="top-end">
        <HelpCenter />
      </Tooltip> */}
    </FormControl>
  )
}

export default CommandLocatorField
