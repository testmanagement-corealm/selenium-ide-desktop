// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import webdriver, {
  Capabilities,
  WebDriver,
  WebElement as WebElementShape,
} from 'selenium-webdriver'
import { absolutifyUrl } from './utils'
import {
  composePreprocessors,
  preprocessArray,
  interpolateString,
  interpolateScript,
} from './preprocessors'
import { AssertionError, VerificationError } from './errors'
import Variables from './variables'
import { Fn } from '@seleniumhq/side-commons'
import { CommandShape } from '@seleniumhq/side-model'
import {
  PluginRuntimeShape,
  StoreWindowHandleHookInput,
  WindowAppearedHookInput,
  WindowSwitchedHookInput,
} from './types'
import { inspect } from 'util'
// import { format, addDays, subDays } from 'date-fns';


const {
  version: SeleniumWebdriverVersion,
} = require('selenium-webdriver/package.json')

const { By, Condition, until, Key, WebElementCondition } = webdriver

export type ExpandedCapabilities = Partial<Capabilities> & {
  browserName: string
  'goog:chromeOptions'?: Record<string, boolean | number | string | string[]>
}
const DEFAULT_CAPABILITIES: ExpandedCapabilities = {
  browserName: 'chrome',
}

const state = Symbol('state')

/**
 * This is a polyfill type to allow for unsupported electron
 * driver methods to override with their own custom implementations
 */
export interface WindowAPI {
  setWindowSize: (
    executor: WebDriverExecutor,
    width: number,
    height: number
  ) => Promise<void>
}

export interface WebDriverExecutorConstructorArgs {
  capabilities?: ExpandedCapabilities
  customCommands?: PluginRuntimeShape['commands']
  disableCodeExportCompat?: boolean
  driver?: WebDriver
  hooks?: WebDriverExecutorHooks
  implicitWait?: number
  server?: string
}

export interface WebDriverExecutorInitOptions {
  baseUrl: string
  debug?: boolean
  logger: Console
  variables: Variables
}

export interface WebDriverExecutorCondEvalResult {
  value: boolean
}

interface Props {
  defaultValue: string;
  formatvalue: string;
}
export interface BeforePlayHookInput {
  driver: WebDriverExecutor
}

export interface CommandHookInput {
  command: CommandShape
}

export type GeneralHook<T> = (input: T) => Promise<void> | void

export interface WebDriverExecutorHooks {
  onBeforePlay?: GeneralHook<BeforePlayHookInput>
  onAfterCommand?: GeneralHook<CommandHookInput>
  onBeforeCommand?: GeneralHook<CommandHookInput>
  onStoreWindowHandle?: GeneralHook<StoreWindowHandleHookInput>
  onWindowAppeared?: GeneralHook<WindowAppearedHookInput>
  onWindowSwitched?: GeneralHook<WindowSwitchedHookInput>
}

export type HookKeys = keyof WebDriverExecutorHooks

export interface ElementEditableScriptResult {
  enabled: boolean
  readonly: boolean
}

export interface ScriptShape {
  script: string
  argv: any[]
}

export default class WebDriverExecutor {
  constructor({
    customCommands = {},
    disableCodeExportCompat = false,
    driver,
    capabilities,
    server,
    hooks = {},
    implicitWait,
  }: WebDriverExecutorConstructorArgs) {
    if (driver) {
      this.driver = driver
    } else {
      this.capabilities = capabilities || DEFAULT_CAPABILITIES
      this.server = server
    }
    this.disableCodeExportCompat = disableCodeExportCompat
    this.initialized = false
    this.implicitWait = implicitWait || 5 * 1000
    this.hooks = hooks
    this.waitForNewWindow = this.waitForNewWindow.bind(this)
    this.customCommands = customCommands
  }
  baseUrl?: string
  // @ts-expect-error
  variables: Variables
  cancellable?: { cancel: () => void }
  capabilities?: ExpandedCapabilities
  customCommands: Required<PluginRuntimeShape>['commands']
  disableCodeExportCompat: boolean
  // @ts-expect-error
  driver: WebDriver
  server?: string
  windowHandle?: string
  hooks: WebDriverExecutorHooks
  implicitWait: number
  initialized: boolean
  logger?: Console;
  [state]?: any

