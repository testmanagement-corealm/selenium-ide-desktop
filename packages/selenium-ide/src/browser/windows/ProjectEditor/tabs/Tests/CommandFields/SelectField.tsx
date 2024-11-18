import React, { FC } from 'react'
import FormControl from '@mui/material/FormControl'
import HelpCenter from '@mui/icons-material/HelpCenter'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import startCase from 'lodash/fp/startCase'
import { CommandFieldProps } from '../types'
import { updateField } from './utils'
import { LocatorFields } from '@seleniumhq/side-api'
import { useIntl } from 'react-intl'
import languageMap from 'browser/I18N/keys'
import { SelectChangeEvent } from '@mui/material/Select'  // Import the correct type for onChange
import { InputLabel } from '@mui/material'

// const inputLabelProps = {
//   sx: {
//     textOverflow: 'ellipsis',
//   },
// }

interface SelectFieldProps extends CommandFieldProps {
  options: string[] // Accept an array of options for the select dropdown
}

const SelectField: FC<SelectFieldProps> = ({
  command,
  disabled,
  fieldName,
  note,
  testID,
  labelname,
  options,
}) => {
  const intl = useIntl()
  const FieldName = startCase(fieldName)
  const updateText = updateField(fieldName)

  // Handle the label translation
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

  // Get full note description, or fallback to default
  const fullNote =
    note ||
    intl.formatMessage({
      id: `commandMap.${command.command}.${fieldName}.description`,
    })
  const label = fullNote
    ? handleLabel(FieldName) + ' - ' + fullNote
    : handleLabel(FieldName)

  // Handle change to the select field and ensure we update the value correctly
  const handleChange = (e: SelectChangeEvent<string>) => {
    console.log(e.target.value)
    // const newValue = e.target.value
    
   updateText(testID, command.id, command)(e)
  }

  return (
    <FormControl className="flex flex-row" size="small" fullWidth>
       <InputLabel id="project-label">{labelname || label}</InputLabel>
      <Select
        className="flex-1"
        disabled={disabled}
        id={`${fieldName}-${command.id}`}
        label={labelname || label}
        value={command[fieldName as LocatorFields] || ''}
        onChange={handleChange}  // Use the updated handleChange function
        displayEmpty
        MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }} // Optional: limits dropdown height
        defaultValue=""
      >
        {/* Optionally add a default "Select" placeholder */}
        {/* <MenuItem value="" disabled>
          {intl.formatMessage({ id: 'select.placeholder' })}
        </MenuItem> */}

        {/* Render each option dynamically from the options prop */}
        {options.map((option, index) => (
          <MenuItem key={index} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>

      {fullNote && (
        <Tooltip className="mx-2 my-auto" title={fullNote} placement="top-end">
          <HelpCenter />
        </Tooltip>
      )}
    </FormControl>
  )
}

export default SelectField
