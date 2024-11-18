import { CommandShape } from '@seleniumhq/side-model'
import { loadingID } from '../../constants/loadingID'

/**
 * Command shape is the shape of command data in Selenium IDE
 * step files
 */

export const command: CommandShape = {
  command: '',
  comment: '',
  id: loadingID,
  target: '',
  targets: [],
  value: '',
  continueExecution: false,
  skiperror: false,
  useVariable: false,
  validationType: "String",
  dynamicValue: false,
  dynamicValueLen: 22,
  variableName: "",
  defaultValue: "",
  description:'',


}