  getDriverSync({
    debug,
    logger,
  }: Pick<
    WebDriverExecutorInitOptions,
    'debug' | 'logger'
  >): webdriver.ThenableWebDriver {
    const { browserName, ...capabilities } = this
      .capabilities as ExpandedCapabilities
    if (debug) {
      logger.info('Building driver for ' + browserName)
      logger.info(
        'Driver attributes:' +
          inspect({
            capabilities,
            server: this.server,
            browserName,
          })
      )
    }
    let builder = new webdriver.Builder().withCapabilities(capabilities)
    if (this.server) {
      builder = builder.usingServer(this.server)
    }
    return builder.forBrowser(browserName).build()
  }
  async getDriver({
    debug,
    logger,
  }: Pick<WebDriverExecutorInitOptions, 'debug' | 'logger'>) {
    const { browserName, ...capabilities } = this
      .capabilities as ExpandedCapabilities
    try {
      const driver = await new Promise<
        Awaited<ReturnType<typeof this.getDriverSync>>
      >((resolve, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              'Driver took too long to build. This is likely an issue with the browser or driver.'
            )
          )
        }, 30000)
        this.getDriverSync({ debug, logger }).then(resolve, reject)
      })
      debug && logger.info('Driver has been built for ' + browserName)
      return driver
    } catch (e) {
      if (debug) {
        const driverCode =
          'const driver = new webdriver.Builder()' +
          `.withCapabilities(${JSON.stringify(capabilities)})` +
          (this.server ? `.usingServer('${this.server}')` : '') +
          `.forBrowser('${browserName}').build()`
        console.error(`
          Failed to build driver for ${browserName}
          Supplied capabilities: ${JSON.stringify(capabilities)}
          Server: ${this.server || 'none'}
          Error: ${e}

          OS: ${process.platform}
          Node: ${process.version}
          Selenium-Webdriver: ${SeleniumWebdriverVersion}

          This is breaking at the boundary of the following code in selenium-webdriver:

          // BEGIN SELENIUM-WEBDRIVER CODE
          const webdriver = require('selenium-webdriver')
          ${driverCode}
          // END SELENIUM-WEBDRIVER CODE

          To ensure the bug is in selenium IDE, please attempt to run the above code in a script or node REPL.
          You may have to npm install selenium-webdriver first.

          If you are unable to proceed further, please raise a bug here:
          https://github.com/SeleniumHQ/selenium/issues/new?assignees=&labels=I-defect%2Cneeds-triaging&projects=&template=bug-report.yml&title=%5B%F0%9F%90%9B+Bug%5D%3A+

          If this code works in selenium-webdriver, but not the IDE or side-runner, please raise a bug here:
          https://github.com/SeleniumHQ/selenium-ide/issues/new?assignees=&labels=&projects=&template=bug.md
        `)
      }
      throw e
    }
  }

  async init({
    baseUrl,
    debug,
    logger,
    variables,
  }: WebDriverExecutorInitOptions) {
    this.baseUrl = baseUrl
    this.logger = logger
    this.variables = variables
    this[state] = {}

    if (!this.driver) {
      this.driver = await this.getDriver({ debug, logger })
    }
    this.initialized = true
  }

  async cancel() {
    if (this.cancellable) {
      await this.cancellable.cancel()
    }
  }

  async cleanup(persistSession = false) {
    // await this.cancel()
    if (this.driver) {
      if (persistSession) {
        await this.driver.close()
      } else {
        await this.driver.quit()
      }
      // @ts-expect-error
      this.driver = undefined
      this.initialized = false
    }
  }

  isAlive() {
    // webdriver will throw for us, but not necessarily for all commands
    // TODO: check if there are commands that will succeed if we always return true
    return true
  }
   generateAlphanumeric(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // Loop to generate the random string of the specified length
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    
    return result;
  }
  formatDate = (date: Date, format: string): string => {
    const day = date.getDate();
    const month = date.getMonth(); // 0-based (0 = January, 1 = February, ...)
    const year = date.getFullYear();
    const weekday = date.toLocaleString('en-US', { weekday: 'long' }); // e.g., "Monday"
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const shortMonthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const shortWeekdayNames = [
      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
    ];
  
    // Helper function to add leading zeros when necessary
    const pad = (num: number): string => (num < 10 ? `0${num}` : num.toString());
  
    // Format the date string based on the provided format
    return format
    .replace('yyyy', year.toString()) // Full year (e.g., 2024)
    .replace('yy', year.toString().slice(-2)) // 2-digit year (e.g., 24)
    .replace('a', date.getHours() < 12 ? 'AM' : 'PM') // AM/PM
    .replace('HH', pad(date.getHours())) // Hours (00-23)
    .replace('H', date.getHours().toString()) // Hours (0-23)
    .replace('mm', pad(date.getMinutes())) // Minutes (00-59)
    .replace('m', date.getMinutes().toString()) // Minutes (0-59)
    .replace('ss', pad(date.getSeconds())) // Seconds (00-59)
    .replace('s', date.getSeconds().toString()) // Seconds (0-59) 
    .replace('MMMM', monthNames[month]) // Full month name (e.g., November)
    .replace('MMM', shortMonthNames[month]) // Abbreviated month name (e.g., Nov)
    .replace('MM', pad(month + 1)) // Month (01-12)
    .replace('M', (month + 1).toString()) // Month (1-12)
    .replace('dddd', weekday) // Full weekday name (e.g., Monday)
    .replace('ddd', shortWeekdayNames[date.getDay()]) // Abbreviated weekday name (e.g., Mon)
    .replace('dd', pad(day)) // Day of the month (01-31)
    .replace('d', day.toString()) // Day of the month without leading zero (1-31)
  };
   processDate = ({ defaultValue, formatvalue }: Props): string => {
    let generatedDate: Date = new Date();
  
    if (defaultValue && defaultValue.trim() !== '') {
      // Check if defaultValue starts with "-" indicating subtraction
      if (defaultValue.startsWith('-')) {
        const daysToSubtract: number = parseInt(defaultValue.slice(1), 10);
        generatedDate.setDate(generatedDate.getDate() - daysToSubtract); // Subtract days
      } else {
        const daysToAdd: number = parseInt(defaultValue, 10);
        generatedDate.setDate(generatedDate.getDate() + daysToAdd); // Add days
      }
    }
  
    // Format the generated date using the provided format
    const value: string = this.formatDate(generatedDate, formatvalue);
  
    console.log('Formatted date:', value);
  
    return value;
  };
  


  name(command: string) {
    if (!command) {
      return 'skip'
    }

    if (this.customCommands[command]) {
      return command
    }
    const func = this.nameTransform(command)
    // @ts-expect-error The functions can be overridden by custom commands and stuff
    if (!this[func]) {
      throw new Error(`Unknown command ${command}`)
    }
    return func
  }

  nameTransform(command: string) {
    const upperCase = command.charAt(0).toUpperCase() + command.slice(1)
    return 'do' + upperCase
  }

  async executeHook<T extends HookKeys>(
    hook: T,
    ...args: Parameters<NonNullable<WebDriverExecutorHooks[T]>>
  ) {
    type HookContents = WebDriverExecutorHooks[T]
    type HookParameters = Parameters<NonNullable<HookContents>>
    const fn = this.hooks[hook] as HookContents
    if (!fn) return
    // @ts-expect-error it's okay, this shape is fine
    await fn.apply(this, args as HookParameters)
  }

  async beforeCommand(commandObject: CommandShape) {
    if (commandObject.opensWindow) {
      this[state].openedWindows = await this.driver.getAllWindowHandles()
    }
    await this.executeHook('onBeforeCommand', { command: commandObject })
  }

  async afterCommand(commandObject: CommandShape) {
    this.cancellable = undefined
    if (commandObject.opensWindow) {
      const handle = await this.waitForNewWindow(commandObject.windowTimeout)
      this.variables.set(commandObject.windowHandleName as string, handle)

      await this.executeHook('onWindowAppeared', {
        command: commandObject,
        windowHandleName: commandObject.windowHandleName,
        windowHandle: handle,
      })
    }

    await this.executeHook('onAfterCommand', { command: commandObject })
  }

  async waitForNewWindow(timeout: number = 2000) {
    const finder = new Promise<string | undefined>((resolve) => {
      const start = Date.now()
      const findHandle = this.withCancel(async () => {
        if (Date.now() - start > timeout) {
          resolve(undefined)
          return
        }

        const currentHandles = await this.driver.getAllWindowHandles()
        const newHandle = currentHandles.find(
          (handle) => !this[state].openedWindows.includes(handle)
        )
        if (newHandle) {
          resolve(newHandle)
          return
        }
        // cant find, wait next time.
        setTimeout(findHandle, 200)
      })

      findHandle()
    })

    return this.driver.wait(finder, timeout)
  }

  registerCommand(commandName: string, fn: Fn) {
    // @ts-expect-error
    this['do' + commandName.charAt(0).toUpperCase() + commandName.slice(1)] = fn
  }

  // Commands go after this line
  async skip() {
    return Promise.resolve()
  }

  // window commands
  async doOpen(url: string) {
    await this.driver.get(absolutifyUrl(url, this.baseUrl as string))
  }

  async doSetWindowSize(widthXheight: string) {
    const [width, height] = widthXheight.split('x').map((v) => parseInt(v))
    await this.driver.manage().window().setRect({ width, height })
  }
  async doStep() {
   console.log('step command executed')
  }
   async doCreateteststep(){
    console.log('create test step executed')
   }
   async doGetText(locator: string,
   _: string,
    commandObject: Partial<CommandShape> = {}){
    console.log('get text step executed')
    // console.log('locator',locator)
    // console.log('optionLocator',value)
    // console.log('commandObject',commandObject)
    
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    
     let val = await element.getAttribute('value')
    //  console.log('value ettr',val)
     if(val){
      this.variables.set(commandObject.variableName||'', val)
     }else{
      const text = await element.getText()
      // console.log('text attr',text)
      this.variables.set(commandObject.variableName||'', text)
     }
   
 

   }
   async doCreateVariable(  variableName: string,
    value: string,
    commandObject: Partial<CommandShape> = {}){
    console.log('create variable step executed')
    // console.log('locator',variableName)
    // console.log('optionLocator',value)
    // console.log('commandObject',commandObject)
    let dynamicval=''
    if(commandObject.dynamicValue){
       dynamicval = this.generateAlphanumeric(commandObject.dynamicValueLen || 22)
    }
    // console.log('dynamicval',dynamicval)
    let newVal = `${value}${dynamicval}`
    // console.log('newval',newVal)
    this.variables.set(variableName,newVal)
   }
   async doGenerateDate(locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}){
    console.log('generate date test step executed')
    // Example usage
    const defaultValue = commandObject.defaultValue || ''; // Example input: subtract 5 days
    const formatvalue = value; // Example format
  
    const formattedDate = this.processDate({ defaultValue, formatvalue });
    // console.log(formattedDate,locator); // Output formatted date string
    if(formattedDate){
      this.variables.set(locator,formattedDate)
    }
   
   }
   async doExtractData(locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}){
    console.log('extract data step executed')

    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    
     let val = await element.getAttribute('value')
  
     if(!val){
      val = await element.getText()
     }
   
    //  console.log('value ettr',val)
    let template=value;
    let sample=val;
    const placeholders = [];

    // Correct placeholder pattern
    const placeholderPattern = /{{(\w+)}}/g;
    let match;
    
    // Find all placeholders in the template
    while ((match = placeholderPattern.exec(template)) !== null) {
        placeholders.push(match[1]);
    }
    // console.log('placeholders', placeholders);
    
    // Create a regex pattern from the template
    const parts = template.replace(/{{\w+}}/g, '(.*)'); // Replace placeholders with capturing groups
    // console.log("parts", parts);
    
    // Ensure the regex matches the entire string by adding anchors ^ and $
    const regex = new RegExp('^' + parts + '$');
    
    // Match the sample string against the generated regex pattern
    const sampleMatch = sample.match(regex);
    // console.log('sample', sampleMatch);
    
    if (!sampleMatch) {
        return;
    }
    
    for (let i = 0; i < placeholders.length; i++) {
        // console.log(placeholders[i], sampleMatch[i + 1]);  
        this.variables.set(placeholders[i],sampleMatch[i + 1]) 
    }
    
   }

  async doWebRtcOpen(_: string, url:string) {
    await this.driver.get(absolutifyUrl(url, this.baseUrl as string))
  }
  
  async doWaituntilset(){
    console.log('wait until step executed')
   }

  async doSelectWindow(handleLocator: string) {
    const prefix = 'handle='
    if (handleLocator.startsWith(prefix)) {
      const handle = handleLocator.substr(prefix.length)
      await this.driver.switchTo().window(handle)
      await this.executeHook('onWindowSwitched', {
        windowHandle: handle,
      })
    } else {
      throw new Error(
        'Invalid window handle given (e.g. handle=${handleVariable})'
      )
    }
  }

  async doClose() {
    await this.driver.close()
  }

  async doSelectFrame(locator: string) {
    // It's possible that for the browser and webdriver to index frames differently.
    // We can ask the browser for the URL of the underlying original index and use that in
    // webdriver to ensure we get the proper match.

    const targetLocator = this.driver.switchTo()
    if (locator === 'relative=top') {
      await targetLocator.defaultContent()
    } else if (locator === 'relative=parent') {
      await targetLocator.parentFrame()
    } else if (locator.startsWith('index=')) {
      const frameIndex = locator.substring('index='.length)
      const frameTargets = frameIndex.split('\\')
      for (let frameTarget of frameTargets) {
        if (frameTarget === '..') await targetLocator.parentFrame()
        else {
          if (this.disableCodeExportCompat) {
            const frameIndex = locator.substring('index='.length)
            // Delay for a second. Check too fast, and browser will think this iframe location is 'about:blank'
            await new Promise((f) => setTimeout(f, 1000))
            const frameUrl = await this.driver.executeScript(
              "return window.frames['" + frameIndex + "'].location.href"
            )
            const windowFrames = await this.driver.findElements(
              By.css('iframe')
            )
            let matchIndex = 0
            for (let frame of windowFrames) {
              let localFrameUrl = await frame.getAttribute('src')
              if (localFrameUrl === frameUrl) {
                break
              }
              matchIndex++
            }
            this.driver.switchTo().frame(matchIndex)
          } else {
            await targetLocator.frame(Number(frameTarget))
          }
        }
      }
    } else {
      const element = await this.waitForElement(locator)
      await targetLocator.frame(element)
    }
  }

  // mouse commands

  async doAddSelection(
    locator: string,
    optionLocator: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const option = await element.findElement(parseOptionLocator(optionLocator))
    const selections = (await this.driver.executeScript(
      'return arguments[0].selectedOptions',
      element
    )) as WebElementShape[]
    if (!(await findElement(selections, option))) {
      await option.click()
    }
  }

  async doRemoveSelection(
    locator: string,
    optionLocator: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )

    if (!(await element.getAttribute('multiple'))) {
      throw new Error('Given element is not a multiple select type element')
    }

    const option = await element.findElement(parseOptionLocator(optionLocator))
    const selections = (await this.driver.executeScript(
      'return arguments[0].selectedOptions',
      element
    )) as WebElementShape[]
    if (await findElement(selections, option)) {
      await option.click()
    }
  }

  async doCheck(
    locator: string,
    _: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    if (!(await element.isSelected())) {
      await element.click()
    }
  }

  async doUncheck(
    locator: string,
    _: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    if (await element.isSelected()) {
      await element.click()
    }
  }

  async doClick(
    locator: string,
    _?: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElementVisible(
      locator,
      this.implicitWait,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await element.click()
  }
  async doScrollTo(
    locator: string,
    _?: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElementVisible(
      locator,
      this.implicitWait,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver.executeScript('arguments[0].scrollIntoView(true);',element)

  }
  async doScrollToPosition(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    console.log('scoll to position value', value)
    const element = await this.waitForElementVisible(
      locator,
      this.implicitWait,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
  
      await this.driver.executeScript('arguments[0].scrollTo(0,arguments[1]);',element,value)

    

  }
  async  doMouseHover(
    locator: string,
    _?: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    // console.log('commandobj tar',commandObject.targets)
    const element = await this.waitForElementVisible(
      locator,
      this.implicitWait,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )

  
      await this.driver.actions({bridge: true}).move({origin: element}).perform();
    

  }


  async doRightClick(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    console.log('scoll to position value', value)
    const element = await this.waitForElementVisible(
      locator,
      this.implicitWait,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
  
      await this.driver.executeScript(`const el = arguments[0];
        const eventContextMenu = new MouseEvent('contextmenu', {
            bubbles: true,
          });
        el.dispatchEvent(eventContextMenu);`, element)
  }



  async doClickAt(
    locator: string,
    coordString: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const coords = parseCoordString(coordString)
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver
      .actions({ bridge: true })
      .move({ origin: element, ...coords })
      .click()
      .perform()
  }

  async doDoubleClick(
    locator: string,
    _?: string,
    _commandObject?: Partial<CommandShape>
  ) {
    const commandObject = _commandObject || {}
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver.actions({ bridge: true }).doubleClick(element).perform()
  }

  async doDoubleClickAt(
    locator: string,
    coordString: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const coords = parseCoordString(coordString)
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver
      .actions({ bridge: true })
      .move({ origin: element, ...coords })
      .doubleClick()
      .perform()
  }

  async doDragAndDropToObject(
    dragLocator: string,
    dropLocator: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const drag = await this.waitForElement(
      dragLocator,
      commandObject.targetFallback
    )
    const drop = await this.waitForElement(
      dropLocator,
      commandObject.valueFallback
    )
    await this.driver
      .actions({ bridge: true })
      .dragAndDrop(drag, drop)
      .perform()
  }

  async doMouseDown(
    locator: string,
    _?: string,
    _commandObject?: Partial<CommandShape>
  ) {
    const commandObject = _commandObject || {}
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver
      .actions({ bridge: true })
      .move({ origin: element })
      .press()
      .perform()
  }

  async doMouseDownAt(
    locator: string,
    coordString: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const coords = parseCoordString(coordString)
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver
      .actions({ bridge: true })
      .move({ origin: element, ...coords })
      .press()
      .perform()
  }

  async doMouseMoveAt(
    locator: string,
    coordString: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const coords = parseCoordString(coordString)
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver
      .actions({ bridge: true })
      .move({ origin: element, ...coords })
      .perform()
  }

  async doMouseOut(
    locator: string,
    _?: string,
    _commandObject?: Partial<CommandShape>
  ) {
    const commandObject = _commandObject || {}
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const [rect, vp]: [DOMRect, { height: number; width: number }] =
      await this.driver.executeScript(
        'return [arguments[0].getBoundingClientRect(), {height: window.innerHeight, width: window.innerWidth}];',
        element
      )

    // try top
    if (rect.top > 0) {
      const y = Math.round(-(rect.height / 2 + 1))
      return await this.driver
        .actions({ bridge: true })
        .move({ origin: element, y })
        .perform()
    }
    // try right
    else if (vp.width > rect.right) {
      const x = Math.round(rect.right / 2 + 1)
      return await this.driver
        .actions({ bridge: true })
        .move({ origin: element, x })
        .perform()
    }
    // try bottom
    else if (vp.height > rect.bottom) {
      const y = Math.round(rect.height / 2 + 1)
      return await this.driver
        .actions({ bridge: true })
        .move({ origin: element, y })
        .perform()
    }
    // try left
    else if (rect.left > 0) {
      const x = Math.round(-rect.right / 2)
      return await this.driver
        .actions({ bridge: true })
        .move({ origin: element, x })
        .perform()
    }

    throw new Error(
      'Unable to perform mouse out as the element takes up the entire viewport'
    )
  }

  async doMouseOver(
    locator: string,
    _?: string,
    _commandObject?: Partial<CommandShape>
  ) {
    const commandObject = _commandObject || {}
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver
      .actions({ bridge: true })
      .move({ origin: element })
      .perform()
  }

  async doMouseUp(
    locator: string,
    _?: string,
    _commandObject?: Partial<CommandShape>
  ) {
    const commandObject = _commandObject || {}
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver
      .actions({ bridge: true })
      .move({ origin: element })
      .release()
      .perform()
  }

  async doMouseUpAt(
    locator: string,
    coordString: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const coords = parseCoordString(coordString)
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver
      .actions({ bridge: true })
      .move({ origin: element, ...coords })
      .release()
      .perform()
  }

  async doSelect(
    locator: string,
    optionLocator: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const option = await element.findElement(parseOptionLocator(optionLocator))
    await option.click()
  }

  async doSubmit(
    locator: string,
    _?: string,
    _commandObject?: Partial<CommandShape>
  ) {
    const commandObject = _commandObject || {}
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )

    console.error(`
      "submit" is not a good command in Selenium WebDriver. It's not supported by 
      all browsers and it's manually triggering an event, when it should really
      be driven out of an interaction (click submit, hit enter, etc).
      Please re-record the step using a "click" or "sendKeys" command instead.
    `)
    await element.submit()
  }

  // keyboard commands

  async doEditContent(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await this.driver.executeScript(
      "if(arguments[0].contentEditable === 'true') {arguments[0].innerText = arguments[1]} else {throw new Error('Element is not content editable')}",
      element,
      value
    )
  }

  async doType(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    let newVal = value
    if(commandObject.dynamicValue){
        let dynamicval = this.generateAlphanumeric(commandObject.dynamicValueLen || 22)
        newVal =  `${newVal}${dynamicval}`
    }
    // console.log('newVal',newVal)
    await element.clear()
    await element.sendKeys(newVal)
  }

  async doSendKeys(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    await element.sendKeys(...value)
  }

  // wait commands

  async doWaitForElementEditable(locator: string, timeout: string) {
    const condition = new Condition('for element to be editable', async () => {
      const element = await this.driver.findElement(parseLocator(locator))
      if (!element) {
        return null
      }
      const isEditable = await this.isElementEditable(element)
      return isEditable
    })
    await this.driver.wait(condition, parseInt(timeout))
  }

  async doWaitForElementNotEditable(locator: string, timeout: string) {
    const condition = new Condition('for element to be editable', async () => {
      const element = await this.driver.findElement(parseLocator(locator))
      if (!element) {
        return null
      }
      const isEditable = await this.isElementEditable(element)
      return !isEditable
    })
    await this.driver.wait(condition, parseInt(timeout))
  }

  async doWaitForElementPresent(
    locator: string,
    timeout: string,
    commandObj: Partial<CommandShape> = {}
  ) {
    const locatorCondition = new WebElementCondition(
      'for element to be present',
      async () =>
        await this.elementIsLocated(
          locator,
          commandObj.targetFallback,
          commandObj.targets,
          commandObj.fallbackTargets
        )
    )
    await this.driver.wait(locatorCondition, Number(timeout))
  }

  async doWaitForElementNotPresent(locator: string, timeout: string) {
    const parsedLocator = parseLocator(locator)
    const elements = await this.driver.findElements(parsedLocator)
    if (elements.length !== 0) {
      const noElementPresentCondition = new Condition(
        'for element to not be present',
        async () => {
          const elements = await this.driver.findElements(parsedLocator)
          return elements.length === 0
        }
      )
      await this.driver.wait<boolean>(
        noElementPresentCondition,
        Number(timeout)
      )
    }
  }

  async doWaitForElementVisible(
    locator: string,
    timeout: string,
    commandObj: Partial<CommandShape> = {}
  ) {
    await this.waitForElementVisible(
      locator,
      parseInt(timeout),
      commandObj.targetFallback
    )
  }

  async doWaitForElementNotVisible(locator: string, timeout: string) {
    const parsedLocator = parseLocator(locator)
    const elements = await this.driver.findElements(parsedLocator)

    if (elements.length > 0) {
      await this.driver.wait(
        until.elementIsNotVisible(elements[0]),
        parseInt(timeout)
      )
    }
  }

  async doWaitForText(
    locator: string,
    text: string,
    commandObj: Partial<CommandShape> = {}
  ) {
    await this.waitForText(locator, text, commandObj.targetFallback)
  }

  // script commands

  async doRunScript(script: ScriptShape) {
    await this.driver.executeScript(script.script, ...script.argv)
  }

  async doExecuteScript(script: ScriptShape, optionalVariable?: string) {
    const result = await this.driver.executeScript(
      script.script,
      ...script.argv
    )
    if (optionalVariable) {
      this.variables.set(optionalVariable, result)
    }
  }

  async doExecuteAsyncScript(script: ScriptShape, optionalVariable?: string) {
    const result = await this.driver.executeAsyncScript(
      `var callback = arguments[arguments.length - 1];${script.script}.then(callback).catch(callback);`,
      ...script.argv
    )
    if (optionalVariable) {
      this.variables.set(optionalVariable, result)
    }
  }

  // alert commands

  async doAcceptAlert() {
    await this.driver.switchTo().alert().accept()
  }

  async doAcceptConfirmation() {
    await this.driver.switchTo().alert().accept()
  }

  async doAnswerPrompt(optAnswer?: string) {
    const alert = await this.driver.switchTo().alert()
    if (optAnswer) {
      await alert.sendKeys(optAnswer)
    }
    await alert.accept()
  }

  async doDismissConfirmation() {
    await this.driver.switchTo().alert().dismiss()
  }

  async doDismissPrompt() {
    await this.driver.switchTo().alert().dismiss()
  }

  // store commands

  async doStore(string: string, variable: string) {
    this.variables.set(variable, string)
    return Promise.resolve()
  }

  async doStoreAttribute(attributeLocator: string, variable: string) {
    const attributePos = attributeLocator.lastIndexOf('@')
    const elementLocator = attributeLocator.slice(0, attributePos)
    const attributeName = attributeLocator.slice(attributePos + 1)

    const element = await this.waitForElement(elementLocator)
    const value = await element.getAttribute(attributeName)
    this.variables.set(variable, value)
  }

  async doStoreElementCount(locator: string, variable: string) {
    const elements = await this.driver.findElements(parseLocator(locator))
    this.variables.set(variable, elements.length)
  }

  async doStoreJson(json: string, variable: string) {
    this.variables.set(variable, JSON.parse(json))
    return Promise.resolve()
  }

  async doStoreText(
    locator: string,
    variable: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const text = await element.getText()
    this.variables.set(variable, text)
  }

  async doStoreTitle(variable: string) {
    const title = await this.driver.getTitle()
    this.variables.set(variable, title)
  }

  async doStoreValue(
    locator: string,
    variable: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const value = await element.getAttribute('value')
    this.variables.set(variable, value)
  }

  async doStoreWindowHandle(variable: string) {
    const handle = await this.driver.getWindowHandle()
    this.variables.set(variable, handle)
    await this.executeHook('onStoreWindowHandle', {
      windowHandle: handle,
      windowHandleName: variable,
    })
  }

  // assertions

  async doAssert(variableName: string, value: string) {
    const variable = `${this.variables.get(variableName)}`
    if (variable != value) {
      throw new AssertionError(
        "Actual value '" + variable + "' did not match '" + value + "'"
      )
    }
  }

  async doAssertAlert(expectedText: string) {
    const alert = await this.driver.switchTo().alert()
    const actualText = await alert.getText()
    if (actualText !== expectedText) {
      throw new AssertionError(
        "Actual alert text '" +
          actualText +
          "' did not match '" +
          expectedText +
          "'"
      )
    }
  }

  async doAssertConfirmation(expectedText: string) {
    const alert = await this.driver.switchTo().alert()
    const actualText = await alert.getText()
    if (actualText !== expectedText) {
      throw new AssertionError(
        "Actual confirm text '" +
          actualText +
          "' did not match '" +
          expectedText +
          "'"
      )
    }
  }

  async doAssertEditable(
    locator: string,
    _?: string,
    _commandObject?: Partial<CommandShape>
  ) {
    const commandObject = _commandObject || {}
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    if (!(await this.isElementEditable(element))) {
      throw new AssertionError('Element is not editable')
    }
  }

  async doAssertNotEditable(
    locator: string,
    _?: string,
    _commandObject?: Partial<CommandShape>
  ) {
    const commandObject = _commandObject || {}
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    if (await this.isElementEditable(element)) {
      throw new AssertionError('Element is editable')
    }
  }

  async doAssertPrompt(expectedText: string) {
    const alert = await this.driver.switchTo().alert()
    const actualText = await alert.getText()
    if (actualText !== expectedText) {
      throw new AssertionError(
        "Actual prompt text '" +
          actualText +
          "' did not match '" +
          expectedText +
          "'"
      )
    }
  }

  async doAssertTitle(title: string) {
    const actualTitle = await this.driver.getTitle()
    if (title != actualTitle) {
      throw new AssertionError(
        "Actual value '" + actualTitle + "' did not match '" + title + "'"
      )
    }
  }

  async doAssertElementPresent(
    locator: string,
    _: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    await this.waitForElement(locator, commandObject.targetFallback)
  }

  async doAssertElementNotPresent(locator: string) {
    const elements = await this.driver.findElements(parseLocator(locator))
    if (elements.length) {
      throw new AssertionError('Unexpected element was found in page')
    }
  }

  async doAssertText(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const text = await element.getText()
    if (text !== value) {
      throw new AssertionError(
        "Actual value '" + text + "' did not match '" + value + "'"
      )
    }
  }

  async doAssertNotText(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const text = await element.getText()
    if (text === value) {
      throw new AssertionError(
        "Actual value '" + text + "' did match '" + value + "'"
      )
    }
  }

  async doAssertValue(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const elementValue = await element.getAttribute('value')
    if (elementValue !== value) {
      throw new AssertionError(
        "Actual value '" + elementValue + "' did not match '" + value + "'"
      )
    }
  }

  // not generally implemented
  async doAssertNotValue(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const elementValue = await element.getAttribute('value')
    if (elementValue === value) {
      throw new AssertionError(
        "Actual value '" + elementValue + "' did match '" + value + "'"
      )
    }
  }

  async doAssertChecked(
    locator: string,
    _: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    if (!(await element.isSelected())) {
      throw new AssertionError('Element is not checked, expected to be checked')
    }
  }

  async doAssertNotChecked(
    locator: string,
    _: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    if (await element.isSelected()) {
      throw new AssertionError('Element is checked, expected to be unchecked')
    }
  }

  async doAssertSelectedValue(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const elementValue = await element.getAttribute('value')
    if (elementValue !== value) {
      throw new AssertionError(
        "Actual value '" + elementValue + "' did not match '" + value + "'"
      )
    }
  }

  async doAssertNotSelectedValue(
    locator: string,
    value: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const elementValue = await element.getAttribute('value')
    if (elementValue === value) {
      throw new AssertionError(
        "Actual value '" + elementValue + "' did match '" + value + "'"
      )
    }
  }

  async doAssertSelectedLabel(
    locator: string,
    label: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const selectedValue = await element.getAttribute('value')
    const selectedOption = await element.findElement(
      By.xpath(`option[@value="${selectedValue}"]`)
    )
    const selectedOptionLabel = await selectedOption.getText()
    if (selectedOptionLabel !== label) {
      throw new AssertionError(
        "Actual value '" +
          selectedOptionLabel +
          "' did not match '" +
          label +
          "'"
      )
    }
  }

  async doAssertNotSelectedLabel(
    locator: string,
    label: string,
    commandObject: Partial<CommandShape> = {}
  ) {
    const element = await this.waitForElement(
      locator,
      commandObject.targetFallback,
      commandObject.targets,
      commandObject.fallbackTargets
    )
    const selectedValue = await element.getAttribute('value')
    const selectedOption = await element.findElement(
      By.xpath(`option[@value="${selectedValue}"]`)
    )
    const selectedOptionLabel = await selectedOption.getText()
    if (selectedOptionLabel === label) {
      throw new AssertionError(
        "Actual value '" + selectedOptionLabel + "' not match '" + label + "'"
      )
    }
  }

  // other commands

  async doDebugger() {
    throw new Error('`debugger` is not supported in this run mode')
  }

  async doEcho(string: string) {
    if (this.logger) {
      this.logger.info(`echo: ${string}`)
    }
  }

  async doPause(time: number) {
    await this.driver.sleep(time)
  }

  async doRun() {
    throw new Error('`run` is not supported in this run mode')
  }

  async doSetSpeed() {
    throw new Error('`set speed` is not supported in this run mode')
  }

  async evaluateConditional(
    script: ScriptShape
  ): Promise<WebDriverExecutorCondEvalResult> {
    const result = await this.driver.executeScript(
      interpolateScript(`return (${script.script})`, this.variables).script,
      ...script.argv
    )
    return {
      value: !!result,
    }
  }

  async elementIsLocated(
    locator: string,
    ..._fallbacks: (undefined | [string, string][])[]
  ): Promise<WebElementShape | null> {
    const elementLocator = parseLocator(locator)
    const matches = await this.driver.findElements(elementLocator)
    if (matches.length > 0) return matches[0]
    return null
    // Fallback selectors are not visible or editable enough for now.
    // They create points of user confusion and are not necessary for the vast majority of cases.
    /*
    const fallbacks = _fallbacks.filter(Boolean).flat() as [string, string][]
    for (let i = 0; i < fallbacks.length; i++) {
      const loc = parseLocator(fallbacks[i][0])
      const fallbackMatches = await this.driver.findElements(loc)
      if (fallbackMatches.length) return fallbackMatches[0]
    }
    return null
    */
  }

  withCancel<T extends () => Promise<any>>(poller: T) {
    let resolveCancel: (value?: unknown) => void
    const cancelPromise = new Promise((res) => {
      resolveCancel = res
    })
    let cancelled = false
    this.cancellable = {
      cancel: () => {
        cancelled = true
        return cancelPromise
      },
    }
    return async () => {
      if (cancelled) {
        resolveCancel()
        throw new Error('aborted')
      }
      return await poller()
    }
  }

  async waitForElement(
    locator: string,
    ...fallbacks: (undefined | [string, string][])[]
  ): Promise<WebElementShape> {
    const locatorCondition = new WebElementCondition(
      'for element to be located',
      this.withCancel(
        async () => await this.elementIsLocated(locator, ...fallbacks)
      )
    )
    return await this.driver.wait<WebElementShape>(
      locatorCondition,
      this.implicitWait
    )
  }

  async isElementEditable(element: WebElementShape) {
    const { enabled, readonly } =
      await this.driver.executeScript<ElementEditableScriptResult>(
        'return { enabled: !arguments[0].disabled, readonly: arguments[0].readOnly };',
        element
      )
    return enabled && !readonly
  }

  async waitForElementVisible(
    locator: string,
    timeout: number,
    ...fallbacks: (undefined | [string, string][])[]
  ) {
    const visibleCondition = new WebElementCondition(
      'for element to be visible',
      this.withCancel(async () => {
        const el = await this.elementIsLocated(locator, ...fallbacks)
        if (!el) return null
        try {
          if (!(await el.isDisplayed())) return null
        } catch (e) {
          return null
        }
        return el
      })
    )
    return await this.driver.wait<WebElementShape>(visibleCondition, timeout)
  }

  async waitForText(
    locator: string,
    text: string,
    fallback: [string, string][] = []
  ) {
    const timeout = this.implicitWait
    const textCondition = new Condition(
      'for text to be present in element',
      this.withCancel(async () => {
        const el = await this.elementIsLocated(locator, fallback)
        if (!el) return null
        try {
          const elText = (await el.getText()).replace(/\u00A0/g, ' ').trim()
          return elText === text.replace(/\u00A0/g, ' ').trim()
        } catch (e) {
          return null
        }
      })
    )
    await this.driver.wait<boolean>(textCondition, timeout)
  }
}

WebDriverExecutor.prototype.doOpen = composePreprocessors(
  interpolateString,
  WebDriverExecutor.prototype.doOpen
)

WebDriverExecutor.prototype.doSetWindowSize = composePreprocessors(
  interpolateString,
  WebDriverExecutor.prototype.doSetWindowSize
)

WebDriverExecutor.prototype.doStep = composePreprocessors(
  interpolateString,
  WebDriverExecutor.prototype.doStep
)
WebDriverExecutor.prototype.doCreateteststep = composePreprocessors(
  interpolateString,
  WebDriverExecutor.prototype.doCreateteststep
)

WebDriverExecutor.prototype.doGetText = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
    valueFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doGetText
)
WebDriverExecutor.prototype.doCreateVariable = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
    valueFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doCreateVariable
)
WebDriverExecutor.prototype.doGenerateDate = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
    valueFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doGenerateDate
)
WebDriverExecutor.prototype.doExtractData = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
    valueFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doExtractData
)
WebDriverExecutor.prototype.doWebRtcOpen = composePreprocessors(
  interpolateString,
  interpolateString,
  WebDriverExecutor.prototype.doWebRtcOpen
)
WebDriverExecutor.prototype.doWaituntilset = composePreprocessors(
  interpolateString,
  WebDriverExecutor.prototype.doWaituntilset
)
WebDriverExecutor.prototype.doSelectWindow = composePreprocessors(
  interpolateString,
  WebDriverExecutor.prototype.doSelectWindow
)

