import React, { FC } from 'react'
import { Checkbox, CheckboxProps } from '@mui/material'
import { noop } from 'lodash/fp'

/**
 * This is a hyper-controlled checkbox component.
 */
const UncontrolledCheckbox: FC<CheckboxProps> = ({
  checked = false,
  onChange: _onChange = noop,
  ...props
}) => {
  const [localChecked, setLocalChecked] = React.useState(checked)

  // Sync internal state with the `checked` prop
  React.useEffect(() => {
    setLocalChecked(checked)
  }, [checked])

  // Handle the change event and pass both arguments to `onChange`
  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const newCheckedValue = e.target.checked
    setLocalChecked(newCheckedValue)

    // Pass both the event and the new checked value to the external handler
    _onChange(e, newCheckedValue)
  }

  return (
    <Checkbox
      {...props}
      checked={localChecked}
      onChange={onChange}
    />
  )
}

export default UncontrolledCheckbox
