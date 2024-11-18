import React, { FC } from 'react'
import FormControl from '@mui/material/FormControl'
import HelpCenter from '@mui/icons-material/HelpCenter'
import TextField from 'browser/components/UncontrolledTextField'
import startCase from 'lodash/fp/startCase'
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

interface NumberTextFieldProps extends CommandFieldProps {
  max?: number
  min?: number
  step?: number
}

const NumberTextField: FC<NumberTextFieldProps> = ({
  command,
  disabled,
  fieldName,
  note,
  testID,
  labelname,
  max,
  min,
  step = 1,  // Default step is 1 if not provided
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

  // Handle change to the text field or number field and ensure we update the value correctly
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // If it's a number field, ensure we only accept numeric values
  
      if (!isNaN(Number(newValue)) || newValue === '') {
        updateText(testID, command.id,command)(e)
      }
   
  }

  return (
    <FormControl className="flex flex-row">
      <TextField
        className="flex-1"
        disabled={disabled}
        id={`${fieldName}-${command.id}`}
        label={labelname || label}
        InputLabelProps={inputLabelProps}
        name={fieldName}
        onChange={handleChange}
        onContextMenu={() => {
          window.sideAPI.menus.open('textField')
        }}
        size="small"
        value={command[fieldName as LocatorFields]}
        type = 'number' // Set type dynamically (either 'text' or 'number')
        inputProps={{
          max,
          min,
          step,  // Only relevant if type='number'
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

export default NumberTextField