WebDriverExecutor.prototype.doSelectFrame = composePreprocessors(
  interpolateString,
  WebDriverExecutor.prototype.doSelectFrame
)

WebDriverExecutor.prototype.doAnswerPrompt = composePreprocessors(
  interpolateString,
  null,
  WebDriverExecutor.prototype.doAnswerPrompt
)

WebDriverExecutor.prototype.doAddSelection = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
    valueFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doAddSelection
)

WebDriverExecutor.prototype.doRemoveSelection = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
    valueFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doRemoveSelection
)

WebDriverExecutor.prototype.doCheck = composePreprocessors(
  interpolateString,
  null,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doCheck
)

WebDriverExecutor.prototype.doUncheck = composePreprocessors(
  interpolateString,
  null,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doUncheck
)

WebDriverExecutor.prototype.doScrollTo = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doScrollTo
)
WebDriverExecutor.prototype.doScrollToPosition = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doScrollToPosition
)
WebDriverExecutor.prototype.doMouseHover = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doMouseHover
)

WebDriverExecutor.prototype.doRightClick = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doRightClick
)

WebDriverExecutor.prototype.doClick = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doClick
)


WebDriverExecutor.prototype.doClickAt = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doClickAt
)

WebDriverExecutor.prototype.doDoubleClick = composePreprocessors(
  interpolateString,
  null,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doDoubleClick
)

