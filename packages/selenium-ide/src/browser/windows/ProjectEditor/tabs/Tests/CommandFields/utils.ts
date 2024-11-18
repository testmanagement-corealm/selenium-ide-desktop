import { CommandShape } from "@seleniumhq/side-model"


export const setField =
  <T = string>(name: string) => (testID: string, commandID: string) => (value: T) => {
    // console.log('enetredddd')
    window.sideAPI.tests.updateStep(testID, commandID, {
      [name]: value,
    })
  }

export const updateACField =
  (name: string) =>
  (testID: string, commandID: string, command :CommandShape) =>
  (_e: any, v: any) => {

 
    window.sideAPI.tests.updateStep(testID, commandID, {
      [name]: v.id,
    })
    // console.log('tsssss4',command, name,v.id)
    

    // //if command is mouse hove set target as css body

    // console.log('eneterd',command.command)
    if (v.id=='mouseHover' && command.target === '') {
      window.sideAPI.tests.updateStep(testID, commandID, {
        ['target']: 'css=body',
        ['targets']: [
          [
            "css=body",
            "css:finder"

          ],
]
      })
    
    }
    if ( v.id =='getText' && command.variableName === '') {
      window.sideAPI.tests.updateStep(testID, commandID, {
        ['variableName']: 'GV_',
       
      })
    
    }
    if ((v.id=='createVariable' || v.id=='GenerateDate' )&& command.value === '') {
      window.sideAPI.tests.updateStep(testID, commandID, {
        ['target']: 'GV_',
       
      })
    
    }
  }

export const updateField =
  (name: string) => (testID: string, commandID: string,command:CommandShape) => (e: any) => {
    // console.log('tsssss3', name, e.target.value)
    window.sideAPI.tests.updateStep(testID, commandID, {
      [name]: e?.target?.value ?? "",
    })

    if((command.command =='getText' && name =='variableName')||(command.command =='type' && name =='variableName')){
      let value ='{{'+e.target.value+'}}'
     console.log('entered value set',value)
      window.sideAPI.tests.updateStep(testID, commandID, {
        ['value']: value|| "",
      })
    }
  //   if(command.command == 'createVariable' || command.command == 'GenerateDate'){
  //     console.log('target is a variable')
  //     var regex = /^([a-zA-Z_$][a-zA-Z\d_$]*)$/gi
  //     if (regex.test(e.target.value)) {
  //       console.log('valid variable name')
  //       window.sideAPI.tests.updateStep(testID, commandID, {
  //         [name]: e.target.value,
  //       })
  //     }else{

  //       console.log('command target',command.target)
  //       let data = command.target
  //       console.log('command target',data)
  //       window.sideAPI.tests.updateStep(testID, commandID, {
  //         [name]: data,
  //       })
  //     }
 
  //   }else{
  //   window.sideAPI.tests.updateStep(testID, commandID, {
  //     [name]: e?.target?.value ?? "",
  //   })
  // }
  }

  export const updateCheckboxField =
  (name: string) => (testID: string, commandID: string) => (e: any) => {
    // console.log('tsssss3', e.target.checked, name)
    window.sideAPI.tests.updateStep(testID, commandID, {
      [name]: e?.target?.checked ?? "",
    })

    if(name == 'useVariable'){
      window.sideAPI.tests.updateStep(testID, commandID, {
        ['variableName']: "",
      })
    }
  }

export const updateFieldAutoComplete =
  (name: string) =>
  (testID: string, commandID: string,_command:CommandShape) =>
  (_e: any, value: string) => {
    // console.log('tsssss2',command.command )
      if(!value){
        value =''
      }
      window.sideAPI.tests.updateStep(testID, commandID, {
        [name]: value,
      })



  }
