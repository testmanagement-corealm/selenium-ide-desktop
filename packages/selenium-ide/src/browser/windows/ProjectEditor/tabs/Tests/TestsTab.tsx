import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import {
  getActiveCommand,
  getActiveTest,
} from '@seleniumhq/side-api/dist/helpers/getActiveData'
import React, { useContext, useRef } from 'react'
import CommandEditor from './TestCommandEditor'
import CommandList from './TestCommandList'
import CommandTable from './TestCommandTable'
import { loadingID } from '@seleniumhq/side-api/dist/constants/loadingID'
import MainHeader from 'browser/components/Main/Header'
import TestSelector from './TestSelector'
import { context } from 'browser/contexts/session'
import { FormattedMessage } from 'react-intl'
import languageMap from 'browser/I18N/keys'

const sxCenter = { textAlign: 'center' }
const NoTestFound = () => (
    <>
      <MainHeader />
      <Paper className="p-4" elevation={1} id="command-editor" square>
        <Typography sx={sxCenter}>
          <FormattedMessage id={languageMap.testsTab.noTestSelected} />
        </Typography>
      </Paper>
    </>
  )

const TestsTab: React.FC = () => {
  const session = useContext(context)
  const {
    state: {
      activeTestID,
      commands,
      editor: { selectedCommandIndexes },
      playback,
    },
  } = session

  const ref = useRef<HTMLDivElement>(null)
  const [isTableWidth, setIsTableWidth] = React.useState(false)
  React.useEffect(() => {
    if (!ref.current) {
      return
    }
    const current = ref.current
    const width = current.offsetWidth
    setIsTableWidth(width > 600)
    const resizeObserver = new ResizeObserver(() => {
      const width = current.offsetWidth
      setIsTableWidth(width > 500)
    })

    // Start observing the target element
    resizeObserver.observe(current)

    // Clean up by disconnecting the observer when the component unmounts
    return () => {
      resizeObserver.disconnect()
    }
  }, [ref])
  const CommandsComponent = isTableWidth ? CommandTable : CommandList
  const activeTest = getActiveTest(session)
  const activeCommand = getActiveCommand(session)
  React.useEffect(() => {
    if (activeCommand) {
      setTimeout(() => {
        const commandElement = document.querySelector(
          `[data-command-id="${activeCommand.id}"]`
        )
        if (commandElement) {
          commandElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start',
          })
        }
      }, 100)
    }
  }, [activeCommand])
  const disabled = ['playing', 'recording'].includes(session.state.status)
  return (
    <Box className="fill flex flex-col" ref={ref}>
      {!session.state.editor.showDrawer && <TestSelector />}
      {activeTestID === loadingID ? (
        <NoTestFound />
      ) : (
        <CommandsComponent
          activeTest={activeTestID}
          commands={activeTest.commands}
          commandStates={playback.commands}
          disabled={disabled}
          selectedCommandIndexes={selectedCommandIndexes}
        />
      )}
      <CommandEditor
        commands={commands}
        command={activeCommand}
        disabled={disabled}
        selectedCommandIndexes={selectedCommandIndexes}
        testID={activeTestID}
        commandList={activeTest.commands}
      
      />
    </Box>
  )
}

export default TestsTab