WebDriverExecutor.prototype.doDoubleClickAt = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doDoubleClickAt
)

WebDriverExecutor.prototype.doDragAndDropToObject = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
    valueFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doDragAndDropToObject
)

WebDriverExecutor.prototype.doMouseDown = composePreprocessors(
  interpolateString,
  null,
  {
    targetFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doMouseDown
)

WebDriverExecutor.prototype.doMouseDownAt = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doMouseDownAt
)

WebDriverExecutor.prototype.doMouseMoveAt = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doMouseMoveAt
)

WebDriverExecutor.prototype.doMouseOut = composePreprocessors(
  interpolateString,
  null,
  {
    targetFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doMouseOut
)

WebDriverExecutor.prototype.doMouseOver = composePreprocessors(
  interpolateString,
  null,
  {
    targetFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doMouseOver
)

WebDriverExecutor.prototype.doMouseUp = composePreprocessors(
  interpolateString,
  null,
  {
    targetFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doMouseUp
)

WebDriverExecutor.prototype.doMouseUpAt = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doMouseUpAt
)

WebDriverExecutor.prototype.doSelect = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
    valueFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doSelect
)

WebDriverExecutor.prototype.doEditContent = composePreprocessors(
  interpolateString,
  interpolateString,
  {
    targetFallback: preprocessArray(interpolateString),
  },
  WebDriverExecutor.prototype.doEditContent
)

WebDriverExecutor.prototype.doType = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doType
)



