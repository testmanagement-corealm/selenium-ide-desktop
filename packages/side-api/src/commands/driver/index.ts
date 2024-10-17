import type { Shape as Download } from './download'
import type { Shape as ListBrowsers } from './listBrowsers'
import type { Shape as SelectBrowser } from './selectBrowser'
import type { Shape as StartProcess } from './startProcess'
import type { Shape as StopProcess } from './stopProcess'
import type { Shape as TakeScreenshot } from './takeScreenshot'
import type { Shape as SetToken } from './setToken'; // Import the type
import type { Shape as GetToken } from './getToken'

import * as download from './download'
import * as listBrowsers from './listBrowsers'
import * as selectBrowser from './selectBrowser'
import * as startProcess from './startProcess'
import * as stopProcess from './stopProcess'
import * as takeScreenshot from './takeScreenshot'
import * as setToken from './setToken'; // Import the module
import * as getToken from './getToken'

export const commands = {
  download,
  listBrowsers,
  selectBrowser,
  startProcess,
  stopProcess,
  takeScreenshot,
   setToken,
   getToken
}

/**
 * This governs spinning up webdrivers, building the instances, and spinning
 * back down
 */
export type Shape = {
  download: Download
  listBrowsers: ListBrowsers
  selectBrowser: SelectBrowser
  startProcess: StartProcess
  stopProcess: StopProcess
  takeScreenshot: TakeScreenshot
  setToken: SetToken
  getToken:GetToken 
}
