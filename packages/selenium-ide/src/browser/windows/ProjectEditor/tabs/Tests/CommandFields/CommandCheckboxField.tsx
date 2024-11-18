import React, { FC } from 'react'
import { FormControl, FormControlLabel, Tooltip } from '@mui/material'
import HelpCenter from '@mui/icons-material/HelpCenter'
import startCase from 'lodash/fp/startCase'
import { CommandFieldProps } from '../types'
import { updateCheckboxField } from './utils'
// import { LocatorFields } from '@seleniumhq/side-api'
import { useIntl } from 'react-intl'
// import languageMap from 'browser/I18N/keys'
import UncontrolledCheckbox from 'browser/components/UncontrolledCheckbox'


// const inputLabelProps = {
//   sx: {
//     textOverflow: 'ellipsis',
//   },
// }

const CommandCheckboxField: FC<CommandFieldProps> = ({
  command,
  disabled,
  fieldName,
  note,
  testID,
  labelname

}) => {
  const intl = useIntl()
  const FieldName = startCase(labelname? labelname: fieldName)
  const updateCheckbox = updateCheckboxField(fieldName)



  // Generate full note based on localization
  const fullNote =
    note ||
    intl.formatMessage({
      id: `commandMap.${command.command}.${fieldName}.description`,
    })

  // // Label to show next to the checkbox
  // const label = fullNote
  //   ? handleLabel(FieldName) + ' - ' + fullNote
  //   : handleLabel(FieldName)

  return (
    <FormControl className="flex flex-row">
      <FormControlLabel
        control={
          <UncontrolledCheckbox
            disabled={disabled}
            id={`${fieldName}-${command.id}`}
            name={fieldName}
            checked={command[fieldName] === true} // Use the current value for checked
            onChange={updateCheckbox(testID, command.id)} // Handle state update
            onContextMenu={() => {
              window.sideAPI.menus.open('checkboxField')
            }}
            size="small"
          />
        }
        label={FieldName}
        labelPlacement="end"
        sx={{
          '& .MuiFormControlLabel-root': {
            marginLeft: 0, // Remove the margin-left from the label
          },
        }}
      />
      {fullNote && (
        <Tooltip className="mx-2 my-auto" title={fullNote} placement="top-end">
          <HelpCenter />
        </Tooltip>
      )}
    </FormControl>
  )
}

export default CommandCheckboxField