WebDriverExecutor.prototype.doSendKeys = composePreprocessors(
  interpolateString,
  preprocessKeys,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doSendKeys
)

WebDriverExecutor.prototype.doRunScript = composePreprocessors(
  interpolateScript,
  WebDriverExecutor.prototype.doRunScript
)

WebDriverExecutor.prototype.doExecuteScript = composePreprocessors(
  interpolateScript,
  null,
  WebDriverExecutor.prototype.doExecuteScript
)

WebDriverExecutor.prototype.doExecuteAsyncScript = composePreprocessors(
  interpolateScript,
  null,
  WebDriverExecutor.prototype.doExecuteAsyncScript
)

WebDriverExecutor.prototype.doStore = composePreprocessors(
  interpolateString,
  null,
  WebDriverExecutor.prototype.doStore
)

WebDriverExecutor.prototype.doStoreAttribute = composePreprocessors(
  interpolateString,
  null,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doStoreAttribute
)

WebDriverExecutor.prototype.doStoreElementCount = composePreprocessors(
  interpolateString,
  null,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doStoreElementCount
)

WebDriverExecutor.prototype.doStoreJson = composePreprocessors(
  interpolateString,
  null,
  WebDriverExecutor.prototype.doStoreJson
)

WebDriverExecutor.prototype.doStoreText = composePreprocessors(
  interpolateString,
  null,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doStoreText
)

