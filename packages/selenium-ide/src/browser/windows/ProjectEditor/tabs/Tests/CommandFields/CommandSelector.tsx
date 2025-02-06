import { FormControl, IconButton, Tooltip, TextField, Menu, MenuItem } from '@mui/material';
import { OpenInNew, CodeOff, MoreVert } from '@mui/icons-material';
import { Autocomplete } from '@mui/material'
import React, { FC, useMemo, useState } from 'react'
import { setField, updateACField } from './utils'
import { CommandSelectorProps } from '../types'
import { FormattedMessage } from 'react-intl'
import languageMap from 'browser/I18N/keys'

const setCommandFactory = setField('command')
const setOpensWindowFactory = setField<boolean>('opensWindow')
const updateCommand = updateACField('command')
const CommandSelector: FC<CommandSelectorProps> = ({
  command,
  commands,
  disabled,
  isDisabled,
  testID,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const commandsList = useMemo(
    () =>
      Object.entries(commands)
        .map(([id, { name }]: [string, { name: string }]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  )
  if (commandsList.length === 0) {
    return null
  }
  const setCommand = setCommandFactory(testID, command.id)
  const setOpensWindow = setOpensWindowFactory(testID, command.id)
  const commandOptions = commandsList.map((item) => {
    return { label: item.name, id: item.id }
  })

  return (
    <>
      <FormControl className="flex flex-row">
        <Autocomplete
          id="command-selector"
          className="flex-1"
          disabled={disabled}
          onChange={updateCommand(testID, command.id,command)}
          getOptionLabel={(option) => option.label}
          options={commandOptions}
          renderInput={(params) => (
            <TextField
              {...params}
              inputProps={{
                ...params.inputProps,
                ['data-overridearrowkeys']: true,
              }}
              label={<FormattedMessage id={languageMap.testCore.stepCommand} />}
            />
          )}
          size="small"
          value={commandOptions.find((entry) => entry.id === command.command)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
        />
    

    {/* More options menu (three dots) */}
    <Tooltip className="flex-initial ms-4 my-auto" title={<FormattedMessage id="testCore.moreOptions" />} placement="top-end">
          <IconButton onClick={handleMenuOpen} disabled={disabled}>
            <MoreVert />
          </IconButton>
        </Tooltip>

        {/* Menu with Open Window and Enable/Disable options */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {/* Open Window option */}
          <MenuItem
            onClick={() => {
              setOpensWindow(!command.opensWindow);
              handleMenuClose();
            }}
          >
            <IconButton size="small">
              <OpenInNew color={command.opensWindow ? 'info' : 'inherit'} />
            </IconButton>
            <FormattedMessage
              id={
                command.opensWindow
                  ? languageMap.testCore.openNewWindow
                  : languageMap.testCore.notOpenNewWindow
              }
            />
          </MenuItem>

          {/* Enable/Disable Command option */}
          <MenuItem
            onClick={() => {
              setCommand(isDisabled ? command.command : `//${command.command}`);
              handleMenuClose();
            }}
          >
            <IconButton size="small">
              <CodeOff color={isDisabled ? 'info' : 'inherit'} />
            </IconButton>
            <FormattedMessage
              id={
                isDisabled
                  ? languageMap.testCore.enableCommand
                  : languageMap.testCore.disableCommand
              }
            />
          </MenuItem>
        </Menu>



        {/* <Tooltip
          className="flex-initial ms-4 my-auto"
          title={
            <FormattedMessage
              id={
                command.opensWindow
                  ? languageMap.testCore.openNewWindow
                  : languageMap.testCore.notOpenNewWindow
              }
            />
          }
          placement="top-end"
        >
          <IconButton
            disabled={disabled}
            onClick={() => setOpensWindow(!command.opensWindow)}
          >
            <OpenInNew color={command.opensWindow ? 'info' : 'inherit'} />
          </IconButton>
        </Tooltip>
        <Tooltip
          className="flex-initial my-auto"
          title={
            <FormattedMessage
              id={
                isDisabled
                  ? languageMap.testCore.enableCommand
                  : languageMap.testCore.disableCommand
              }
            />
          }
          placement="top-end"
        >
          <IconButton
            disabled={disabled}
            onClick={() =>
              setCommand(isDisabled ? command.command : `//${command.command}`)
            }
          >
            <CodeOff color={isDisabled ? 'info' : 'inherit'} />
          </IconButton>
        </Tooltip> */}
        {/* <Tooltip
          className="flex-initial mx-2 my-auto"
          title={<FormattedMessage id={`commandMap.${command.command}.description`} />}
          placement="top-end"
        >
          <HelpCenter />
        </Tooltip> */}
      </FormControl>
    </>
  )
}

export default CommandSelector
