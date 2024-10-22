import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemePref } from '@seleniumhq/side-api';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import React, { FC } from 'react';
import { IntlProvider } from 'react-intl';
import { Button } from '@mui/material';
import SendtoXt from './SendToXT';


type AppWrapperProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'children'>;

const AppWrapper: FC<AppWrapperProps> = ({ children }) => {
  const [themePref, setThemePref] = React.useState<ThemePref>('System');
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleOpenDialog = () => setDialogOpen(true);
  const handleCloseDialog = () => setDialogOpen(false);
  
  const handleSave = (data: {
    testName: string;
    description: string;
    project: string;
    testType: string;
    locatoryStrategy: string;
  }) => {
    console.log('Saved Data:', data);





    // Handle saved data (e.g., send to server or update state)
  };

  React.useEffect(() => {
    if (!window?.sideAPI?.state) return;
    window.sideAPI.state.getUserPrefs().then((prefs) => {
      setThemePref(prefs.themePref || 'System');
    });
  }, []);

  const systemPref = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersDarkMode =
    themePref === 'System' ? systemPref : themePref === 'Dark';
    
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode]
  );

  const [languageMap, setLanguageMap] = React.useState<any>({});
  
  React.useEffect(() => {
    window.sideAPI.system.getLanguageMap(true).then((result) => {
      setLanguageMap(result);
    });
  }, []);

  return (
    <IntlProvider defaultLocale="en" messages={languageMap}>
   
      {/* @ts-expect-error react-intl has funky versions */}
      <ThemeProvider theme={theme}>
      <Button variant="contained" color="primary" onClick={handleOpenDialog}>
       Send to XT
      </Button>
      <SendtoXt
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
      />
        <CssBaseline />

        {children}
      </ThemeProvider>
    </IntlProvider>
  )
}

export default AppWrapper