WebDriverExecutor.prototype.doStoreValue = composePreprocessors(
  interpolateString,
  null,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doStoreValue
)

WebDriverExecutor.prototype.doAssert = composePreprocessors(
  null,
  interpolateString,
  WebDriverExecutor.prototype.doAssert
)

WebDriverExecutor.prototype.doAssertAlert = composePreprocessors(
  interpolateString,
  null,
  WebDriverExecutor.prototype.doAssertAlert
)

WebDriverExecutor.prototype.doAssertConfirmation = composePreprocessors(
  interpolateString,
  null,
  WebDriverExecutor.prototype.doAssertConfirmation
)

WebDriverExecutor.prototype.doAssertEditable = composePreprocessors(
  interpolateString,
  null,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertEditable
)

WebDriverExecutor.prototype.doAssertElementPresent = composePreprocessors(
  interpolateString,
  null,
  WebDriverExecutor.prototype.doAssertElementPresent
)

WebDriverExecutor.prototype.doAssertElementNotPresent = composePreprocessors(
  interpolateString,
  null,
  WebDriverExecutor.prototype.doAssertElementNotPresent
)

WebDriverExecutor.prototype.doAssertNotEditable = composePreprocessors(
  interpolateString,
  null,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertNotEditable
)

WebDriverExecutor.prototype.doAssertPrompt = composePreprocessors(
  interpolateString,
  null,
  WebDriverExecutor.prototype.doAssertPrompt
)

WebDriverExecutor.prototype.doAssertNotText = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertNotText
)

WebDriverExecutor.prototype.doAssertText = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertText
)

WebDriverExecutor.prototype.doAssertTitle = composePreprocessors(
  interpolateString,
  null,
  WebDriverExecutor.prototype.doAssertTitle
)

WebDriverExecutor.prototype.doAssertValue = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertValue
)

WebDriverExecutor.prototype.doAssertNotValue = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertNotValue
)

WebDriverExecutor.prototype.doAssertChecked = composePreprocessors(
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertChecked
)

WebDriverExecutor.prototype.doAssertNotChecked = composePreprocessors(
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertNotChecked
)

WebDriverExecutor.prototype.doAssertNotChecked = composePreprocessors(
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertNotChecked
)

WebDriverExecutor.prototype.doAssertSelectedValue = composePreprocessors(
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertSelectedValue
)

WebDriverExecutor.prototype.doAssertNotSelectedValue = composePreprocessors(
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertNotSelectedValue
)

WebDriverExecutor.prototype.doAssertSelectedLabel = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertSelectedLabel
)

WebDriverExecutor.prototype.doAssertNotSelectedLabel = composePreprocessors(
  interpolateString,
  interpolateString,
  { targetFallback: preprocessArray(interpolateString) },
  WebDriverExecutor.prototype.doAssertSelectedLabel
)

WebDriverExecutor.prototype.doEcho = composePreprocessors(
  interpolateString,
  WebDriverExecutor.prototype.doEcho
)

const waitCommands: (keyof WebDriverExecutor)[] = [
  'doWaitForElementEditable',
  'doWaitForElementNotEditable',
  'doWaitForElementPresent',
  'doWaitForElementNotPresent',
  'doWaitForElementVisible',
  'doWaitForElementNotVisible',
  'doWaitForText',
]

waitCommands.forEach((cmd) => {
  // @ts-expect-error - Whatever who cares
  WebDriverExecutor.prototype[cmd] = composePreprocessors(
    interpolateString,
    interpolateString,
    WebDriverExecutor.prototype[cmd]
  )
})

function createVerifyCommands(Executor: WebDriverExecutor) {
  // @ts-expect-error
  Object.getOwnPropertyNames(Executor.prototype)
    .filter((command) => /^doAssert/.test(command))
    .forEach((assertion) => {
      const verify = assertion.replace('doAssert', 'doVerify')
      // @ts-expect-error
      Executor.prototype[verify] = {
        // creating the function inside an object since function declared in an
        // object are named after the property, thus creating dyanmic named funcs
        // also in order to be able to call(this) the function has to be normal
        // declaration rather than arrow, as arrow will be bound to
        // createVerifyCommands context which is undefined
        [verify]: async function (...args: any[]) {
          try {
            // @ts-expect-error
            return await Executor.prototype[assertion].call(this, ...args)
          } catch (err) {
            if (err instanceof AssertionError) {
              throw new VerificationError(err.message)
            }
            throw err
          }
        },
      }[verify]
    })
}

// @ts-expect-error
createVerifyCommands(WebDriverExecutor)

function parseLocator(locator: string) {
  if (/^\/\//.test(locator)) {
    return By.xpath(locator)
  }
  const fragments = locator.split('=')
  const type = fragments.shift() as keyof typeof LOCATORS
  const selector = fragments.join('=')
  if (LOCATORS[type] && selector) {
    return LOCATORS[type](selector)
  } else {
    throw new Error(type ? `Unknown locator ${type}` : "Locator can't be empty")
  }
}

function parseOptionLocator(locator: string) {
  const fragments = locator.split('=')
  const type = fragments.shift() as keyof typeof OPTIONS_LOCATORS
  const selector = fragments.join('=')
  if (OPTIONS_LOCATORS[type] && selector) {
    return OPTIONS_LOCATORS[type](selector)
  } else if (!selector) {
    // no selector strategy given, assuming label
    return OPTIONS_LOCATORS['label'](type)
  } else {
    throw new Error(
      type ? `Unknown selection locator ${type}` : "Locator can't be empty"
    )
  }
}

function parseCoordString(coord: string) {
  const [x, y] = coord.split(',').map((n) => parseInt(n))
  return {
    x,
    y,
  }
}

function preprocessKeys(_str: string, variables: Variables) {
  const str = interpolateString(_str, variables)
  let keys = []
  let match = str.match(/\$\{\w+\}/g)
  if (!match) {
    keys.push(str)
  } else {
    let i = 0
    while (i < str.length) {
      let currentKey = match.shift() as string,
        currentKeyIndex = str.indexOf(currentKey, i)
      if (currentKeyIndex > i) {
        // push the string before the current key
        keys.push(str.substr(i, currentKeyIndex - i))
        i = currentKeyIndex
      }
      if (currentKey) {
        if (/^\$\{KEY_\w+\}/.test(currentKey)) {
          // is a key
          let keyName = (
            currentKey.match(/\$\{KEY_(\w+)\}/) as [string, string]
          )[1]
          // @ts-expect-error
          let key = Key[keyName]
          if (key) {
            keys.push(key)
          } else {
            throw new Error(`Unrecognised key ${keyName}`)
          }
        } else {
          // not a key, and not a stored variable, push it as-is
          keys.push(currentKey)
        }
        i += currentKey.length
      } else if (i < str.length) {
        // push the rest of the string
        keys.push(str.substr(i, str.length))
        i = str.length
      }
    }
  }
  return keys
}

const LOCATORS = {
  id: By.id,
  name: By.name,
  link: By.linkText,
  linkText: By.linkText,
  partialLinkText: By.partialLinkText,
  css: By.css,
  xpath: By.xpath,
}

const nbsp = String.fromCharCode(160)
const OPTIONS_LOCATORS = {
  id: (id: string) => By.css(`*[id="${id}"]`),
  value: (value: string) => By.css(`*[value="${value}"]`),
  label: (label: string) => {
    const labels = label.match(/^[\w|-]+(?=:)/)
    if (labels?.length) {
      const [type, ...labelParts] = label.split(':')
      const labelBody = labelParts.join(':')
      switch (type) {
        case 'mostly-equals':
          return By.xpath(
            `.//option[normalize-space(translate(., '${nbsp}', ' ')) = '${labelBody}']`
          )
      }
    }
    return By.xpath(`.//option[. = '${label}']`)
  },
  index: (index: string) => By.css(`*:nth-child(${index})`),
}

async function findElement(
  elements: WebElementShape[],
  element: WebElementShape
) {
  const id = await element.getId()
  for (let i = 0; i < elements.length; i++) {
    if ((await elements[i].getId()) === id) {
      return true
    }
  }
  return false
}
